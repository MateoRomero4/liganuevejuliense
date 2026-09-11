'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import Link from 'next/link'

import Image from "next/image";

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

type MatchWithTeams = Match & {
  home_team: Team | null
  away_team: Team | null
}

export default function AdministrateView() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  const [currentInstance, setCurrentInstance] = useState<number | string>(1)
  const [availableInstances, setAvailableInstances] = useState<(number | string)[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})

  const videoRef = useRef<HTMLVideoElement | null>(null)

  const loadData = async () => {
    try {
      const supabase = createClient()
      
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', authData.user.id)
          .single() as { data: { is_admin: boolean } | null };
        
        if (profile && profile.is_admin) {
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }

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

      const [matchesRes, teamsRes] = await Promise.all([
        fetchMatchesPromise,
        fetchTeamsPromise,
        minimumLoadTimePromise
      ])

      if (matchesRes.error) throw matchesRes.error
      if (teamsRes.error) throw teamsRes.error

      const fetchedMatches = (matchesRes.data as MatchWithTeams[]) || []
      setMatches(fetchedMatches)
      setTeams(teamsRes.data as Team[] || [])

      const fasesNumericas = Array.from(
        new Set(
          fetchedMatches
            .map(m => m.fase)
            .filter((fase): fase is number => fase >= 1 && fase <= 11)
        )
      ).sort((a, b) => a - b)

      const playoffs = fetchedMatches.filter(
        m => !!m.round_name && m.fase > 11
      )

      const playoffsNombres: string[] = []

      playoffs.forEach(match => {
        if (
          match.round_name &&
          !playoffsNombres.includes(match.round_name)
        ) {
          playoffsNombres.push(match.round_name)
        }
      })

      const todasLasInstancias: (number | string)[] = [
        ...fasesNumericas,
        ...playoffsNombres
      ]

      setAvailableInstances(todasLasInstancias)

      const activeMatch = fetchedMatches.find(
        m => m.status === 'pending'
      )

      if (activeMatch) {
        if (activeMatch.fase >= 1 && activeMatch.fase <= 11) {
          setCurrentInstance(activeMatch.fase)
        } else if (activeMatch.round_name) {
          setCurrentInstance(activeMatch.round_name)
        }
      } else if (todasLasInstancias.length > 0) {
        setCurrentInstance(todasLasInstancias[todasLasInstancias.length - 1])
      }

    } catch (err: any) {
      console.error(err)
      setError(`Error al cargar datos: ${err.message}`)
    } finally {
      setIsFadingOut(true)
      setTimeout(() => setLoading(false), 500)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 2.0
    }
  }, [loading])

