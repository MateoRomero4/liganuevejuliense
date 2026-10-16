'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'

type UserStanding = {
  id: string;
  display_name: string;
  pts: number;
  plenos: number;
  aciertos: number;
}

type TopStanding = UserStanding & { fase: number };

export default function ProdeView() {
  const [standings, setStandings] = useState<UserStanding[]>([])
  const [topCurrent, setTopCurrent] = useState<TopStanding[]>([])
  const [topPast, setTopPast] = useState<TopStanding[]>([])
  const [currentFaseNum, setCurrentFaseNum] = useState<number | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeRow, setActiveRow] = useState(0)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        const minimumLoadTimePromise = new Promise(resolve => setTimeout(resolve, 500));
        
        // 1. Obtener el ranking global de siempre
        const fetchRanking = supabase
          .from('ranking_prode')
          .select('*')
          .order('pts', { ascending: false })
          .order('plenos', { ascending: false })
          .order('display_name', { ascending: true });

        // 2. Determinar cuál es la fecha "Actual" basándonos en resultados (goles cargados)
        const { data: activeFaseDataRaw } = await supabase
          .from('matches')
          .select('fase')
          .not('home_goals', 'is', null) 
          .order('fase', { ascending: false }) 
          .limit(1);

        const activeFaseData = activeFaseDataRaw as { fase: number }[] | null;

        let currentFase = 1;
        if (activeFaseData && activeFaseData.length > 0) {
          currentFase = activeFaseData[0].fase;
        } else {
          // Si no hay NINGÚN resultado cargado, mostramos la fase 1
          const { data: firstFaseDataRaw } = await supabase
            .from('matches')
            .select('fase')
            .order('fase', { ascending: true })
            .limit(1);
            
          const firstFaseData = firstFaseDataRaw as { fase: number }[] | null;
          
          if (firstFaseData && firstFaseData.length > 0) {
            currentFase = firstFaseData[0].fase;
          }
        }
        
        setCurrentFaseNum(currentFase);
        const pastFase = currentFase - 1;

        // 3. Obtener el Top 3 de la fecha actual
        const fetchTopCurrent = supabase
          .from('ranking_por_fase')
          .select('*')
          .eq('fase', currentFase)
          .order('pts', { ascending: false })
          .order('plenos', { ascending: false })
          .limit(3);

        // 4. Obtener el Top 3 de la fecha pasada (si existe)
        const fetchTopPast = pastFase > 0 
          ? supabase
              .from('ranking_por_fase')
              .select('*')
              .eq('fase', pastFase)
              .order('pts', { ascending: false })
              .order('plenos', { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [] });

        const [rankingRes, topCurrentRes, topPastRes, _] = await Promise.all([
          fetchRanking,
          fetchTopCurrent,
          fetchTopPast,
          minimumLoadTimePromise
        ]);

        if (rankingRes.error) throw rankingRes.error;

        setStandings(rankingRes.data as UserStanding[]);
        if (topCurrentRes.data) setTopCurrent(topCurrentRes.data as TopStanding[]);
        if (topPastRes.data) setTopPast(topPastRes.data as TopStanding[]);
        
      } catch (err) {
        console.error("Error cargando datos del prode:", err)
      } finally {
        setIsFadingOut(true)
        setTimeout(() => setLoading(false), 500)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 2.0;
    }
  }, [loading]);

  useEffect(() => {
    if (standings.length > 0) {
      const interval = setInterval(() => {
        setActiveRow(prev => (prev + 1) % standings.length)
      }, 1500)
      return () => clearInterval(interval)
    }
  }, [standings.length])

  if (loading) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
        <video ref={videoRef} autoPlay loop muted playsInline className="hidden md:block w-48 h-48 md:w-78 md:h-78 object-contain opacity-20 -mt-[200px]">
          <source src="/assets/loader2.mov" type='video/mp4; codecs="hvc1"' />
          <source src="/assets/loader2.webm" type="video/webm" />
        </video>
      </div>
    )
  }

  return (
    <div className="relative w-full min-h-screen py-5 overflow-hidden">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
        }
      `}</style>

      <div className="relative z-10 w-full max-w-5xl mx-auto py-5">
        <div className="w-full max-w-3xl mx-auto space-y-12 px-2 md:px-0 flex flex-col">
          
          <div className="animate-fade-up mb-2 flex flex-col items-center justify-center" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl md:text-5xl font-bold text-[#1e1e1e] tracking-tight text-center">Prode</h2>
          </div>

          {/* TOP 3 FECHA ACTUAL */}
          {currentFaseNum !== null && (
            <Podium 
              users={topCurrent} 
              title="Top 3 de la Fecha" 
              fase={currentFaseNum} 
              delay="150ms" 
              isCompact={false}
            />
          )}

          {/* TABLA GLOBAL */}
          <div className="w-full">
            <h3 className="text-xl md:text-2xl font-bold text-[#1e1e1e] mb-4 text-center animate-fade-up" style={{ animationDelay: '180ms' }}>Ranking Global</h3>
            <div className="w-full border border-white overflow-hidden animate-fade-up shadow-xs bg-white/40 backdrop-blur-sm" style={{ animationDelay: '200ms' }}>
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-linear-to-l from-[#2980FF] to-[#043AB7] text-white text-[10px] md:text-xs uppercase tracking-wider font-bold">
                    <th className="p-3 md:p-4 text-center border-b border-white drop-shadow-sm">POS</th>
                    <th className="p-3 md:p-4 border-b border-white drop-shadow-sm">Participante</th>
                    <th className="p-3 md:p-4 text-center border-b border-white drop-shadow-sm">PTS</th>
                    <th className="p-3 md:p-4 text-center border-b border-white text-gray-200 drop-shadow-sm">PLENOS</th>
                    <th className="p-3 md:p-4 text-center border-b border-white text-gray-200 drop-shadow-sm">ACIERTOS</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((user, idx) => (
                    <tr 
                      key={user.id} 
                      className={`animate-fade-up border-b border-white transition-all duration-700 ease-in-out
                        ${idx % 2 !== 0 ? 'bg-gray-50/50' : 'bg-transparent'} 
                        ${activeRow === idx ? 'bg-gray-300/10' : ''}`} 
                      style={{ animationDelay: `${300 + (idx * 100)}ms` }}
                    >
                      <td className="p-3 md:p-4 text-center font-bold text-black/90 drop-shadow-sm text-sm md:text-base">{idx + 1}</td>
                      <td className="p-3 md:p-4 font-semibold text-black/90 text-sm md:text-lg flex items-center gap-3">
                        <span className="truncate">{user.display_name}</span>
                      </td>
                      <td className="p-3 md:p-4 text-center font-bold text-gray-900 text-base md:text-lg drop-shadow-sm">{user.pts}</td>
                      <td className="p-3 md:p-4 text-center text-black/90 font-medium text-sm md:text-base drop-shadow-sm">{user.plenos}</td>
                      <td className="p-3 md:p-4 text-center text-black/90 font-medium text-sm md:text-base drop-shadow-sm">{user.aciertos}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-black/60 font-medium text-sm md:text-base drop-shadow-sm">No hay pronósticos registrados aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOP 3 FECHA PASADA - Ahora con isCompact en true */}
          {currentFaseNum !== null && currentFaseNum > 1 && (
            <div className="pt-8">
              <Podium 
                users={topPast} 
                title="Top 3 de la Fecha Pasada" 
                fase={currentFaseNum - 1} 
                delay="400ms"
                isCompact={true}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// Componente del Podio adaptado con propiedad isCompact para hacerlo más corto visualmente
function Podium({ users, title, fase, delay, isCompact = false }: { users: TopStanding[], title: string, fase: number, delay: string, isCompact?: boolean }) {
  if (!users || users.length === 0 || users[0].pts === 0) {
    return (
      <div className="w-full mb-4 animate-fade-up flex flex-col items-center" style={{ animationDelay: delay }}>
        <h3 className={`${isCompact ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'} font-bold text-[#1e1e1e] mb-2`}>{title} (Fecha {fase})</h3>
        <p className="text-gray-500 font-medium text-xs md:text-sm">Aún no hay puntos registrados para esta fecha.</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${isCompact ? 'mb-4' : 'mb-8'} animate-fade-up`} style={{ animationDelay: delay }}>
      <h3 className={`${isCompact ? 'text-lg md:text-xl mb-3' : 'text-xl md:text-2xl mb-4'} font-bold text-[#1e1e1e] text-center`}>{title} (Fecha {fase})</h3>
      
      <div className="w-full border border-white overflow-hidden shadow-xs bg-white/40 backdrop-blur-sm">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gradient-to-l from-gray-800 to-black text-white text-[10px] md:text-xs uppercase tracking-wider font-bold">
              <th className={`${isCompact ? 'p-2' : 'p-3 md:p-4'} text-center border-b border-white drop-shadow-sm`}>POS</th>
              <th className={`${isCompact ? 'p-2' : 'p-3 md:p-4'} border-b border-white drop-shadow-sm`}>Participante</th>
              <th className={`${isCompact ? 'p-2' : 'p-3 md:p-4'} text-center border-b border-white drop-shadow-sm`}>PTS</th>
              <th className={`${isCompact ? 'p-2' : 'p-3 md:p-4'} text-center border-b border-white text-gray-300 drop-shadow-sm`}>PLENOS</th>
              <th className={`${isCompact ? 'p-2' : 'p-3 md:p-4'} text-center border-b border-white text-gray-300 drop-shadow-sm`}>ACIERTOS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => {
              if (user.pts === 0) return null; 
              
              return (
                <tr 
                  key={user.id} 
                  className={`border-b border-white transition-all duration-700 ease-in-out ${idx % 2 !== 0 ? 'bg-gray-50/50' : 'bg-transparent'}`}
                >
                  <td className={`${isCompact ? 'p-2 text-xs md:text-sm' : 'p-3 md:p-4 text-sm md:text-base'} text-center font-bold text-black/90 drop-shadow-sm`}>{idx + 1}</td>
                  <td className={`${isCompact ? 'p-2 text-xs md:text-sm' : 'p-3 md:p-4 text-sm md:text-lg'} font-semibold text-black/90 flex items-center gap-2 md:gap-3`}>
                    {idx === 0 && <span className={`${isCompact ? 'text-base' : 'text-lg md:text-xl'} drop-shadow-sm`}>🥇</span>}
                    {idx === 1 && <span className={`${isCompact ? 'text-base' : 'text-lg md:text-xl'} drop-shadow-sm`}>🥈</span>}
                    {idx === 2 && <span className={`${isCompact ? 'text-base' : 'text-lg md:text-xl'} drop-shadow-sm`}>🥉</span>}
                    <span className="truncate">{user.display_name}</span>
                  </td>
                  <td className={`${isCompact ? 'p-2 text-sm md:text-base' : 'p-3 md:p-4 text-base md:text-lg'} text-center font-bold text-gray-900 drop-shadow-sm`}>{user.pts}</td>
                  <td className={`${isCompact ? 'p-2 text-xs md:text-sm' : 'p-3 md:p-4 text-sm md:text-base'} text-center text-black/90 font-medium drop-shadow-sm`}>{user.plenos}</td>
                  <td className={`${isCompact ? 'p-2 text-xs md:text-sm' : 'p-3 md:p-4 text-sm md:text-base'} text-center text-black/90 font-medium drop-shadow-sm`}>{user.aciertos}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
