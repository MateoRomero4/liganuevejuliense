'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row'];
type Match = Database['public']['Tables']['matches']['Row'];
type Prediction = Database['public']['Tables']['predictions']['Row'];

type UserStanding = {
  id: string;
  display_name: string;
  pts: number;
  plenos: number;
  aciertos: number;
}

export default function ProdeView() {
  const [standings, setStandings] = useState<UserStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)

  const [activeRow, setActiveRow] = useState(0)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        
        const minimumLoadTimePromise = new Promise(resolve => setTimeout(resolve, 500));
        
        const fetchProfiles = supabase.from('profiles').select('*')
        const fetchMatches = supabase.from('matches').select('*').not('home_goals', 'is', null).not('away_goals', 'is', null)
        const fetchPredictions = supabase.from('predictions').select('*')

        const [profilesRes, matchesRes, predictionsRes] = await Promise.all([
          fetchProfiles, 
          fetchMatches, 
          fetchPredictions,
          minimumLoadTimePromise
        ]);

const profilesData = (profilesRes.data as Profile[]) || []; 
        const matchesData = (matchesRes.data as Match[]) || [];
        const predictionsData = (predictionsRes.data as Prediction[]) || []; 

        const stats: Record<string, UserStanding> = {}
        profilesData.forEach(p => {
          stats[p.id] = { 
            id: p.id, 
            display_name: p.display_name || p.email.split('@')[0], 
            pts: 0, 
            plenos: 0, 
            aciertos: 0 
          }
        })

        const matchesMap = new Map<number, Match>()
        matchesData.forEach(m => matchesMap.set(m.id, m))

        predictionsData.forEach(pred => {
          const match = matchesMap.get(pred.match_id!)
          if (match && stats[pred.profile_id!]) {
            const hgMatch = match.home_goals!
            const agMatch = match.away_goals!
            const hgPred = pred.home_goals
            const agPred = pred.away_goals

            const matchOutcome = hgMatch > agMatch ? 1 : hgMatch < agMatch ? -1 : 0
            const predOutcome = hgPred > agPred ? 1 : hgPred < agPred ? -1 : 0

            if (hgMatch === hgPred && agMatch === agPred) {
              stats[pred.profile_id!].pts += 3
              stats[pred.profile_id!].plenos++
            } else if (matchOutcome === predOutcome) {
              stats[pred.profile_id!].pts += 1
              stats[pred.profile_id!].aciertos++
            }
          }
        })

        const sorted = Object.values(stats).sort((a, b) => {
          return b.pts - a.pts || b.plenos - a.plenos || (a.display_name > b.display_name ? 1 : -1)
        })
        
        setStandings(sorted)
      } catch (err) {
        console.error("Error cargando tabla del prode:", err)
      } finally {
        setIsFadingOut(true)
        setTimeout(() => {
          setLoading(false)
        }, 500)
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
          className="w-24 h-24 md:w-48 md:h-48 object-contain opacity-20             -mt-100
            md:-mt-50" 
        />
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
          
          <div className="w-full">
            


            <div className="animate-fade-up mb-8 flex flex-col items-center justify-center" style={{ animationDelay: '100ms' }}>
              <h2 className="text-3xl md:text-5xl font-bold text-[#1E1E1E] tracking-tight text-center">Prode</h2>
            </div>

            <div className="w-full border border-white overflow-hidden animate-fade-up shadow-xs bg-white/40 backdrop-blur-sm" style={{ animationDelay: '200ms' }}>
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-linear-to-l from-[#070128] to-[#011A38] text-white text-[10px] md:text-xs uppercase tracking-wider font-bold">
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

        </div>
      </div>
    </div>
  )
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}