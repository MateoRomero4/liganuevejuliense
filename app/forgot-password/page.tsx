'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordView() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const supabase = createClient()
    
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (authError) {
      setError(authError.message)
    } else {
      setSuccess(true)
    }
    
    setLoading(false)
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
          <h2 className="text-2xl md:text-3xl font-bold text-[#1e1e1e] tracking-tight">Recuperar Contraseña</h2>
          <p className="text-sm font-semibold text-[#043AB7] mt-2">Ingresá tu email para recibir un enlace de recuperación</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100/80 border border-red-400 text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-100/80 border border-green-400 text-green-800 text-sm font-bold">
              Si el email está registrado, recibirás un enlace para cambiar tu contraseña en los próximos minutos.
            </div>
            <Link href="/login" className="block w-full border border-[#043AB7] text-[#043AB7] p-3 text-sm uppercase tracking-wider font-bold hover:bg-white/50 transition-colors">
              Volver al Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-l from-[#2980FF] to-[#043AB7] text-white p-3 text-sm uppercase tracking-wider font-bold hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-6 text-center text-sm font-medium text-[#1e1e1e]">
            <Link href="/login" className="text-[#043AB7] hover:underline font-bold">
              ← Volver al Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}