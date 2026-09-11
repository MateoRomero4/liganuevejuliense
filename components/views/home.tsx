'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import Link from 'next/link'

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Prediction = Database['public']['Tables']['predictions']['Row']

type MatchWithTeams = Match & {
  home_team: Team | null
  away_team: Team | null
}

type TeamStanding = Team & {
  pj: number
  pg: number
  pe: number
  pp: number
  pts: number
  gf: number
  gc: number
}

type UserStanding = {
  id: string
  display_name: string
  pts: number
  plenos: number
  aciertos: number
}

export default function HomeView() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [standings, setStandings] = useState<TeamStanding[]>([])
  const [recentResults, setRecentResults] = useState<MatchWithTeams[]>([])
  const [prodeStandings, setProdeStandings] = useState<UserStanding[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  const [loading, setLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(true)
  const [prodeLoading, setProdeLoading] = useState(true)

  const [isFadingOut, setIsFadingOut] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [prodeError, setProdeError] = useState<string | null>(null)

  const [currentFase, setCurrentFase] = useState<number>(1)
  const [availableFases, setAvailableFases] = useState<number[]>([])

  const [activeCardIndex, setActiveCardIndex] = useState<number>(0)
  const [fadeAnim, setFadeAnim] = useState<boolean>(true)

  const [activeResultIndex, setActiveResultIndex] = useState<number>(0)
  const [activeProdeRow, setActiveProdeRow] = useState<number>(0)

  const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0)
  const [teamBannerVisible, setTeamBannerVisible] = useState<boolean>(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    async function loadHomeData() {
      try {
        const supabase = createClient()

        const minimumLoadTimePromise = new Promise(resolve => setTimeout(resolve, 500))

        const fetchMatchesPromise = supabase
          .from('matches')
          .select(`*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`)
          .order('fase', { ascending: true })
          .order('kickoff', { ascending: true })

        const fetchTeamsPromise = supabase
          .from('teams')
          .select('*')
          .order('name', { ascending: true })

        const fetchStandingsMatchesPromise = supabase
          .from('matches')
          .select('*')
          .lt('fase', 10)

        const [
          supabaseResponse,
          teamsResponse,
          matchesResponse
        ] = await Promise.all([
          fetchMatchesPromise,
          fetchTeamsPromise,
          fetchStandingsMatchesPromise,
          minimumLoadTimePromise
        ])

        const { data: matchesData, error: matchesError } = supabaseResponse

        if (matchesError) {
          console.error('Error de Supabase:', matchesError)
          setError(`Error de base de datos: ${matchesError.message}`)
        } else {
          const fetchedMatches = (matchesData as MatchWithTeams[]) || []
          setMatches(fetchedMatches)

          const regulares = fetchedMatches.filter(m => m.fase < 10)
          const fasesUnicas = Array.from(new Set(regulares.map(m => m.fase))).sort((a, b) => a - b)

          setAvailableFases(fasesUnicas)

          if (fasesUnicas.length > 0) {
            setCurrentFase(fasesUnicas[0])
          }
        }

const teamsData = (teamsResponse.data as Team[]) || []
        setTeams(teamsData)

        const standingMatchesData = (matchesResponse.data as Match[]) || []

        if (teamsData) {
          const stats: Record<string, TeamStanding> = {}

          teamsData.forEach(t => {
            stats[t.id] = {
              ...t,
              pj: 0,
              pg: 0,
              pe: 0,
              pp: 0,
              pts: 0,
              gf: 0,
              gc: 0
            }
          })

          if (standingMatchesData) {
            standingMatchesData.forEach(m => {
              if (m.home_goals !== null && m.away_goals !== null) {
                if (stats[m.home_team_id] && stats[m.away_team_id]) {
                  const hg = m.home_goals
                  const ag = m.away_goals

                  stats[m.home_team_id].pj++
                  stats[m.away_team_id].pj++

                  stats[m.home_team_id].gf += hg
                  stats[m.home_team_id].gc += ag

                  stats[m.away_team_id].gf += ag
                  stats[m.away_team_id].gc += hg

                  if (hg > ag) {
                    stats[m.home_team_id].pg++
                    stats[m.home_team_id].pts += 3
                    stats[m.away_team_id].pp++
                  } else if (hg < ag) {
                    stats[m.away_team_id].pg++
                    stats[m.away_team_id].pts += 3
                    stats[m.home_team_id].pp++
                  } else {
                    stats[m.home_team_id].pe++
                    stats[m.away_team_id].pe++
                    stats[m.home_team_id].pts += 1
                    stats[m.away_team_id].pts += 1
                  }
                }
              }
            })
          }

          const sorted = Object.values(stats).sort((a, b) => {
            const difA = a.gf - a.gc
            const difB = b.gf - b.gc

            return (
              b.pts - a.pts ||
              difB - difA ||
              b.gf - a.gf ||
              (a.name > b.name ? 1 : -1)
            )
          })

          setStandings(sorted)
        }

      } catch (err: any) {
        console.error('Excepción en el cliente:', err)
        setError(`Error de conexión: ${err.message}`)
      } finally {
        setIsFadingOut(true)
        setTimeout(() => {
          setLoading(false)
        }, 500)
      }
    }

    loadHomeData()
  }, [])

  useEffect(() => {
    async function loadRecentResults() {
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from('matches')
          .select(`*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`)
          .not('home_goals', 'is', null)
          .not('away_goals', 'is', null)
          .order('kickoff', { ascending: false })
          .limit(4)

        if (error) {
          console.error('Error cargando últimos resultados:', error)
          setResultsError(`Error cargando resultados: ${error.message}`)
          return
        }

        setRecentResults((data as MatchWithTeams[]) || [])

      } catch (err: any) {
        console.error('Excepción cargando resultados:', err)
        setResultsError(`Error de conexión: ${err.message}`)
      } finally {
        setResultsLoading(false)
      }
    }

    loadRecentResults()
  }, [])

  useEffect(() => {
    async function loadProdeStandings() {
      try {
        const supabase = createClient()

        const [profilesRes, matchesRes, predictionsRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('matches').select('*').not('home_goals', 'is', null).not('away_goals', 'is', null),
          supabase.from('predictions').select('*')
        ])

        if (profilesRes.error) throw profilesRes.error
        if (matchesRes.error) throw matchesRes.error
        if (predictionsRes.error) throw predictionsRes.error

const profilesData = (profilesRes.data as Profile[]) || [] 
        const matchesData = (matchesRes.data as Match[]) || [] 
        const predictionsData = (predictionsRes.data as Prediction[]) || [] 

        const stats: Record<string, UserStanding> = {}

        profilesData.forEach((profile: Profile) => {
          stats[profile.id] = {
            id: profile.id,
            display_name: profile.display_name || profile.email.split('@')[0],
            pts: 0,
            plenos: 0,
            aciertos: 0
          }
        })

        const matchesMap = new Map<number, Match>()

        matchesData.forEach((match: Match) => {
          matchesMap.set(match.id, match)
        })

        predictionsData.forEach((prediction: Prediction) => {
          const match = matchesMap.get(prediction.match_id!)
          const profileId = prediction.profile_id!

          if (match && stats[profileId]) {
            const hgMatch = match.home_goals!
            const agMatch = match.away_goals!
            const hgPred = prediction.home_goals
            const agPred = prediction.away_goals

            const matchOutcome = hgMatch > agMatch ? 1 : hgMatch < agMatch ? -1 : 0
            const predOutcome = hgPred > agPred ? 1 : hgPred < agPred ? -1 : 0

            if (hgMatch === hgPred && agMatch === agPred) {
              stats[profileId].pts += 3
              stats[profileId].plenos++
            } else if (matchOutcome === predOutcome) {
              stats[profileId].pts += 1
              stats[profileId].aciertos++
            }
          }
        })

        const sorted = Object.values(stats).sort((a, b) => {
          return (
            b.pts - a.pts ||
            b.plenos - a.plenos ||
            (a.display_name > b.display_name ? 1 : -1)
          )
        })

        setProdeStandings(sorted.slice(0, 10))

      } catch (err: any) {
        console.error('Error cargando tabla del prode:', err)
        setProdeError(`Error cargando tabla del Prode: ${err.message}`)
      } finally {
        setProdeLoading(false)
      }
    }

    loadProdeStandings()
  }, [])

  const matchesToShow = matches.filter(m => m.fase === currentFase)

  useEffect(() => {
    setActiveCardIndex(0)
  }, [currentFase])

  useEffect(() => {
    if (matchesToShow.length <= 1) return

    const interval = setInterval(() => {
      setFadeAnim(false)
      setTimeout(() => {
        setActiveCardIndex(prev => (prev + 1) % matchesToShow.length)
        setFadeAnim(true)
      }, 300)
    }, 3500)

    return () => clearInterval(interval)
  }, [matchesToShow.length])

  useEffect(() => {
    if (recentResults.length <= 1) return

    const interval = setInterval(() => {
      setActiveResultIndex(prev => (prev + 1) % recentResults.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [recentResults.length])

  useEffect(() => {
    if (prodeStandings.length <= 1) return

    const interval = setInterval(() => {
      setActiveProdeRow(prev => (prev + 1) % prodeStandings.length)
    }, 1500)

    return () => clearInterval(interval)
  }, [prodeStandings.length])

  useEffect(() => {
    if (teams.length <= 1) return

    const interval = setInterval(() => {
      setTeamBannerVisible(false)
      setTimeout(() => {
        setActiveTeamIndex(prev => (prev + 1) % teams.length)
        setTeamBannerVisible(true)
      }, 350)
    }, 4500)

    return () => clearInterval(interval)
  }, [teams.length])

  const topTeams = standings.slice(0, 6)
  const activeTeam = teams[activeTeamIndex] || null

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 2.0
    }
  }, [loading])

  if (loading) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
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
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        {error}
      </div>
    )
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
        @keyframes teamBannerIn {
          from { opacity: 0; transform: translateX(50px) scale(0.98); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        .team-banner-in {
          animation: teamBannerIn 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 lg:gap-8 items-start">
          <section className="lg:row-span-2 min-w-0">
            <div className="animate-fade-up mb-4 flex items-center justify-between px-2" style={{ animationDelay: '100ms' }}>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight">Prode</h2>
              <Link href="/?tab=prode" className="text-xs md:text-sm font-semibold text-[#011A38] hover:underline flex items-center gap-1">
                Ver tabla completa →
              </Link>
            </div>

            {prodeLoading ? (
              <div className="animate-fade-up w-full border border-white bg-white/40 backdrop-blur-sm py-8 text-center text-gray-400 font-medium" style={{ animationDelay: '250ms' }}>
                Cargando tabla...
              </div>
            ) : prodeError ? (
              <div className="animate-fade-up w-full border border-white bg-white/40 backdrop-blur-sm py-8 text-center text-red-500 font-medium" style={{ animationDelay: '250ms' }}>
                {prodeError}
              </div>
            ) : (
              <Link href="/?tab=prode" className="block group animate-fade-up" style={{ animationDelay: '250ms' }}>
                <div className="w-full border border-white overflow-hidden shadow-xs bg-white/40 backdrop-blur-sm transition-transform duration-300">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1e1e1e] text-white text-[9px] md:text-xs uppercase tracking-wider font-bold">
                        <th className="p-2 md:p-4 text-center border-b border-white">POS</th>
                        <th className="p-2 md:p-4 border-b border-white">Participante</th>
                        <th className="p-2 md:p-4 text-center border-b border-white">PTS</th>
                        <th className="p-2 md:p-4 text-center border-b border-white">PLENOS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prodeStandings.map((user, idx) => (
                        <tr key={user.id} className={`animate-fade-up border-b border-white transition-all duration-700 ease-in-out ${idx % 2 !== 0 ? 'bg-gray-50/50' : 'bg-transparent'} ${activeProdeRow === idx ? 'bg-gray-300/10' : ''} group-hover:bg-gray-100/40`} style={{ animationDelay: `${400 + (idx * 100)}ms` }}>
                          <td className="text-center font-bold text-black/70 text-sm md:text-base">{idx + 1}</td>
                          <td className="font-semibold text-black/70 text-sm md:text-lg pt-1 pb-1">
                            <div className="flex items-center min-w-0">

                              <span className="truncate">{user.display_name}</span>
                            </div>
                          </td>
                          <td className=" text-center font-bold text-gray-700 text-base md:text-lg">{user.pts}</td>
                          <td className="hidden md:table-cell text-center text-black/70 font-medium text-sm">{user.plenos}</td>
                        </tr>
                      ))}
                      {prodeStandings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-black/60 font-medium text-sm">No hay pronósticos registrados aún.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Link>
            )}
          </section>

          <section className="min-w-0">
            <div className="animate-fade-up mb-4 flex items-center justify-between px-2" style={{ animationDelay: '150ms' }}>
              <h2 className="text-xl md:text-2xl font-bold text-[#1E1E1E] tracking-tight">Próximos encuentros</h2>
              <Link href="/?tab=fixture" className="text-xs md:text-sm font-semibold text-[#011A38] hover:underline">Ver fixture →</Link>
            </div>
            {matchesToShow.length === 0 ? (
              <p className="animate-fade-up text-gray-500 font-medium text-center py-10" style={{ animationDelay: '300ms' }}>No hay partidos para mostrar en esta fecha.</p>
            ) : (
              <Link href="/?tab=fixture" className="block group">
                <div className={`animate-fade-up overflow-hidden duration-300 transition-opacity ${fadeAnim ? 'opacity-100' : 'opacity-50'}`} style={{ animationDelay: '300ms' }}>
                  {matchesToShow.map((match, idx) => {
                    if (activeCardIndex !== idx) return null
                    return <MatchCard key={match.id} match={match} delay={0} isActive={true} showFase={false} />
                  })}
                </div>
              </Link>
            )}
          </section>

<section className="min-w-0">
            <div className="animate-fade-up mb-4 flex items-center justify-between px-2" style={{ animationDelay: '200ms' }}>
              <h2 className="text-xl md:text-2xl font-bold text-[#1E1E1E] tracking-tight">Últimos resultados</h2>
              <Link href="/?tab=results" className="text-xs md:text-sm font-semibold text-[#011A38] hover:underline">Ver todos →</Link>
            </div>
            {resultsLoading ? (
              <div className="animate-fade-up w-full border border-white bg-white/40 backdrop-blur-sm py-8 text-center text-gray-400 font-medium" style={{ animationDelay: '350ms' }}>
                Cargando resultados...
              </div>
            ) : resultsError ? (
              <div className="animate-fade-up w-full border border-white bg-white/40 backdrop-blur-sm py-8 text-center text-red-500 font-medium" style={{ animationDelay: '350ms' }}>
                {resultsError}
              </div>
            ) : recentResults.length === 0 ? (
              <div className="animate-fade-up w-full border border-white bg-white/40 backdrop-blur-sm py-8 text-center text-gray-500 font-medium" style={{ animationDelay: '350ms' }}>
                Aún no hay resultados registrados.
              </div>
            ) : (
<Link href="/?tab=results" className="block group">
                <div className="animate-fade-up w-full overflow-hidden " style={{ animationDelay: '350ms' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {recentResults.map((match, idx) => (
                      <ResultCard 
                        key={match.id} 
                        match={match} 
                        delay={450 + (idx * 120)} 
                        isActive={activeResultIndex === idx} 
                      />
                    ))}
                  </div>
                </div>
              </Link>
            )}
          </section>

          <section className="lg:col-span-2 min-w-0">
            <div className="animate-fade-up mb-4 flex items-center justify-between px-2" style={{ animationDelay: '500ms' }}>
              <h2 className="text-xl md:text-2xl font-bold text-[#1E1E1E] tracking-tight">Posiciones</h2>
              <Link href="/?tab=league" className="text-xs md:text-sm font-semibold text-[#011A38] hover:underline">Ver tabla completa →</Link>
            </div>
            <Link href="/?tab=league" className="block group">
              <div className="animate-fade-up w-full border border-white overflow-hidden shadow-xs bg-white/40 backdrop-blur-sm transition-transform duration-300" style={{ animationDelay: '550ms' }}>
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-linear-to-l from-[#070128] to-[#011A38] text-white text-[10px] md:text-xs uppercase tracking-wider font-bold">
                      <th className="p-3 text-center border-b border-white">POS</th>
                      <th className="p-3 border-b border-white">Equipo</th>
                      <th className="p-3 text-center border-b border-white">PTS</th>
                      <th className="p-3 text-center border-b border-white">PJ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTeams.map((team, idx) => (
                      <tr key={team.id} className={`animate-fade-up border-b border-white transition-colors duration-200 ${idx % 2 !== 0 ? 'bg-gray-50/50' : 'bg-transparent'} hover:bg-gray-200/40`} style={{ animationDelay: `${650 + (idx * 100)}ms` }}>
                        <td className="p-3 text-center font-bold text-black/90 text-sm md:text-base">{idx + 1}</td>
                        <td className="p-3 font-semibold text-black/90 text-sm md:text-base">
                          <div className="flex items-center gap-3">
                            {team.badge_svg ? (
                              <img src={`/assets/escudos_monocromaticos/${team.badge_svg}`} alt={team.name} className="w-6 h-6 md:w-8 md:h-8 object-contain opacity-80" />
                            ) : (
                              <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-black/90 border border-black/90 bg-transparent rounded-full">
                                <ShieldIcon />
                              </div>
                            )}
                            <span className="truncate">{team.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-gray-900 text-sm md:text-base">{team.pts}</td>
                        <td className="p-3 text-center text-black/90 font-medium text-sm md:text-base">{team.pj}</td>
                      </tr>
                    ))}
                    {topTeams.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-black/60 font-medium text-sm">No hay equipos registrados aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Link>
          </section>
        </div>

        {activeTeam && (
          <section className="mt-8 md:mt-10 w-full">
            <div className="mb-4 px-2 flex items-center justify-between"></div>
            <div className="relative w-full h-48 md:h-64 overflow-hidden border border-white bg-white">
              <div
                className={`absolute inset-0 transition-opacity duration-500 backdrop-blur-sm ${teamBannerVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{
                  background: `repeating-linear-gradient(to right, ${activeTeam.colors?.[0] ?? '#011A38'}, ${activeTeam.colors?.[0] ?? '#011A38'} 8.333%, ${activeTeam.colors?.[1] ?? activeTeam.colors?.[0] ?? '#1E1E1E'} 8.333%, ${activeTeam.colors?.[1] ?? activeTeam.colors?.[0] ?? '#1E1E1E'} 16.666%)`
                }}
              />

              <div className="absolute inset-0 bg-linear-to-r from-black/70 via-transparent to-black/20 z-10" />

              {activeTeam.badge_svg && (
                <img
                  src={`/assets/escudos_monocromaticos/${activeTeam.badge_svg}`}
                  alt=""
                  aria-hidden="true"
                  className={`absolute right-[5%] md:right-[15%] top-1/2 -translate-y-1/2 w-48 h-48 md:w-72 md:h-72 object-contain opacity-15 brightness-0 pointer-events-none transition-all duration-700 ${teamBannerVisible ? 'translate-x-0' : 'translate-x-10'}`}
                />
              )}

              <div className={`relative z-20 w-full h-full flex items-center ${teamBannerVisible ? 'team-banner-in' : 'opacity-0'}`}>
                <div className="relative z-30 flex flex-col justify-center w-[55%] md:w-[40%] h-full pl-5 md:pl-10">
                  <h3 className="text-2xl sm:text-3xl md:text-6xl font-black uppercase tracking-tight leading-tight text-white drop-shadow-sm px-4 py-2 inline-block w-fit">
                    {activeTeam.short_name}
                  </h3>
                </div>

                <div className="absolute z-30 left-[55%] md:left-[55%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  {activeTeam.badge_svg ? (
                    <img src={`/assets/escudos_color/${activeTeam.badge_svg}`} alt={activeTeam.name} className="w-20 h-20 md:w-32 md:h-32 lg:w-40 lg:h-40 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.2)]" />
                  ) : (
                    <div className="w-20 h-20 md:w-32 md:h-32 flex items-center justify-center text-white">
                      <ShieldIcon />
                    </div>
                  )}
                </div>

                <div className="absolute z-40 md:right-0 -right-30 bottom-0 h-[120%] md:h-full w-[45%] md:w-[42%] flex items-end justify-end pointer-events-none">
                  <PlayerImage team={activeTeam} />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function PlayerImage({ team }: { team: Team }) {
  const [extensionIndex, setExtensionIndex] = useState(0)

  useEffect(() => {
    setExtensionIndex(0)
  }, [team.id])

  const extensions = ['png', 'webp', 'jpg', 'jpeg']

  const slug = team.slug || team.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const baseName = team.badge_svg ? team.badge_svg.split('.')[0] : slug
  const src = `/assets/jugadores/${baseName}.${extensions[extensionIndex]}`

  return (
    <img
      key={src}
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => {
        if (extensionIndex < extensions.length - 1) {
          setExtensionIndex(prev => prev + 1)
        }
      }}
      className="h-[120%] md:h-[150%] w-auto max-w-none object-contain object-bottom"
    />
  )
}

function ResultCard({ match, delay = 0, isActive }: { match: MatchWithTeams, delay?: number, isActive: boolean }) {
  const homeColor1 = match.home_team?.colors?.[0] ?? '#1f2937';
  const homeColor2 = match.home_team?.colors?.[1] ?? homeColor1;
  const awayColor1 = match.away_team?.colors?.[0] ?? '#1f2937';
  const awayColor2 = match.away_team?.colors?.[1] ?? awayColor1;

  return (
    <div 
      className={`animate-fade-up flex items-stretch border border-white/50 overflow-hidden h-20 md:h-24 transition-all duration-700 ease-in-out bg-white/40
        ${isActive ? ' border-white/80' : 'hover:bg-white/60'}`}
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
            src={`/assets/escudos_color/${match.home_team.badge_svg}`} 
            alt={match.home_team.name || 'Home Team'} 
            className={`w-12 h-12 md:w-16 md:h-16 object-contain relative z-10 transition-transform duration-500 ${isActive ? 'opacity-100 drop-shadow-xs' : 'opacity-100'}`}
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
            src={`/assets/escudos_color/${match.away_team.badge_svg}`} 
            alt={match.away_team.name || 'Away Team'} 
            className={`w-12 h-12 md:w-16 md:h-16 object-contain relative z-10 transition-transform duration-500 ${isActive ? 'opacity-100 drop-shadow-xs' : 'opacity-100'}`}
          />
        )}
      </div>

    </div>
  )
}

function MatchCard({ match, delay, isActive, showFase }: { match: MatchWithTeams, delay: number, isActive: boolean, showFase?: boolean }) {
  const isPending = match.status === 'pending'
  const matchDate = new Date(match.kickoff)
  const dayMonth = matchDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  const time = matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="animate-fade-up h-20 md:h-24 flex items-center relative overflow-hidden transition-opacity duration-1000 group" style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute inset-0 z-0 overflow-hidden transition-transform duration-1000 ease-in-out">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm border border-white" />
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-2 flex flex-col z-30">
        <div className="h-full w-full bg-[#011A38]" />
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-2 flex flex-col z-30">
        <div className="h-full w-full bg-[#011A38]" />
      </div>

      <div className="flex items-center flex-1 justify-start h-full relative z-10 pl-4">
        {match.home_team?.badge_svg && (
          <img
            src={`/assets/escudos_monocromaticos/${match.home_team.badge_svg}`}
            alt="Escudo Local"
            className="absolute top-1/2 left-0 w-32 h-32 md:w-48 md:h-48 object-contain pointer-events-none opacity-20 -translate-y-1/2"
          />
        )}
        <div className="flex justify-center items-center w-full px-2 md:px-6 relative z-20">
          <span className="font-extrabold text-sm md:text-2xl tracking-tight uppercase text-center text-gray-900">
            {match.home_team?.short_name || 'TBD'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center relative z-20 py-2 h-full w-24 md:w-32 flex-shrink-0">
        {showFase && (
          <span className="absolute top-1 text-[10px] font-bold uppercase text-gray-900">Fecha {match.fase}</span>
        )}

        {isPending ? (
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs md:text-xl font-bold tracking-widest leading-none mb-1 text-gray-900">{dayMonth}</span>
            <span className="text-[10px] md:text-xs font-semibold leading-none text-gray-900">{time}</span>
          </div>
        ) : (
          <div className="text-xl md:text-2xl font-black tracking-widest text-[#1E1E1E]">
            {match.home_goals}
            <span className="font-light mx-1 text-gray-400">-</span>
            {match.away_goals}
          </div>
        )}
      </div>

      <div className="flex items-center flex-1 justify-end h-full relative z-10 pr-4">
        <div className="flex justify-center items-center w-full px-2 md:px-6 relative z-20">
          <span className="font-extrabold text-sm md:text-2xl tracking-tight uppercase text-center text-gray-900">
            {match.away_team?.short_name || 'TBD'}
          </span>
        </div>

        {match.away_team?.badge_svg && (
          <img
            src={`/assets/escudos_monocromaticos/${match.away_team.badge_svg}`}
            alt="Escudo Visitante"
            className="absolute top-1/2 right-0 w-32 h-32 md:w-48 md:h-48 object-contain pointer-events-none opacity-20 translate-y-[-50%]"
          />
        )}
      </div>
    </div>
  )
}


function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}