'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError(null)
  
  const supabase = createClient()
  
  const cleanEmail = email.trim()
  
  const { data, error: authError } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        display_name: displayName.trim(),
      }
    }
  })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      if (data?.user?.identities?.length === 0) {
        setError('Este email ya está registrado.')
        setLoading(false)
      } else {
        setSuccess(true)
        setLoading(false)
      }
    }
  }

  return (
    <div className="relative w-full min-h-screen -mt-10 flex items-center justify-center p-4 overflow-hidden">
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
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E1E1E] tracking-tight">Crear Cuenta</h2>
          <p className="text-sm font-semibold text-[#011A38] mt-2">Sumate al Prode</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100/80 border border-red-400 text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-100/80 border border-green-400 text-green-800 text-sm font-bold">
              ¡Registro exitoso! Revisá tu correo para confirmar tu cuenta.
            </div>
            <Link href="/login" className="block w-full border border-[#011A38] text-[#011A38] p-3 text-sm uppercase tracking-wider font-bold hover:bg-white/50 transition-colors">
              Ir al Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-[#1E1E1E] mb-2">Nombre de usuario</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Juan Perez"
                className="w-full bg-white/60 border border-white p-3 text-[#1E1E1E] focus:outline-none focus:bg-white/80 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-[#1E1E1E] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/60 border border-white p-3 text-[#1E1E1E] focus:outline-none focus:bg-white/80 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-[#1E1E1E] mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Registrando...' : 'Registrarme'}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-6 text-center text-sm font-medium text-[#1E1E1E]">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-[#011A38] hover:underline font-bold">
              Ingresá acá
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}