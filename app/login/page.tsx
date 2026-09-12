'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const supabase = createClient()
    
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
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
          <h2 className="text-2xl md:text-3xl font-bold text-[#1e1e1e] tracking-tight">Iniciar Sesión</h2>
          <p className="text-sm font-semibold text-[#043AB7] mt-2">Ingresá para cargar tus pronósticos</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100/80 border border-red-400 text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-[#1e1e1e] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/60 border border-white p-3 text-[#1e1e1e] focus:outline-none focus:bg-white/80 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-[#1e1e1e] mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/60 border border-white p-3 text-[#1e1e1e] focus:outline-none focus:bg-white/80 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-l from-[#2980FF] to-[#043AB7] text-white p-3 text-sm uppercase tracking-wider font-bold hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
          >
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm font-medium text-[#1e1e1e]">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-[#043AB7] hover:underline font-bold">
            Registrate acá
          </Link>
        </div>
      </div>
    </div>
  )
}