const handleOpenModal = (match?: MatchWithTeams) => {
    if (match) {
      setFormData({
        id: match.id,
        fase: match.fase,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        kickoff: new Date(match.kickoff).toISOString().slice(0, 16),
        status: match.status,
        home_goals: match.home_goals,
        away_goals: match.away_goals,
        home_penalties: match.home_penalties,
        away_penalties: match.away_penalties,
        round_name: match.round_name,
        leg: match.leg,
        aggregate_tie_id: match.aggregate_tie_id
      })
    } else {
      setFormData({
        fase: typeof currentInstance === 'number'
          ? currentInstance
          : 11,
        kickoff: new Date().toISOString().slice(0, 16),
        status: 'pending',
        leg: 1
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      
      const payload = {
        fase: formData.fase,
        home_team_id: formData.home_team_id || null,
        away_team_id: formData.away_team_id || null,
        kickoff: new Date(formData.kickoff as string).toISOString(),
        status: formData.status,
        home_goals: formData.home_goals === '' ? null : formData.home_goals,
        away_goals: formData.away_goals === '' ? null : formData.away_goals,
        home_penalties: formData.home_penalties === '' ? null : formData.home_penalties,
        away_penalties: formData.away_penalties === '' ? null : formData.away_penalties,
        round_name: formData.round_name || null,
        leg: formData.leg || null,
        aggregate_tie_id: formData.aggregate_tie_id || null
      }

if (formData.id) {
        // @ts-ignore
        const { error } = await supabase.from('matches').update(payload).eq('id', formData.id)
        if (error) throw error
      } else {
        // @ts-ignore
        const { error } = await supabase.from('matches').insert([payload])
        if (error) throw error
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handlePrevInstance = () => {
    const currentIndex = availableInstances.indexOf(currentInstance)

    if (currentIndex > 0) {
      setCurrentInstance(availableInstances[currentIndex - 1])
    }
  }

  const handleNextInstance = () => {
    const currentIndex = availableInstances.indexOf(currentInstance)

    if (currentIndex < availableInstances.length - 1) {
      setCurrentInstance(availableInstances[currentIndex + 1])
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
          className="w-24 h-24 md:w-48 md:h-48 object-contain opacity-20            -mt-50
              md:-mt-50" 
        />
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Denegado</h2>
        <p className="mb-4">No tenés permisos de administrador para ver esta página.</p>
        <Link href="/" className="bg-[#011A38] text-white px-6 py-2 font-bold uppercase">Volver al inicio</Link>
      </div>
    )
  }

  const matchesToShow = matches.filter(m =>
    typeof currentInstance === 'number'
      ? m.fase === currentInstance
      : m.round_name === currentInstance
  )

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
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
      

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8">

        <div className="animate-fade-up mb-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ animationDelay: '100ms' }}>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#1E1E1E]">
            Administración
          </h1>
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-linear-to-l from-[#070128] to-[#011A38] border border-[#ffffff] backdrop-blur-sm text-white px-4 py-2 font-medium uppercase tracking-wider transition-colors w-full md:w-auto"
          >
            Cargar Partido
          </button>
        </div>

        <div
          className="animate-fade-up flex justify-center items-center gap-4 md:gap-8 mb-8"
          style={{ animationDelay: '200ms' }}
        >
          <button
            onClick={handlePrevInstance}
            disabled={
              availableInstances.length === 0 ||
              currentInstance === availableInstances[0]
            }
            className="px-4 py-2 md:px-6 md:py-3 text-sm md:text-base text-[#1E1E1E] font-bold tracking-wide hover:opacity-70 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
          >
            Anterior
          </button>

          <span className="font-black text-lg md:text-2xl text-[#1E1E1E] min-w-[120px] text-center border-b-2 border-[#1E1E1E] pb-1 uppercase tracking-wider">
            {typeof currentInstance === 'number'
              ? `Fecha ${currentInstance}`
              : currentInstance}
          </span>

          <button
            onClick={handleNextInstance}
            disabled={
              availableInstances.length === 0 ||
              currentInstance === availableInstances[availableInstances.length - 1]
            }
            className="px-4 py-2 md:px-6 md:py-3 text-sm md:text-base text-[#1E1E1E] font-bold tracking-wide hover:opacity-70 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300"
          >
            Siguiente
          </button>
        </div>

        <div className="animate-fade-up w-full border border-white overflow-hidden shadow-xs bg-white/60 backdrop-blur-md" style={{ animationDelay: '300ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
              <thead>
                <tr className="bg-linear-to-l from-[#070128] to-[#011A38] text-white text-[10px] md:text-xs uppercase tracking-wider font-bold">
                  <th className="p-3 md:p-4 border-b border-white">ID</th>
                  <th className="p-3 md:p-4 border-b border-white">Fecha y Hora</th>
                  <th className="p-3 md:p-4 border-b border-white">Partido</th>
                  <th className="p-3 md:p-4 border-b border-white text-center">Instancia</th>
                  <th className="p-3 md:p-4 border-b border-white text-center">Estado</th>
                  <th className="p-3 md:p-4 border-b border-white text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {matchesToShow.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">No hay partidos en esta fase.</td>
                  </tr>
                ) : (
                  
                  matchesToShow.map((match, idx) => (
                    
                    <tr key={match.id} className={`border-b border-white/50 transition-colors ${idx % 2 !== 0 ? 'bg-white/30' : 'bg-transparent'} hover:bg-gray-100/50`}>
                      <td className="p-3 text-xs text-gray-500 font-mono">#{match.id}</td>
                      <td className="p-3 text-sm font-semibold text-gray-800">
                        {new Date(match.kickoff).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-3 font-bold text-gray-900 text-sm md:text-base">
                        <div className="flex items-center gap-2">
                          
                          {match.home_team ? (
                            <img 
                              src={`/assets/escudos_monocromaticos/${match.home_team.badge_svg}`} 
                              alt={match.home_team.name}
                              className="w-12 h-12 object-contain transition-all duration-500 opacity-80"
                            />
                          ) : (
                            <span className="w-12 h-12 flex items-center justify-center font-bold text-gray-400 text-sm">N/A</span>
                          )}

                          <span className=" text-[#1E1E1E] px-2 py-0.5 rounded text-xl">
                            {match.home_goals ?? '-'} : {match.away_goals ?? '-'}
                          </span>

                          {match.away_team ? (
                            <img 
                              src={`/assets/escudos_monocromaticos/${match.away_team.badge_svg}`} 
                              alt={match.away_team.name}
                              className="w-12 h-12 object-contain transition-all duration-500 opacity-80"
                            />
                          ) : (
                            <span className="w-12 h-12 flex items-center justify-center font-bold text-gray-400 text-sm">N/A</span>
                          )}

                        </div>
                      </td>
                      <td className="p-3 text-center text-md font-bold text-[#1E1E1E]">
                        {match.round_name ? `${match.round_name} (L${match.leg})` : `Fase ${match.fase}`}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-MD px-2 py-1 font-bold ${match.status === 'finished' ? 'text-green-500' : 'text-[#1E1E1E]'}`}>
                          {match.status === 'finished' ? 'Finalizado' : match.status === 'pending' ? 'Pendiente' : match.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleOpenModal(match)}
                          className="text-xs rounded-full border border-[#1E1E1E] text-[#1E1E1E] px-3 py-1 font-bold uppercase transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white/95 border border-white/50 shadow-2xl w-full max-w-2xl p-6 relative animate-fade-up mt-10 mb-10">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black font-black text-xl">✕</button>
            
            <h2 className="text-2xl font-black uppercase text-[#011A38] mb-6 border-b-2 border-[#011A38] pb-2">
              {formData.id ? `Editar Partido #${formData.id}` : 'Crear Nuevo Partido'}
            </h2>

            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fase / Fecha</label>
                  <input type="number" required value={formData.fase || ''} onChange={e => setFormData({...formData, fase: parseInt(e.target.value)})} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-[#011A38] outline-hidden" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fecha y Hora (Kickoff)</label>
                  <input type="datetime-local" required value={formData.kickoff || ''} onChange={e => setFormData({...formData, kickoff: e.target.value})} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-[#011A38] outline-hidden" />
                </div>
              </div>

              <div className="bg-gray-100/50 p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-6 items-center">
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Local</label>
                      <select value={formData.home_team_id || ''} onChange={e => setFormData({...formData, home_team_id: e.target.value ? parseInt(e.target.value) : null})} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-[#011A38] outline-hidden bg-white">
                        <option value="">TBD (Por Definir)</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Goles</label>
                        <input type="number" placeholder="-" value={formData.home_goals ?? ''} onChange={e => setFormData({...formData, home_goals: e.target.value ? parseInt(e.target.value) : null})} className="w-full border-2 border-gray-300 p-2 text-center text-xl font-black focus:border-[#011A38] outline-hidden" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Penales</label>
                        <input type="number" placeholder="-" value={formData.home_penalties ?? ''} onChange={e => setFormData({...formData, home_penalties: e.target.value ? parseInt(e.target.value) : null})} className="w-full border-2 border-gray-300 p-2 text-center text-xl font-bold text-gray-500 focus:border-[#011A38] outline-hidden" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Visitante</label>
                      <select value={formData.away_team_id || ''} onChange={e => setFormData({...formData, away_team_id: e.target.value ? parseInt(e.target.value) : null})} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-[#011A38] outline-hidden bg-white">
                        <option value="">TBD (Por Definir)</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Goles</label>
                        <input type="number" placeholder="-" value={formData.away_goals ?? ''} onChange={e => setFormData({...formData, away_goals: e.target.value ? parseInt(e.target.value) : null})} className="w-full border-2 border-gray-300 p-2 text-center text-xl font-black focus:border-[#011A38] outline-hidden" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Penales</label>
                        <input type="number" placeholder="-" value={formData.away_penalties ?? ''} onChange={e => setFormData({...formData, away_penalties: e.target.value ? parseInt(e.target.value) : null})} className="w-full border-2 border-gray-300 p-2 text-center text-xl font-bold text-gray-500 focus:border-[#011A38] outline-hidden" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
{/**
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 border border-gray-200">
                <div className="md:col-span-4 border-b border-gray-200 pb-2 mb-2">
                  <h3 className="text-xs font-black uppercase text-[#011A38]">Configuración de Playoffs</h3>
                  <p className="text-[10px] text-gray-500">Completar solo si es un partido de fase final.</p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Instancia (Ej: Semifinal)</label>
                  <input type="text" placeholder="Dejar vacío si es regular" value={formData.round_name || ''} onChange={e => setFormData({...formData, round_name: e.target.value})} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-[#011A38] outline-hidden" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Leg (1=Ida)</label>
                  <input type="number" min="1" max="2" value={formData.leg || ''} onChange={e => setFormData({...formData, leg: e.target.value ? parseInt(e.target.value) : null})} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-[#011A38] outline-hidden" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">ID Global (Agrupador)</label>
                  <input type="number" placeholder="Ej: 101" value={formData.aggregate_tie_id || ''} onChange={e => setFormData({...formData, aggregate_tie_id: e.target.value ? parseInt(e.target.value) : null})} className="w-full border-2 border-gray-300 p-2 font-bold focus:border-[#011A38] outline-hidden" />
                </div>
              </div>
 */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-gray-200">
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Estado del Partido</label>
                  <select value={formData.status || 'pending'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border-2 border-gray-300 p-2 font-black uppercase focus:border-[#011A38] outline-hidden bg-white">
                    <option value="pending">Pendiente</option>
                    <option value="live">En Vivo</option>
                    <option value="finished">Finalizado</option>
                  </select>
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 font-bold text-gray-500 uppercase hover:bg-gray-100 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 bg-[#011A38] hover:bg-black text-white px-8 py-3 font-black uppercase tracking-widest transition-colors shadow-md disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}