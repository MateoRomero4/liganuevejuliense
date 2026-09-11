'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'

type Team = Database['public']['Tables']['teams']['Row'];

type MatchWithTeams = Database['public']['Tables']['matches']['Row'] & {
  home_team: Database['public']['Tables']['teams']['Row'] | null;
  away_team: Database['public']['Tables']['teams']['Row'] | null;
}

export default function FixtureView() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [currentFase, setCurrentFase] = useState<number>(1)
  const [availableFases, setAvailableFases] = useState<number[]>([])
  
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)

  const [activeCardIndex, setActiveCardIndex] = useState<number>(0)

  useEffect(() => {
    async function loadFixture() {
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
          .order('fase', { ascending: true })
          .order('kickoff', { ascending: true })

        const [supabaseResponse] = await Promise.all([fetchPromise, minimumLoadTimePromise]);
        
        const { data, error } = supabaseResponse;

        if (error) {
          console.error("Error de Supabase:", error)
          setError(`Error de base de datos: ${error.message}`)
        } else {
          const fetchedMatches = data as MatchWithTeams[] || []
          setMatches(fetchedMatches)
          
          const regulares = fetchedMatches.filter(m => m.fase < 10)
          const fasesUnicas = Array.from(new Set(regulares.map(m => m.fase))).sort((a, b) => a - b)
          setAvailableFases(fasesUnicas)
          
          if (fasesUnicas.length > 0) {
            setCurrentFase(fasesUnicas[0]) 
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

    loadFixture()
  }, [])

const uniqueTeams = Array.from(
    new Map(
      matches.flatMap(m => {
        const teams: [number, Team][] = []
        if (m.home_team) teams.push([m.home_team.id, m.home_team])
        if (m.away_team) teams.push([m.away_team.id, m.away_team])
        return teams
      })
    ).values()
  ).sort((a: Team, b: Team) => (a.short_name || a.name).localeCompare(b.short_name || b.name))
  const selectedTeam = uniqueTeams.find(team => team.id === selectedTeamId);
  const matchesToShow = selectedTeamId 
    ? matches.filter(m => m.home_team?.id === selectedTeamId || m.away_team?.id === selectedTeamId)
    : matches.filter(m => m.fase === currentFase)

  useEffect(() => {
    setActiveCardIndex(0)
  }, [currentFase, selectedTeamId])

  useEffect(() => {
    if (matchesToShow.length === 0) return;
    
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % matchesToShow.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [matchesToShow.length])

  const handlePrevFase = () => {
    const currentIndex = availableFases.indexOf(currentFase)
    if (currentIndex > 0) setCurrentFase(availableFases[currentIndex - 1])
  }

  const handleNextFase = () => {
    const currentIndex = availableFases.indexOf(currentFase)
    if (currentIndex < availableFases.length - 1) setCurrentFase(availableFases[currentIndex + 1])
  }

const videoRef = useRef<HTMLVideoElement | null>(null); 

useEffect(() => {
  if (videoRef.current) {
    videoRef.current.playbackRate = 2.0;
  }
}, [loading]);

if (loading) {
  return (
    <div 
      className={`w-full min-h-screen flex items-center justify-center transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
<video 
  ref={videoRef}
  autoPlay 
  loop 
  muted 
  playsInline
  className="hidden md:block w-24 h-24 md:w-48 md:h-48 object-contain opacity-20 -mt-[50px] md:-mt-[50px]" 
>
  <source src="/assets/loader.mov" type='video/mp4; codecs="hvc1"' />
  <source src="/assets/loader.webm" type="video/webm" />
</video>
    </div>
  )
}

  if (error) {
    return <div className="p-8 text-center text-red-500 font-medium">{error}</div>
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      <div className="relative z-10 w-full max-w-5xl mx-auto py-5">
        


        <div className="w-full max-w-3xl mx-auto space-y-2">
          <div 
            className="animate-fade-up flex flex-col items-center justify-center"
            style={{ animationDelay: '100ms' }}
          >
<h2 className="text-3xl md:text-5xl font-bold text-[#1E1E1E] mb-10 tracking-tight">
  {selectedTeamId ? `Partidos de ${selectedTeam?.short_name}` : 'Fase Regular'}
</h2>
          </div>

          {!selectedTeamId && availableFases.length > 0 && (
            <div className="animate-fade-up flex justify-center items-center gap-4 md:gap-8" style={{ animationDelay: '400ms' }}>
              <button 
                onClick={handlePrevFase}
                disabled={currentFase === availableFases[0]}
                className="px-6 py-3  text-[#1E1E1E] font-bold tracking-wide hover:opacity-70 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
              >
                Anterior
              </button>
              
              <span className="font-black text-2xl text-[#1E1E1E] min-w-[120px] text-center border-b-2 border-[#1E1E1E]">
                Fecha {currentFase}
              </span>
              
              <button 
                onClick={handleNextFase}
                disabled={currentFase === availableFases[availableFases.length - 1]}
                className="px-6 py-3  text-[#1E1E1E] font-bold tracking-wide hover:opacity-70 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
              >
                Siguiente
              </button>
            </div>
          )}

          <div className="">
            {matchesToShow.length === 0 ? (
              <p className="animate-fade-up text-gray-500 font-medium text-center py-10" style={{ animationDelay: '200ms' }}>
                No hay partidos para mostrar.
              </p>
            ) : (
              matchesToShow.map((match, idx) => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  delay={200 + (idx * 150)} 
                  isActive={activeCardIndex === idx}
                  showFase={selectedTeamId !== null} 
                />
              ))
            )}
          </div>

        <div className="w-full overflow-x-auto py-2 scrollbar-hide animate-fade-up" style={{ animationDelay: '50ms' }}>
          <span className='ml-5 font-medium text-black/50'>Seleccionar Equipo:</span>
          <div className="flex gap-4 min-w-max px-4 mt-5 justify-center md:justify-start">
            {uniqueTeams.map(team => {
              const isSelected = selectedTeamId === team.id;
              const imgSrc = isSelected 
                ? `/assets/escudos_color/${team.badge_svg}` 
                : `/assets/escudos_monocromaticos/${team.badge_svg}`;
              
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(isSelected ? null : team.id)}
                  className={`relative w-8 h-8 md:w-12 md:h-12 rounded-full transition-all duration-300 ease-in-out transform flex-shrink-0
                    ${isSelected ? 'scale-105' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                  title={team.name}
                >
                  <img 
                    src={imgSrc} 
                    alt={team.name}
                    className="w-full h-full object-contain transition-all duration-500"
                  />
                </button>
              )
            })}
          </div>
        </div>

        </div>
      </div>
    </div>
  )
}

function MatchCard({ match, delay, isActive, showFase }: { match: MatchWithTeams, delay: number, isActive: boolean, showFase?: boolean }) {
  const isPending = match.status === 'pending';

  const matchDate = new Date(match.kickoff);
  const dayMonth = matchDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }); 
  const time = matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' }); 

  const homeColor1 = match.home_team?.colors?.[0] ?? '#1f2937';
  const homeColor2 = match.home_team?.colors?.[1] ?? homeColor1;

  const awayColor1 = match.away_team?.colors?.[0] ?? '#1f2937';
  const awayColor2 = match.away_team?.colors?.[1] ?? awayColor1;

  return (
    <div 
      className="animate-fade-up h-16 md:h-24 border-b border-white flex items-center relative overflow-hidden transition-all duration-1000 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div 
        className={`absolute inset-0 z-0 overflow-hidden transition-transform duration-1000 ease-in-out ${isActive ? 'origin-top scale-y-100' : 'origin-bottom scale-y-0'}`}
      >
        <div className="absolute inset-0 bg-linear-to-l from-[#070128] to-[#011A38]" />
      </div>

      <div className={`absolute left-0 top-0 bottom-0 w-2 flex flex-col z-30 transition-transform duration-700 ease-in-out ${isActive ? 'translate-x-0' : '-translate-x-full opacity-0'}`}>
        <div className="h-1/2 w-full" style={{ backgroundColor: homeColor1 }} />
        <div className="h-1/2 w-full" style={{ backgroundColor: homeColor2 }} />
      </div>

      <div className={`absolute right-0 top-0 bottom-0 w-2 flex flex-col z-30 transition-transform duration-700 ease-in-out ${isActive ? 'translate-x-0' : 'translate-x-full opacity-0'}`}>
        <div className="h-1/2 w-full" style={{ backgroundColor: awayColor1 }} />
        <div className="h-1/2 w-full" style={{ backgroundColor: awayColor2 }} />
      </div>

      <div className="flex items-center flex-1 justify-start h-full relative z-10 pl-4">
        {match.home_team?.badge_svg && (
          <img 
            src={`/assets/escudos_color/${match.home_team.badge_svg}`} 
            alt="Escudo Local" 
            className={`absolute top-1/2 left-0 w-32 h-32 md:w-48 md:h-48 object-contain pointer-events-none transition-all duration-1000 ease-out transform -translate-y-1/2
              ${isActive ? 'opacity-20 -translate-x-[15%]' : 'opacity-0 -translate-x-[100%]'}`} 
          />
        )}

        <div className="flex justify-center items-center w-full px-2 md:px-6 relative z-20">
            <span 
              className={`font-extrabold text-1xl md:text-3xl tracking-tight uppercase text-center transition-colors duration-1000 ease-in-out
                ${isActive ? 'text-white' : 'text-gray-900'}`}
            >
                {match.home_team?.short_name || 'TBD'}
            </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center relative z-20 py-2 transition-all duration-1000 h-full w-24">
        <span className={`absolute top-1 text-[10px] font-bold uppercase transition-colors duration-1000 ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>
    {match.round_name 
      ? `${match.round_name} ${match.leg === 1 ? 'Ida' : match.leg === 2 ? 'Vuelta' : ''}` 
      : (showFase ? `Fecha ${match.fase}` : '')}
  </span>
        {showFase && (
          <span className={`absolute top-1 text-[10px] font-bold uppercase transition-colors duration-1000 ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>
            Fecha {match.fase}
          </span>
        )}
        
        {isPending ? (
          <div className={`flex flex-col items-center justify-center transition-colors duration-1000 ${isActive ? 'text-gray-300' : 'text-gray-500'} ${showFase ? 'mt-3' : ''}`}>
            <span className="text-md md:text-2xl font-bold tracking-widest leading-none mb-1">
              {dayMonth}
            </span>
            <span className="text-[10px] md:text-xs font-semibold leading-none">
              {time}
            </span>
          </div>
        ) : (
          <div className={`text-2xl md:text-3xl font-black tracking-widest transition-colors duration-1000 ${isActive ? 'text-white' : 'text-[#1E1E1E]'} ${showFase ? 'mt-3' : ''}`}>
            {match.home_goals} <span className={`font-light mx-1 ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>-</span> {match.away_goals}
          </div>
        )}
      </div>

      <div className="flex items-center flex-1 justify-end h-full relative z-10 pr-4">
        <div className="flex justify-center items-center w-full px-2 md:px-6 relative z-20">
            <span 
              className={`font-extrabold text-1xl md:text-3xl tracking-tight uppercase text-center transition-colors duration-1000 ease-in-out
                ${isActive ? 'text-white' : 'text-gray-900'}`}
            >
                {match.away_team?.short_name || 'TBD'}
            </span>
        </div>

        {match.away_team?.badge_svg && (
          <img 
            src={`/assets/escudos_color/${match.away_team.badge_svg}`} 
            alt="Escudo Visitante" 
            className={`absolute top-1/2 right-0 w-32 h-32 md:w-48 md:h-48 object-contain pointer-events-none transition-all duration-1000 ease-out transform -translate-y-1/2
              ${isActive ? 'opacity-20 translate-x-[15%]' : 'opacity-0 translate-x-[100%]'}`} 
          />
        )}
      </div>
    </div>
  )
}