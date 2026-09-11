'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'

type Team = Database['public']['Tables']['teams']['Row'];
type Match = Database['public']['Tables']['matches']['Row'];

type MatchWithTeams = Match & {
  home_team: Team | null;
  away_team: Team | null;
}

interface TournamentStats {
  totalMatches: number;
  totalGoals: number;
  avgGoals: string;
  biggestWin: MatchWithTeams | null;
}

export default function ResultsView() {
  const [results, setResults] = useState<MatchWithTeams[]>([])
  const [stats, setStats] = useState<TournamentStats | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 9
  const totalPages = Math.ceil(results.length / itemsPerPage)
  const matchesToShow = results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const [activeResultIndex, setActiveResultIndex] = useState<number>(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    async function loadResults() {
      try {
        const supabase = createClient()
        
        const minimumLoadTimePromise = new Promise(resolve => setTimeout(resolve, 500));
        
        const fetchPromise = supabase
          .from('matches')
          .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(*),
            away_team:teams!matches_away_team_id_fkey(*)
          `)
          .not('home_goals', 'is', null)
          .not('away_goals', 'is', null)
          .order('kickoff', { ascending: false })

        const [supabaseResponse] = await Promise.all([fetchPromise, minimumLoadTimePromise]);
        
        const { data, error } = supabaseResponse;

        if (error) {
          console.error("Error de Supabase:", error)
          setError(`Error cargando resultados: ${error.message}`)
        } else {
          const fetchedMatches = data as MatchWithTeams[] || []
          
          setResults(fetchedMatches)

          if (fetchedMatches.length > 0) {
            let tGoals = 0;
            let maxGoalDiff = -1;
            let maxWinMatch: MatchWithTeams | null = null;

            fetchedMatches.forEach(m => {
              const hGoals = m.home_goals || 0;
              const aGoals = m.away_goals || 0;
              tGoals += (hGoals + aGoals);

              const diff = Math.abs(hGoals - aGoals);
              if (diff > maxGoalDiff) {
                maxGoalDiff = diff;
                maxWinMatch = m;
              } else if (diff === maxGoalDiff && (hGoals + aGoals) > ((maxWinMatch?.home_goals || 0) + (maxWinMatch?.away_goals || 0))) {
                 maxWinMatch = m;
              }
            });

            setStats({
              totalMatches: fetchedMatches.length,
              totalGoals: tGoals,
              avgGoals: (tGoals / fetchedMatches.length).toFixed(1),
              biggestWin: maxWinMatch
            });
          }
        }
      } catch (err: any) {
        console.error("Excepción en el cliente:", err)
        setError(`Error de conexión: ${err.message}`)
      } finally {
        setIsFadingOut(true)
        setTimeout(() => {
          setLoading(false) 
        }, 500)
      }
    }

    loadResults()
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 2.0;
    }
  }, [loading]);

  useEffect(() => {
    if (matchesToShow.length > 0) {
      const interval = setInterval(() => {
        setActiveResultIndex((prev) => (prev + 1) % matchesToShow.length)
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [matchesToShow.length, currentPage])

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
      setActiveResultIndex(0)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
      setActiveResultIndex(0)
    }
  }

  if (loading) {
    return (
      <div 
        className={`w-full min-h-screen flex items-center justify-center transition-opacity duration-500 ease-in-out ${
          isFadingOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <video 
          ref={videoRef}
          src="/assets/loader.webm" 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-24 h-24 md:w-48 md:h-48 object-contain opacity-20 -mt-100 md:-mt-50" 
        />
      </div>
    )
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 font-medium">{error}</div>
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

      <div className="relative z-10 w-full max-w-6xl mx-auto py-5">
        <div className="w-full space-y-12 px-4 flex flex-col">
          
          <div className="w-full">
            <div className="animate-fade-up mb-6 flex flex-col items-center justify-center" style={{ animationDelay: '100ms' }}>
              <h2 className="text-3xl md:text-5xl font-bold text-[#1E1E1E] tracking-tight text-center">Últimos Resultados</h2>
            </div>

            {results.length > 0 && (
              <div className="animate-fade-up flex justify-center items-center gap-4 md:gap-8 mb-8" style={{ animationDelay: '200ms' }}>
                <button 
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="px-6 py-3 text-[#1E1E1E] font-bold tracking-wide hover:opacity-70 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Anterior
                </button>
                
                <span className="font-black text-xl md:text-2xl text-[#1E1E1E] min-w-[120px] text-center border-b-2 border-[#1E1E1E]">
                  {currentPage} / {totalPages}
                </span>
                
                <button 
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-6 py-3 text-[#1E1E1E] font-bold tracking-wide hover:opacity-70 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Siguiente
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {matchesToShow.length === 0 ? (
                <p className="col-span-1 md:col-span-3 animate-fade-up text-gray-500 font-medium text-center py-10" style={{ animationDelay: '200ms' }}>
                  Aún no hay resultados registrados.
                </p>
              ) : (
                matchesToShow.map((match, idx) => (
                  <ResultCard 
                    key={match.id} 
                    match={match} 
                    delay={200 + (idx * 100)} 
                    isActive={activeResultIndex === idx}
                  />
                ))
              )}
            </div>
          </div>

          {stats && (
            <div className="w-full max-w-4xl mx-auto pt-8 pb-12">
              <div className="animate-fade-up mb-8 flex flex-col items-center justify-center" style={{ animationDelay: '600ms' }}>
                <h2 className="text-3xl md:text-5xl font-bold text-[#1E1E1E] tracking-tight mb-2 text-center">En Números</h2>
                <p className="text-sm md:text-base font-bold text-black/70 border-b-2 border-[#011A38] pb-1 text-center">
                  Estadísticas del Torneo
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: '700ms' }}>
                <StatCard label="Partidos Jugados" value={stats.totalMatches.toString()} delay={800} />
                <StatCard label="Goles Totales" value={stats.totalGoals.toString()} delay={900} />
                <StatCard label="Prom. de Goles" value={stats.avgGoals} delay={1000} />
                
                {stats.biggestWin && (
                  <div className="animate-fade-up border border-white bg-white/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-all duration-500 hover:bg-white/60 hover:-translate-y-1" style={{ animationDelay: '1100ms' }}>
                    <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Mayor Goleada</span>
                    <div className="flex items-center justify-center gap-2 w-full">
                      {stats.biggestWin.home_team?.badge_svg && (
                        <img 
                          src={`/assets/escudos_monocromaticos/${stats.biggestWin.home_team.badge_svg}`} 
                          alt={stats.biggestWin.home_team.name} 
                          className="w-8 h-8 md:w-12 md:h-12 object-contain"
                        />
                      )}
                      <span className="font-black text-xl text-[#1E1E1E]">
                        {stats.biggestWin.home_goals}-{stats.biggestWin.away_goals}
                      </span>
                      {stats.biggestWin.away_team?.badge_svg && (
                        <img 
                          src={`/assets/escudos_monocromaticos/${stats.biggestWin.away_team.badge_svg}`} 
                          alt={stats.biggestWin.away_team.name} 
                          className="w-8 h-8 md:w-12 md:h-12 object-contain"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function ResultCard({ match, delay, isActive }: { match: MatchWithTeams, delay: number, isActive: boolean }) {
  const homeColor1 = match.home_team?.colors?.[0] ?? '#1f2937';
  const homeColor2 = match.home_team?.colors?.[1] ?? homeColor1;
  const awayColor1 = match.away_team?.colors?.[0] ?? '#1f2937';
  const awayColor2 = match.away_team?.colors?.[1] ?? awayColor1;

  return (
    <div 
      className={`animate-fade-up flex items-stretch border border-white/50 overflow-hidden h-20 md:h-24 transition-all duration-700 ease-in-out bg-white/40
        ${isActive ? 'shadow-lg border-white/80' : 'hover:bg-white/60'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div className={`absolute inset-0 flex transition-transform duration-500 ease-in-out origin-top ${isActive ? 'scale-y-100' : 'scale-y-0'}`}>
                    <div className="w-full h-full bg-linear-to-l from-[#00000033] via-[#00000000] to-[#00000033] absolute">
            
          </div>
          <div className="flex-1 h-full" style={{ backgroundColor: homeColor1 }}></div>
          <div className="flex-1 h-full" style={{ backgroundColor: homeColor2 }}></div>
          <div className="flex-1 h-full" style={{ backgroundColor: homeColor1 }}></div>
          <div className="flex-1 h-full" style={{ backgroundColor: homeColor2 }}></div>
          <div className="flex-1 h-full" style={{ backgroundColor: homeColor1 }}></div>
        </div>

        {match.home_team?.badge_svg && (
          <img 
            src={isActive ? `/assets/escudos_color/${match.home_team.badge_svg}` : `/assets/escudos_color/${match.home_team.badge_svg}`} 
            alt="Home Team" 
            className={`w-12 h-12 md:w-16 md:h-16 object-contain relative z-10 transition-transform duration-500 ${isActive ? 'opacity-100   drop-shadow-xs' : 'opacity-100'}`}
          />
        )}
      </div>

      <div className="w-20 md:w-24 bg-white flex flex-col items-center justify-center z-20 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
         <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase mb-1">F {match.fase}</span>
         <div className="flex items-center justify-center gap-1 md:gap-2">
            <span className="text-xl md:text-2xl font-black text-[#1E1E1E]">{match.home_goals}</span>
            <span className="font-light text-sm text-gray-400">-</span>
            <span className="text-xl md:text-2xl font-black text-[#1E1E1E]">{match.away_goals}</span>
         </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div className={`absolute inset-0 flex transition-transform duration-500 ease-in-out origin-top ${isActive ? 'scale-y-100' : 'scale-y-0'}`}>
          <div className="w-full h-full bg-linear-to-l from-[#00000033] via-[#00000000] to-[#00000033] absolute">
            
          </div>
          <div className="flex-1 h-full" style={{ backgroundColor: awayColor1 }}></div>
          <div className="flex-1 h-full" style={{ backgroundColor: awayColor2 }}></div>
          <div className="flex-1 h-full" style={{ backgroundColor: awayColor1 }}></div>
          <div className="flex-1 h-full" style={{ backgroundColor: awayColor2 }}></div>
          <div className="flex-1 h-full" style={{ backgroundColor: awayColor1 }}></div>
        </div>

        {match.away_team?.badge_svg && (
          <img 
            src={isActive ? `/assets/escudos_color/${match.away_team.badge_svg}` : `/assets/escudos_color/${match.away_team.badge_svg}`} 
            alt="Away Team" 
            className={`w-12 h-12 md:w-16 md:h-16 object-contain relative z-10 transition-transform duration-500 ${isActive ? 'opacity-100  drop-shadow-xs' : 'opacity-100'}`}
          />
        )}
      </div>

    </div>
  )
}

function StatCard({ label, value, delay }: { label: string, value: string, delay: number }) {
  return (
    <div 
      className="animate-fade-up border border-white bg-white/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-all duration-500 hover:bg-white/60 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider text-center mb-1">{label}</span>
      <span className="text-2xl md:text-4xl font-black text-[#1E1E1E]">{value}</span>
    </div>
  )
}