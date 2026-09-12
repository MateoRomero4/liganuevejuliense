'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trophy, CalendarDays, ListOrdered, Target, LogIn, LogOut, Settings, Home } from "lucide-react"; 

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeTab = searchParams.get('tab');

  useEffect(() => {
    const supabase = createClient();
    
    const checkSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single() as { data: { is_admin: boolean } | null };
          
        setIsAdmin(!!profile?.is_admin);
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    };
    
    checkSessionAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
const { data: profile }: any = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(!!profile?.is_admin);
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsLoggedIn(false);
    router.push('/');
    router.refresh();
  };

  const isTabActive = (tabName: string) => {
    if (tabName === 'home') return pathname === '/' && (!activeTab || activeTab === 'home');
    if (tabName === 'administrate') return pathname === '/administrate';
    if (tabName === 'login') return pathname === '/login';
    return pathname === '/' && activeTab === tabName;
  };

  const getIconClass = (tabName: string) => {
    return `md:hidden transition-all duration-200 ${
      isTabActive(tabName) 
        ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]' 
        : 'text-white opacity-60'
    }`;
  };

  return (
    <nav className="fixed bottom-0 md:sticky md:top-0 md:bottom-auto z-50 w-full flex justify-center bg-linear-to-l from-[#043AB7] to-[#2980FF] border-[#2980FF] border-t md:border-t-0 md:border-b shadow-lg">
      <div className="container h-16 md:h-12 max-w-7xl flex items-center justify-between px-12">
        
          
          <Link href="/?tab=home" className="group flex items-center gap-2 transition-opacity">
            <div className={`text-white hover:text-gray-300 transition-colors flex flex-col items-center gap-1`}>
                          <Home size={26} className={getIconClass('home')} />
            </div>
            
            <div className="relative w-40 h-18 mt-1 hidden md:block">
              <Image 
                src="/assets/escudos_color/logosuma.svg" 
                alt="Escudo Liga de Fútbol 9 de Julio Color" 
                width={52} 
                height={52}
                className="absolute inset-0 w-full h-full object-contain opacity-100 brightness-100 duration-300 hover:scale-103 transition-transform"
              />
            </div>
          </Link>
          <div className="flex gap-6 md:gap-8 items-center -ml-15">
                      <Link href="/?tab=league" className="text-white hover:text-gray-300 transition-colors flex flex-col items-center gap-1">
            <Trophy size={26} className={getIconClass('league')} />
            <span className="hidden md:inline text-xs font-medium uppercase tracking-widest">Campeonato</span>
          </Link>
          
          <Link href="/?tab=fixture" className="text-white hover:text-gray-300 transition-colors flex flex-col items-center gap-1">
            <CalendarDays size={26} className={getIconClass('fixture')} />
            <span className="hidden md:inline text-xs font-medium uppercase tracking-widest">Fixture</span>
          </Link>
          
          <Link href="/?tab=results" className="text-white hover:text-gray-300 transition-colors flex flex-col items-center gap-1">
            <ListOrdered size={26} className={getIconClass('results')} />
            <span className="hidden md:inline text-xs font-medium uppercase tracking-widest">Resultados</span>
          </Link>
          
          {isAdmin ? (
            <Link href="/administrate" className="text-white hover:text-gray-300 transition-colors flex flex-col items-center gap-1 md:hidden">
              <Settings size={26} className={getIconClass('administrate')} />
            </Link>
          ) : (
            <Link href="/?tab=prode" className="text-white hover:text-gray-300 transition-colors flex flex-col items-center gap-1">
              <Target size={26} className={getIconClass('prode')} />
              <span className="hidden md:inline text-xs font-medium uppercase tracking-widest">Prode</span>
            </Link>
          )}
          </div>


          <div className="md:hidden flex items-center">
            {isLoggedIn ? (
              <button onClick={handleLogout} className="text-white hover:text-gray-300 flex flex-col items-center gap-1">

                <LogOut size={22} className="text-red-400" />
              </button>
            ) : (
              <Link href="/login" className="text-white hover:text-gray-300 flex flex-col items-center gap-1">

                <LogIn size={22} className={getIconClass('login')} />
              </Link>
            )}
          </div>
            
        <div className="hidden md:flex items-center gap-4 h-full justify-end">
          {isLoggedIn ? (
            <>
              {isAdmin ? (
                <Link 
                  href="/administrate" 
                  className="text-xs font-medium text-white hover:text-gray-300 transition-colors uppercase border border-white rounded-full px-3 py-2"
                >
                  Admin Panel
                </Link>
              ) : (
                <Link 
                  href="/mi-prode" 
                  className="text-xs font-medium text-white hover:text-gray-300 transition-colors uppercase border border-white rounded-full px-3 py-2"
                >
                  Mi Prode
                </Link>
              )}
              
              <button 
                onClick={handleLogout}
                className="text-xs font-medium text-red-400 hover:text-gray-100 transition-colors uppercase px-3 py-2 cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link 
              href="/login" 
              className="text-xs font-medium text-white hover:text-gray-300 transition-colors uppercase border border-white rounded-full px-3 py-2"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}