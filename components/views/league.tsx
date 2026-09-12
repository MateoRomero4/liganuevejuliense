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

type TeamStanding = Team & {
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  pts: number;
  gf: number;
  gc: number;
}

type PlayoffTie = {
  id: string | number;
  round_name: string | null;
  team1: Team | null;
  team2: Team | null;
  team1_goals: number | null;
  team2_goals: number | null;
  team1_penalties: number | null;
  team2_penalties: number | null;
  isFinished: boolean;
  winnerId: number | null;
  statusText: string | null;
}

export default function LeagueView() {
  const [standings, setStandings] = useState<TeamStanding[]>([])
  
  const [quarters, setQuarters] = useState<PlayoffTie[]>([])
  const [semis, setSemis] = useState<PlayoffTie[]>([])
  const [finalTie, setFinalTie] = useState<PlayoffTie | null>(null)
  const [thirdFourthTie, setThirdFourthTie] = useState<PlayoffTie | null>(null)

  const [loading, setLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeRow, setActiveRow] = useState(0)
  const [activeBracket, setActiveBracket] = useState(0)
  const totalBrackets = 8

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        
        const minimumLoadTimePromise = new Promise(resolve => setTimeout(resolve, 500));
        
        const fetchTeamsPromise = supabase.from('teams').select('*')
        const fetchMatchesPromise = supabase
          .from('matches')
          .select(`*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`)

        const [teamsResponse, matchesResponse] = await Promise.all([
          fetchTeamsPromise, 
          fetchMatchesPromise, 
          minimumLoadTimePromise
        ]);

const teamsData = (teamsResponse.data as Team[]) || []; 
        const matchesData = (matchesResponse.data as MatchWithTeams[]) || [];

        if (teamsData.length > 0 && matchesData.length > 0) {
          const stats: Record<string, TeamStanding> = {}
          teamsData.forEach(t => {
            stats[t.id] = { ...t, pj: 0, pg: 0, pe: 0, pp: 0, pts: 0, gf: 0, gc: 0 }
          })

          const regularMatches = matchesData.filter(m => !m.round_name && m.fase < 10)
          
          regularMatches.forEach(m => {
            if (m.home_goals !== null && m.away_goals !== null && m.home_team_id && m.away_team_id) {
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
          })

          const sortedStandings = Object.values(stats).sort((a, b) => {
            const difA = a.gf - a.gc
            const difB = b.gf - b.gc
            return b.pts - a.pts || difB - difA || b.gf - a.gf || (a.name > b.name ? 1 : -1)
          })
          setStandings(sortedStandings)

          const playoffTies = processPlayoffs(matchesData)

          const dbQuarters = playoffTies.filter(t => t.round_name?.toLowerCase().includes('cuarto'))
          const dbSemis = playoffTies.filter(t => t.round_name?.toLowerCase().includes('semi'))
          const dbFinal = playoffTies.find(t => t.round_name?.toLowerCase().includes('final') && !t.round_name?.toLowerCase().includes('tercer'))
          const dbThird = playoffTies.find(t => t.round_name?.toLowerCase().includes('tercer'))

          setQuarters(Array.from({ length: 4 }).map((_, i) => {
            if (dbQuarters[i]) return dbQuarters[i];
            
            let homeTeam = undefined;
            let awayTeam = undefined;
            if (sortedStandings.length >= 8) {
              if (i === 0) { homeTeam = sortedStandings[0]; awayTeam = sortedStandings[7]; } 
              if (i === 1) { homeTeam = sortedStandings[3]; awayTeam = sortedStandings[4]; } 
              if (i === 2) { homeTeam = sortedStandings[1]; awayTeam = sortedStandings[6]; } 
              if (i === 3) { homeTeam = sortedStandings[2]; awayTeam = sortedStandings[5]; } 
            }
            return createEmptyTie(`q-${i}`, homeTeam, awayTeam)
          }))

          setSemis(Array.from({ length: 2 }).map((_, i) => dbSemis[i] || createEmptyTie(`s-${i}`)))
          setFinalTie(dbFinal || createEmptyTie('f-0'))
          setThirdFourthTie(dbThird || createEmptyTie('tf-0'))
        }
      } catch (err) {
        console.error("Error cargando tabla:", err)
      } finally {
        setIsFadingOut(true)
        setTimeout(() => setLoading(false), 500)
      }
    }
    loadData()
  }, [])

  function processPlayoffs(matches: MatchWithTeams[]): PlayoffTie[] {
    const playoffMatches = matches.filter(m => m.round_name)
    const tiesMap = new Map<number, MatchWithTeams[]>()

    playoffMatches.forEach(m => {
      const tieId = m.aggregate_tie_id || m.id
      if (!tiesMap.has(tieId)) tiesMap.set(tieId, [])
      tiesMap.get(tieId)!.push(m)
    })

    return Array.from(tiesMap.values()).map(tieMatches => {
      tieMatches.sort((a, b) => (a.leg || 1) - (b.leg || 1))
      const leg1 = tieMatches[0]
      const leg2 = tieMatches.length > 1 ? tieMatches[1] : null

      const team1 = leg1.home_team
      const team2 = leg1.away_team

      let team1_goals: number | null = null
      let team2_goals: number | null = null
      let isFinished = false
      let statusText: string | null = null

      if (leg1.status === 'finished') {
        team1_goals = leg1.home_goals || 0
        team2_goals = leg1.away_goals || 0

        if (leg2) {
          if (leg2.status === 'finished') {
            team1_goals += (leg2.away_goals || 0)
            team2_goals += (leg2.home_goals || 0)
            isFinished = true
          } else {
            statusText = 'Parcial'
          }
        } else {
          if (leg1.aggregate_tie_id) {
            statusText = 'Parcial'
          } else {
            isFinished = true 
          }
        }
      }

      let team1_penalties: number | null = null
      let team2_penalties: number | null = null

      if (isFinished) {
        if (leg2) {
          team1_penalties = leg2.away_penalties
          team2_penalties = leg2.home_penalties
        } else {
          team1_penalties = leg1.home_penalties
          team2_penalties = leg1.away_penalties
        }
      }

      let winnerId: number | null = null
      if (isFinished && team1_goals !== null && team2_goals !== null) {
        if (team1_goals > team2_goals) winnerId = team1?.id || null
        else if (team2_goals > team1_goals) winnerId = team2?.id || null
        else {
          if (team1_penalties !== null && team2_penalties !== null) {
            if (team1_penalties > team2_penalties) winnerId = team1?.id || null
            else if (team2_penalties > team1_penalties) winnerId = team2?.id || null
          }
        }
      }

      return {
        id: leg1.aggregate_tie_id || leg1.id,
        round_name: leg1.round_name,
        team1,
        team2,
        team1_goals,
        team2_goals,
        team1_penalties,
        team2_penalties,
        isFinished,
        winnerId,
        statusText
      }
    })
  }

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 2.0;
  }, [loading]);

  useEffect(() => {
    if (standings.length > 0) {
      const interval = setInterval(() => setActiveRow(prev => (prev + 1) % standings.length), 1500)
      return () => clearInterval(interval)
    }
  }, [standings.length])

  useEffect(() => {
    const interval = setInterval(() => setActiveBracket(prev => (prev + 1) % totalBrackets), 1500)
    return () => clearInterval(interval)
  }, [])

  if (loading || !finalTie || !thirdFourthTie) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
