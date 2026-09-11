'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import Link from 'next/link'
import { calculateProdePoints } from '@/lib/utils'

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type Prediction = Database['public']['Tables']['predictions']['Row']

type MatchWithTeams = Match & {
  home_team: Team | null
  away_team: Team | null
}

type PredictionState = {
  id?: number
  home_goals: string
  away_goals: string
}

export default function MiProdeView() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  
  const [availableInstances, setAvailableInstances] = useState<(number | string)[]>([])
  const [currentInstance, setCurrentInstance] = useState<number | string>(1)
  
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  
  const [predictions, setPredictions] = useState<Record<number, PredictionState>>({})
  const [userId, setUserId] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData.user) {
          setError('Tenés que iniciar sesión para cargar tu prode.')
          setIsFadingOut(true)
          setTimeout(() => setLoading(false), 500)
          return
        }
        
        const currentUser = authData.user.id
        setUserId(currentUser)

        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`)
          .order('fase', { ascending: true })
          .order('kickoff', { ascending: true })

        if (matchesError) throw matchesError

        const fetchedMatches = (matchesData as MatchWithTeams[]) || []
        setMatches(fetchedMatches)

        const isMatchComplete = (m: MatchWithTeams) => 
          m.status === 'finished' && m.home_goals !== null && m.away_goals !== null

        const regComplete = fetchedMatches.filter(m => m.fase >= 1 && m.fase <= 11).length > 0 && 
                            fetchedMatches.filter(m => m.fase >= 1 && m.fase <= 11).every(isMatchComplete)
        
        const cuarComplete = fetchedMatches.filter(m => m.fase === 12).length > 0 && 
                             fetchedMatches.filter(m => m.fase === 12).every(isMatchComplete)
        
        const semComplete = fetchedMatches.filter(m => m.fase === 13).length > 0 && 
                            fetchedMatches.filter(m => m.fase === 13).every(isMatchComplete)
        
        const terComplete = fetchedMatches.filter(m => m.fase === 14).length > 0 && 
                            fetchedMatches.filter(m => m.fase === 14).every(isMatchComplete)

        const checkFetchedPhaseUnlocked = (fase: number) => {
          if (fase <= 11) return true
          if (fase === 12) return regComplete
          if (fase === 13) return cuarComplete
          if (fase === 14) return semComplete
          if (fase >= 15) return terComplete
          return false
        }

        const fasesNumericas = Array.from(
          new Set(
            fetchedMatches
              .map(m => m.fase)
              .filter((fase): fase is number => fase >= 1 && fase <= 11 && checkFetchedPhaseUnlocked(fase))
          )
        ).sort((a, b) => a - b)

        const playoffs = fetchedMatches.filter(
          m => !!m.round_name && m.fase > 11
        )

        const playoffsNombres: string[] = []

        playoffs.forEach(match => {
          if (
            checkFetchedPhaseUnlocked(match.fase) && 
            match.round_name &&
            !playoffsNombres.includes(match.round_name)
          ) {
            playoffsNombres.push(match.round_name)
          }
        })

        const todasLasInstancias = [
          ...fasesNumericas,
          ...playoffsNombres
        ]

        setAvailableInstances(todasLasInstancias)

        const activeMatch = fetchedMatches.find(m => m.status === 'pending' && checkFetchedPhaseUnlocked(m.fase))
        if (activeMatch) {
          setCurrentInstance(activeMatch.round_name || activeMatch.fase)
        } else if (todasLasInstancias.length > 0) {
          setCurrentInstance(todasLasInstancias[todasLasInstancias.length - 1])
        }

        const { data: predsData, error: predsError } = await supabase
          .from('predictions')
          .select('*')
          .eq('profile_id', currentUser)

        if (predsError) throw predsError

        const predsMap: Record<number, PredictionState> = {}
        predsData.forEach(p => {
          if (p.match_id) {
            predsMap[p.match_id] = {
              id: p.id,
              home_goals: p.home_goals.toString(),
              away_goals: p.away_goals.toString()
            }
          }
        })
        setPredictions(predsMap)

      } catch (err: any) {
        console.error(err)
        setError('Error al cargar los datos.')
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

  const handlePredictionChange = (matchId: number, team: 'home' | 'away', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return

    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        home_goals: team === 'home' ? value : (prev[matchId]?.home_goals || ''),
        away_goals: team === 'away' ? value : (prev[matchId]?.away_goals || ''),
      }
    }))
    
    if (successMsg) setSuccessMsg(null)
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    const supabase = createClient()
    const toInsert: any[] = []
    const toUpdate: any[] = []

    Object.entries(predictions).forEach(([matchIdStr, pred]) => {
      const matchId = parseInt(matchIdStr)
      if (pred.home_goals !== '' && pred.away_goals !== '') {
        const payload = {
          match_id: matchId,
          profile_id: userId,
          home_goals: parseInt(pred.home_goals),
          away_goals: parseInt(pred.away_goals)
        }

        if (pred.id) {
          toUpdate.push({ ...payload, id: pred.id })
        } else {
          toInsert.push(payload)
        }
      }
    })

    try {
      for (const item of toUpdate) {
        const { error } = await supabase.from('predictions').update(item).eq('id', item.id)
        if (error) throw error
      }

      if (toInsert.length > 0) {
        const { data, error } = await supabase.from('predictions').insert(toInsert).select()
        if (error) throw error
        
        if (data) {
          setPredictions(prev => {
            const newState = { ...prev }
            data.forEach(p => {
              if (p.match_id) {
                newState[p.match_id].id = p.id
              }
            })
            return newState
          })
        }
      }

      setSuccessMsg('¡Pronósticos guardados correctamente!')
    } catch (err: any) {
      console.error(err)
      setError('Hubo un error al guardar tus pronósticos.')
    } finally {
      setSaving(false)
    }
  }

  const handlePrevInstance = () => {
    const currentIndex = availableInstances.indexOf(currentInstance)
    if (currentIndex > 0) setCurrentInstance(availableInstances[currentIndex - 1])
  }

  const handleNextInstance = () => {
    const currentIndex = availableInstances.indexOf(currentInstance)
    if (currentIndex < availableInstances.length - 1) setCurrentInstance(availableInstances[currentIndex + 1])
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
          className="w-24 h-24 md:w-48 md:h-48 object-contain opacity-20            -mt-100
              md:-mt-50" 
        />
      </div>
    )
  }

  if (error && !userId) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{error}</h2>
        <Link href="/login" className="bg-[#011A38] text-white px-6 py-3 font-bold uppercase tracking-wider hover:bg-opacity-90 transition-all">
          Ir a Iniciar Sesión
        </Link>
      </div>
    )
  }

  const uniqueTeams = Array.from(
    new Map(
      matches.flatMap(m => {
        const teams = []
        if (m.home_team) teams.push([m.home_team.id, m.home_team])
        if (m.away_team) teams.push([m.away_team.id, m.away_team])
        return teams
      })
    ).values()
  ).sort((a, b) => (a.short_name || a.name).localeCompare(b.short_name || b.name))
  
  const selectedTeam = uniqueTeams.find(team => team.id === selectedTeamId);
  
  const isMatchComplete = (m: MatchWithTeams) => m.status === 'finished' && m.home_goals !== null && m.away_goals !== null
  const regularComplete = matches.filter(m => m.fase >= 1 && m.fase <= 11).length > 0 && matches.filter(m => m.fase >= 1 && m.fase <= 11).every(isMatchComplete)
  const cuartosComplete = matches.filter(m => m.fase === 12).length > 0 && matches.filter(m => m.fase === 12).every(isMatchComplete)
  const semisComplete = matches.filter(m => m.fase === 13).length > 0 && matches.filter(m => m.fase === 13).every(isMatchComplete)
  const tercerComplete = matches.filter(m => m.fase === 14).length > 0 && matches.filter(m => m.fase === 14).every(isMatchComplete)

  const checkPhaseUnlocked = (fase: number) => {
    if (fase <= 11) return true
    if (fase === 12) return regularComplete
    if (fase === 13) return cuartosComplete
    if (fase === 14) return semisComplete
    if (fase >= 15) return tercerComplete
    return false
  }

  const matchesToShow = selectedTeamId 
    ? matches.filter(m => (m.home_team?.id === selectedTeamId || m.away_team?.id === selectedTeamId) && checkPhaseUnlocked(m.fase))
    : matches.filter(m => typeof currentInstance === 'number' ? m.fase === currentInstance : m.round_name === currentInstance)


  return (
    <div className="relative w-full min-h-screen pb-20">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
        }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 md:py-10">
        
        <div className="flex justify-between items-center w-full animate-fade-up mb-8 text-center" style={{ animationDelay: '100ms' }}>
          <h1 className="text-2xl md:text-5xl font-black tracking-tight text-[#1E1E1E] mb-2">
            Mi Prode
          </h1>

        <div className=" bottom-0 left-0 p-4  z-50 flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className={` border border-white text-white bg-linear-to-l from-[#070128] to-[#011A38] rounded-full py-2 px-3 md:py-3 md:px-6 font-medium uppercase tracking-widest text-sm md:text-md transition-all
              ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1E1E1E] hover:-translate-y-1'}`}
          >
            {saving ? 'Guardando...' : 'Guardar Pronósticos'}
          </button>
        </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 text-center font-semibold animate-fade-up">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 text-center font-semibold animate-fade-up">
            {successMsg}
          </div>
        )}

        {!selectedTeamId && availableInstances.length > 0 && (
          <div className="animate-fade-up flex justify-center items-center gap-4 md:gap-8 mb-8" style={{ animationDelay: '200ms' }}>
            <button 
              onClick={handlePrevInstance}
              disabled={currentInstance === availableInstances[0]}
              className="px-4 py-2 md:px-6 md:py-3 text-sm md:text-base text-[#1E1E1E] font-bold tracking-wide hover:opacity-70 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
            >
              Anterior
            </button>
            
            <span className="font-black text-lg md:text-2xl text-[#1E1E1E] min-w-[120px] text-center border-b-2 border-[#1E1E1E] pb-1 uppercase tracking-wider">
              {typeof currentInstance === 'number' ? `Fecha ${currentInstance}` : currentInstance}
            </span>
            
            <button 
              onClick={handleNextInstance}
              disabled={currentInstance === availableInstances[availableInstances.length - 1]}
              className="px-4 py-2 md:px-6 md:py-3 text-sm md:text-base text-[#1E1E1E] font-bold tracking-wide hover:opacity-70 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
            >
              Siguiente
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 mb-8">
          {matchesToShow.length === 0 ? (
            <p className="text-center text-gray-500 font-medium py-10 animate-fade-up" style={{ animationDelay: '300ms' }}>No hay partidos cargados para mostrar.</p>
          ) : (
            matchesToShow.map((match, idx) => {
              const isLocked = new Date(match.kickoff) <= new Date()
              const pred = predictions[match.id] || { home_goals: '', away_goals: '' }
              
              let earnedPoints = null
              if (match.status === 'finished' && match.home_goals !== null && match.away_goals !== null && pred.id) {
                 earnedPoints = calculateProdePoints(
                   parseInt(pred.home_goals), 
                   parseInt(pred.away_goals), 
                   match.home_goals, 
                   match.away_goals
                 )
              }

              return (
                <PredictionCard 
                  key={match.id}
                  match={match}
                  prediction={pred}
                  isLocked={isLocked}
                  earnedPoints={earnedPoints}
                  onChange={(team, value) => handlePredictionChange(match.id, team, value)}
                  delay={300 + (idx * 100)}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

interface PredictionCardProps {
  match: MatchWithTeams
  prediction: PredictionState
  isLocked: boolean
  earnedPoints: number | null
  onChange: (team: 'home' | 'away', value: string) => void
  delay: number
}

function PredictionCard({ match, prediction, isLocked, earnedPoints, onChange, delay }: PredictionCardProps) {
  const matchDate = new Date(match.kickoff)
  const dayMonth = matchDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  const time = matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div 
      className="animate-fade-up h-28 md:h-32 flex items-center relative overflow-hidden group shadow-xs bg-white/20" 
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 z-0 bg-white/10 backdrop-blur-sm border border-white transition-colors group-hover:bg-white/60" />

      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#011A38] z-30" />
      <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#011A38] z-30" />

      <div className="flex items-center flex-1 justify-start h-full relative z-10 pl-4 md:pl-15">
        {match.home_team?.badge_svg && (
          <img
            src={`/assets/escudos_monocromaticos/${match.home_team.badge_svg}`}
            alt=""
            className="absolute top-1/2 left-0 w-24 h-24 md:w-32 md:h-32 object-contain pointer-events-none opacity-5 -translate-y-1/2"
          />
        )}
        <span className="font-extrabold text-xs md:text-2xl tracking-tight uppercase text-gray-900 z-20 leading-tight">
          {match.home_team?.short_name || 'TBD'}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center relative z-20 h-full w-36 md:w-48 flex-shrink-0 pt-2">
        {match.round_name && (
            <span className="text-[10px] md:text-[11px] font-black uppercase text-[#011A38] mb-0.5 text-center leading-tight">
                {match.round_name} {match.leg === 1 ? '(Ida)' : match.leg === 2 ? '(Vuelta)' : ''}
            </span>
        )}
        <span className="text-[9px] md:text-[10px] font-bold uppercase text-gray-500 mb-1">
          {match.round_name ? '' : `Fecha ${match.fase} - `} {dayMonth} - {time}
        </span>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <input 
            type="number"
            min="0"
            max="99"
            value={prediction.home_goals}
            onChange={(e) => onChange('home', e.target.value)}
            disabled={isLocked}
            className={`w-10 h-10 md:w-12 md:h-12 text-center text-xl md:text-2xl font-black bg-white/70 border-2 border-gray-300 shadow-inner focus:outline-hidden focus:border-[#011A38] focus:bg-white transition-all
              ${isLocked ? 'text-gray-500 bg-gray-100/50 border-gray-200 cursor-not-allowed' : 'text-[#1E1E1E]'}`}
            placeholder="-"
          />
          <span className="font-light text-gray-400">-</span>
          <input 
            type="number"
            min="0"
            max="99"
            value={prediction.away_goals}
            onChange={(e) => onChange('away', e.target.value)}
            disabled={isLocked}
            className={`w-10 h-10 md:w-12 md:h-12 text-center text-xl md:text-2xl font-black bg-white/70 border-2 border-gray-300 shadow-inner focus:outline-hidden focus:border-[#011A38] focus:bg-white transition-all
              ${isLocked ? 'text-gray-500 bg-gray-100/50 border-gray-200 cursor-not-allowed' : 'text-[#1E1E1E]'}`}
            placeholder="-"
          />
        </div>

        <div className="flex flex-col items-center justify-center w-full">
          {match.status === 'finished' && match.home_goals !== null && (
            <span className="text-[9px] md:text-[10px] font-bold text-[#011A38] bg-white/80 px-2 py-0.5 rounded shadow-xs mb-1 border border-gray-200 uppercase tracking-wider">
              Real: {match.home_goals} - {match.away_goals}
            </span>
          )}

          <div className="flex justify-center">
            {isLocked && earnedPoints === null && match.status !== 'finished' && (
               <span className="bg-gray-800 text-white text-md px-2 py-0.5 uppercase font-medium tracking-wider shadow-sm">Cerrado</span>
            )}
            {earnedPoints !== null && (
               <span className={`text-[9px] md:text-[10px] px-2 py-0.5 uppercase font-bold tracking-wider ${
                 earnedPoints === 3 ? 'text-green-500' : 
                 earnedPoints === 1 ? 'text-[#1E1E1E]' : 'text-red-500'
               }`}>
                 {earnedPoints} {earnedPoints === 1 ? 'Punto' : 'Puntos'}
               </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center flex-1 justify-end h-full relative z-10 pr-4 md:pr-15">
        <span className="font-extrabold text-xs md:text-2xl tracking-tight uppercase text-gray-900 z-20 text-right leading-tight">
          {match.away_team?.short_name || 'TBD'}
        </span>
        {match.away_team?.badge_svg && (
          <img
            src={`/assets/escudos_monocromaticos/${match.away_team.badge_svg}`}
            alt=""
            className="absolute top-1/2 right-0 w-24 h-24 md:w-32 md:h-32 object-contain pointer-events-none opacity-5 -translate-y-1/2"
          />
        )}
      </div>
    </div>
  )
}