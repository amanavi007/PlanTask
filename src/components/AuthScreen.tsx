import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type AuthTab = 'email' | 'magic'

export function AuthScreen() {
  const [tab, setTab] = useState<AuthTab>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmailAuth = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    const action = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })

    const { error } = await action

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    if (mode === 'signup') {
      setMessage('Check your email to confirm your account before logging in.')
    }
  }

  const handleMagicLink = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Magic link sent. Check your email.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-cyan-50 p-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">Canvas Study Planner</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to plan study sessions around assignments.</p>

        <div className="mt-5 flex gap-2 rounded-xl bg-slate-100 p-1">
          <button
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${tab === 'email' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}
            onClick={() => setTab('email')}
            type="button"
          >
            Email/password
          </button>
          <button
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${tab === 'magic' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}
            onClick={() => setTab('magic')}
            type="button"
          >
            Magic link
          </button>
        </div>

        {tab === 'email' ? (
          <form className="mt-5 space-y-3" onSubmit={handleEmailAuth}>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              type="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm ${mode === 'login' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                onClick={() => setMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm ${mode === 'signup' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                onClick={() => setMode('signup')}
              >
                Sign up
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-600 px-3 py-2 font-medium text-white disabled:opacity-70"
            >
              {loading ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        ) : (
          <form className="mt-5 space-y-3" onSubmit={handleMagicLink}>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              type="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-600 px-3 py-2 font-medium text-white disabled:opacity-70"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        )}

        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </div>
    </div>
  )
}