<video 
  ref={videoRef}
  autoPlay 
  loop 
  muted 
  playsInline
  className="hidden md:block w-48 h-48 md:w-78 md:h-78 object-contain opacity-20 -mt-[200px]" 
>
  <source src="/assets/loader2.mov" type='video/mp4; codecs="hvc1"' />
  <source src="/assets/loader2.webm" type="video/webm" />
</video>      </div>
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
          
          <div className="w-full">
            <div className="animate-fade-up mb-8 flex flex-col items-center justify-center" style={{ animationDelay: '100ms' }}>
              <h2 className="text-3xl md:text-5xl font-bold text-[#1e1e1e] tracking-tight text-center">Posiciones</h2>
            </div>

            <div className="w-full border border-white overflow-hidden animate-fade-up shadow-xs bg-white/40 backdrop-blur-sm" style={{ animationDelay: '200ms' }}>
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-linear-to-l from-[#2980FF] to-[#043AB7] text-white text-[10px] md:text-xs uppercase tracking-wider font-bold">
                    <th className="p-3 md:p-4 text-center border-b border-white drop-shadow-sm">POS</th>
                    <th className="p-3 md:p-4 border-b border-white drop-shadow-sm">Equipo</th>
                    <th className="p-3 md:p-4 text-center border-b border-white drop-shadow-sm">PTS</th>
                    <th className="p-3 md:p-4 text-center border-b border-white text-gray-200 drop-shadow-sm">PJ</th>
                    <th className="p-3 md:p-4 text-center border-b border-white text-gray-200 drop-shadow-sm">PG</th>
                    <th className="p-3 md:p-4 text-center border-b border-white text-gray-200 drop-shadow-sm">PE</th>
                    <th className="p-3 md:p-4 text-center border-b border-white text-gray-200 drop-shadow-sm">PP</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, idx) => (
                    <tr 
                      key={team.id} 
                      className={`animate-fade-up border-b border-white transition-all duration-700 ease-in-out
                        ${idx % 2 !== 0 ? 'bg-gray-50/50' : 'bg-transparent'} 
                        ${activeRow === idx ? 'bg-gray-300/10' : ''}`} 
                      style={{ animationDelay: `${300 + (idx * 100)}ms` }}
                    >
                      <td className="p-3 md:p-4 text-center font-bold text-black/90 drop-shadow-sm text-sm md:text-base">{idx + 1}</td>
                      <td className="p-3 md:p-4 font-semibold text-black/90 text-sm md:text-lg flex items-center gap-3">
                        {team.badge_svg ? (
                          <img src={`/assets/escudos_color/${team.badge_svg}`} alt={team.name} className="w-7 h-7 md:w-9 md:h-9 object-contain" />
                        ) : (
                          <div className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center text-black/90 border border-black/90 bg-transparent rounded-full">
                            <ShieldIcon />
                          </div>
                        )}
                        <span className="truncate">{team.name}</span>
                      </td>
                      <td className="p-3 md:p-4 text-center font-bold text-gray-900 text-base md:text-lg drop-shadow-sm">{team.pts}</td>
                      <td className="p-3 md:p-4 text-center text-black/90 font-medium text-sm md:text-base drop-shadow-sm">{team.pj}</td>
                      <td className="p-3 md:p-4 text-center text-black/90 font-medium text-sm md:text-base drop-shadow-sm">{team.pg}</td>
                      <td className="p-3 md:p-4 text-center text-black/90 font-medium text-sm md:text-base drop-shadow-sm">{team.pe}</td>
                      <td className="p-3 md:p-4 text-center text-black/90 font-medium text-sm md:text-base drop-shadow-sm">{team.pp}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-black/60 font-medium text-sm md:text-base drop-shadow-sm">No hay equipos registrados aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="w-full mt-4 pb-12">
            <div className="animate-fade-up mb-8 flex flex-col items-center justify-center" style={{ animationDelay: '400ms' }}>
              <h2 className="text-3xl md:text-5xl font-bold text-[#1e1e1e] tracking-tight mb-2 text-center">Fase Final</h2>
              <p className="text-sm md:text-base font-bold text-black/70 border-b-2 border-[#043AB7] pb-1 text-center">
                Los cruces hasta el momento
              </p>
            </div>

            <div className="w-full pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-4 relative z-10 items-center md:items-stretch md:min-w-0">
                
                <div className="flex flex-col gap-4 w-full md:w-1/3 justify-around">
                  {quarters.map((tie, idx) => (
                    <BracketCard 
                      key={tie.id} 
                      tie={tie} 
                      playoffLabel={getQuarterFinalLabel(idx)} 
                      delay={500 + (idx * 100)} 
                      isActive={activeBracket === idx}
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-6 w-full md:w-1/3 justify-around md:py-10 mt-4 md:mt-0">
                  {semis.map((tie, idx) => (
                    <BracketCard 
                      key={tie.id} 
                      tie={tie} 
                      playoffLabel={getSemiLabel(idx)} 
                      delay={1000 + (idx * 150)} 
                      isActive={activeBracket === (idx + 4)}
                    />
                  ))}
                </div>

                <div className="flex flex-col w-full md:w-1/3 mt-4 md:mt-0 relative justify-center gap-8 md:gap-0">
                  <div className="flex flex-col justify-center h-full">
                    <BracketCard 
                      tie={finalTie} 
                      playoffLabel="Ganador S1 vs Ganador S2" 
                      delay={1400} 
                      isActive={activeBracket === 6}
                      isFinal
                    />
                  </div>
                  
                  <div className="flex flex-col items-center md:absolute md:bottom-0 md:left-0 md:right-0">
                    <h3 
                      className="animate-fade-up text-[11px] md:text-sm font-bold text-[#1e1e1e] mb-2 text-center drop-shadow-sm uppercase tracking-wide" 
                      style={{ animationDelay: '1500ms' }}
                    >
                      3º y 4º Puesto
                    </h3>
                    <div className="w-full">
                      <BracketCard 
                        tie={thirdFourthTie} 
                        playoffLabel="Perdedor S1 vs Perdedor S2" 
                        delay={1600} 
                        isActive={activeBracket === 7}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function BracketCard({ tie, playoffLabel, delay, isActive, isFinal }: { tie: PlayoffTie, playoffLabel: string, delay: number, isActive: boolean, isFinal?: boolean }) {
  const [localLabel, visitLabel] = playoffLabel.split(' vs ');
  
  const t1Short = tie.team1?.short_name || tie.team1?.name || localLabel;
  const t2Short = tie.team2?.short_name || tie.team2?.name || visitLabel;

  const isT1Winner = tie.isFinished && tie.winnerId === tie.team1?.id;
  const isT2Winner = tie.isFinished && tie.winnerId === tie.team2?.id;

  const getTeamStyle = (isWinner: boolean) => {
    if (!tie.isFinished) return "text-black/90 font-bold";
    return isWinner ? "text-black font-black" : "text-black/40 font-medium";
  };

  const getScoreStyle = (isWinner: boolean) => {
    if (!tie.isFinished) return "text-gray-900 font-bold";
    return isWinner ? "text-black font-black" : "text-gray-400 font-medium";
  };

  const t1Penalties = tie.team1_penalties !== null ? `(${tie.team1_penalties})` : '';
  const t2Penalties = tie.team2_penalties !== null ? `(${tie.team2_penalties})` : '';

  return (
    <div 
      className={`animate-fade-up overflow-hidden flex flex-col font-medium border border-white w-full mx-auto transition-all duration-700 ease-in-out shadow-sm`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`backdrop-blur-md text-[9px] md:text-[11px] uppercase text-center py-1.5 md:py-2 tracking-wider font-bold bg-linear-to-l from-[#2980FF] to-[#043AB7] drop-shadow-sm flex items-center justify-center gap-1
        ${isFinal ? 'text-[#d5b15e]' : 'text-white'}`}
      >
        <span>{isFinal ? 'GRAN FINAL' : (tie.round_name || playoffLabel)}</span>
        {tie.statusText && <span className="text-[8px] md:text-[9px] opacity-80 normal-case bg-white/20 px-1.5 rounded">- {tie.statusText}</span>}
      </div>
      
      <div className={`flex items-center justify-between p-2 md:p-3 border-b border-white transition-colors duration-500 ${isActive ? 'bg-gray-100' : 'bg-white/40'}`}>
        <div className="flex items-center gap-2 md:gap-3">
          {tie.team1?.badge_svg ? (
            <img src={`/assets/escudos_color/${tie.team1.badge_svg}`} alt="" className={`w-6 h-6 md:w-8 md:h-8 object-contain transition-all duration-300 ${!tie.isFinished || isT1Winner ? 'opacity-100' : 'opacity-40 grayscale-[30%]'}`} />
          ) : (
            <div className="w-5 h-5 md:w-7 md:h-7 flex items-center justify-center text-black/40 border border-black/40 bg-transparent rounded-full">
              <ShieldIcon />
            </div>
          )}
          <span className={`inline drop-shadow-sm text-sm md:text-base ${getTeamStyle(isT1Winner)}`}>
            {t1Short}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {t1Penalties && <span className="text-[10px] md:text-xs text-gray-500 font-bold">{t1Penalties}</span>}
          <span className={`ml-1 text-sm md:text-base drop-shadow-sm ${getScoreStyle(isT1Winner)}`}>
            {tie.team1_goals ?? '-'}
          </span>
        </div>
      </div>
      
      <div className={`flex items-center justify-between p-2 md:p-3 transition-colors duration-500 ${isActive ? 'bg-gray-100' : 'bg-white/40'}`}>
        <div className="flex items-center gap-2 md:gap-3">
          {tie.team2?.badge_svg ? (
            <img src={`/assets/escudos_color/${tie.team2.badge_svg}`} alt="" className={`w-6 h-6 md:w-8 md:h-8 object-contain transition-all duration-300 ${!tie.isFinished || isT2Winner ? 'opacity-100' : 'opacity-40 grayscale-[30%]'}`} />
          ) : (
            <div className="w-5 h-5 md:w-7 md:h-7 flex items-center justify-center text-black/40 border border-black/40 bg-transparent rounded-full">
              <ShieldIcon />
            </div>
          )}
          <span className={`inline drop-shadow-sm text-sm md:text-base ${getTeamStyle(isT2Winner)}`}>
            {t2Short}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {t2Penalties && <span className="text-[10px] md:text-xs text-gray-500 font-bold">{t2Penalties}</span>}
          <span className={`ml-1 text-sm md:text-base drop-shadow-sm ${getScoreStyle(isT2Winner)}`}>
            {tie.team2_goals ?? '-'}
          </span>
        </div>
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

function createEmptyTie(id: string, team1?: Team, team2?: Team): PlayoffTie {
  return {
    id,
    round_name: null,
    team1: team1 || null,
    team2: team2 || null,
    team1_goals: null,
    team2_goals: null,
    team1_penalties: null,
    team2_penalties: null,
    isFinished: false,
    winnerId: null,
    statusText: null
  }
}

function getQuarterFinalLabel(index: number) {
  const matchups = ["1º vs 8º", "4º vs 5º", "2º vs 7º", "3º vs 6º"]; 
  return matchups[index] || "TBD vs TBD";
}

function getSemiLabel(index: number) {
  const matchups = ["Ganador C1 vs Ganador C2", "Ganador C3 vs Ganador C4"];
  return matchups[index] || "TBD vs TBD";
}