'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordView() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 3000)
    }
  }

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center p-4 overflow-hidden">
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

      <div className="animate-fade-up w-full max-w-md border border-white bg-white/40 backdrop-blur-sm p-8 shadow-xs" style={{ animationDelay: '100ms' }}>
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight">Nueva Contraseña</h2>
          <p className="text-sm font-semibold text-[#011A38] mt-2">Ingresá tu nueva clave de acceso</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100/80 border border-red-400 text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-100/80 border border-green-400 text-green-800 text-sm font-bold">
              ¡Contraseña actualizada con éxito! Redirigiendo al inicio...
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-[#1E1E1E] mb-2">Nueva Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/60 border border-white p-3 text-[#1E1E1E] focus:outline-none focus:bg-white/80 transition-colors"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-[#1E1E1E] mb-2">Confirmar Contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/60 border border-white p-3 text-[#1E1E1E] focus:outline-none focus:bg-white/80 transition-colors"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-l from-[#070128] to-[#011A38] text-white p-3 text-sm uppercase tracking-wider font-bold hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
            >
              {loading ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}