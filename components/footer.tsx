import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gradient-to-l from-[#2980FF] to-[#043AB7] border-[#000000] border-t shadow-lg mt-auto pb-16 md:pb-0">      
      <div className="container mx-auto max-w-7xl px-6 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex flex-col items-center gap-4">
            <Link href="/?tab=home" className="group flex flex-col items-start transition-opacity hover:opacity-80">
              <div className="relative w-30 h-30">
                <Image 
                  src="/assets/escudos_monocromaticos/logocorto.svg" 
                  alt="Escudo Liga de Fútbol 9 de Julio Color" 
                  width={48} 
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-white font-medium text-lg leading-tight text-center md:text-left">
                Liga Nuevejuliense de Fútbol
              </span>
            </Link>
          </div>

          <div className="flex flex-col items-center md:items-end gap-6">
            
            <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3">
              <Link href="/?tab=league" className="text-gray-300 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest">
                Campeonato
              </Link>
              <Link href="/?tab=fixture" className="text-gray-300 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest">
                Fixture
              </Link>
              <Link href="/?tab=results" className="text-gray-300 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest">
                Resultados
              </Link>
              <Link href="/?tab=prode" className="text-gray-300 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest">
                Prode
              </Link>
            </div>

            <div className="flex items-center gap-5">
              <a href="https://sumaplay.com.ar/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-all hover:scale-110" aria-label="Sitio Web Suma Play">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61586558524671" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-all hover:scale-110" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="https://www.instagram.com/sumaplay/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-all hover:scale-110" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
              </a>
              <a href="https://www.youtube.com/channel/UCimXhau1n9r56QbTLOpx0Tg" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-all hover:scale-110" aria-label="YouTube">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path><path d="m10 15 5-3-5-3z"></path></svg>
              </a>
            </div>

          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center justify-center">
          <p className="text-gray-400 text-xs text-center tracking-wide">
            &copy; {currentYear} Suma Play. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}