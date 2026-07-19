import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSessionStore } from '@/stores/useSessionStore'
import { LogoMark } from '@/components/brand/Logo'
import { cn } from '@/lib/utils'

type Mode = 'signin' | 'signup'

/**
 * Split-screen auth, matching the TalentPulse login reference: kinetic red
 * gradient brand panel on the left (desktop), form on near-black on the right.
 *
 * Providers are Google + Microsoft (the two enabled on the project). The
 * reference shows LinkedIn; it isn't wired because it isn't enabled in Supabase.
 */
export function Auth() {
  const session = useSessionStore((s) => s.session)
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (session) return <Navigate to="/board" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    const fn = mode === 'signin' ? supabase.auth.signInWithPassword : supabase.auth.signUp
    const { data, error } = await fn.call(supabase.auth, { email, password })

    if (error) setError(error.message)
    else if (mode === 'signup' && !data.session) {
      setNotice('Check your email to confirm your account.')
    }
    setBusy(false)
  }

  async function oauth(provider: 'google' | 'azure') {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/board`,
        scopes: provider === 'azure' ? 'email openid profile' : undefined,
      },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="flex min-h-svh bg-[#0e0e0e] text-foreground">
      {/* Left — brand experience */}
      <div className="kinetic-gradient relative hidden flex-1 items-center justify-center overflow-hidden p-12 md:flex">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/30" />

        {/* Concentric rings, bottom-right, echoing the reference graphic. */}
        <svg
          className="absolute -bottom-24 -right-24 opacity-30"
          width="400"
          height="400"
          viewBox="0 0 400 400"
          fill="none"
          aria-hidden
        >
          <circle cx="200" cy="200" r="199" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
          <circle
            cx="200"
            cy="200"
            r="150"
            stroke="white"
            strokeDasharray="8 8"
            strokeOpacity="0.3"
            strokeWidth="2"
          />
          <circle cx="200" cy="200" r="100" stroke="white" strokeOpacity="0.4" strokeWidth="2" />
        </svg>

        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-8 inline-flex size-24 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
            <LogoMark className="size-12 text-white" />
          </div>
          <h1 className="font-heading mb-6 text-5xl font-bold leading-tight text-white">
            Your journey
            <br />
            starts here.
          </h1>
          <p className="text-lg text-white/80">
            Track every application, tailor every resume, and never get ghosted without knowing.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="relative z-20 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center bg-[#0e0e0e] p-8 md:p-12">
        {/* Mobile logo */}
        <div className="mb-12 flex items-center gap-3 md:hidden">
          <div className="grid size-10 place-items-center rounded-lg bg-coral">
            <LogoMark className="size-6 text-white" />
          </div>
          <span className="font-heading text-xl font-bold">TalentPulse</span>
        </div>

        <div className="mb-10">
          <h2 className="font-heading mb-2 text-3xl font-semibold">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'signin'
              ? 'Sign in to access your dashboard.'
              : 'Start tracking applications in minutes.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold tracking-wide text-muted-foreground"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] py-3 pl-12 pr-4 text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-indigo focus:ring-2 focus:ring-indigo/50"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-semibold tracking-wide text-muted-foreground"
              >
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() =>
                    setNotice('Password reset is coming soon — contact support for now.')
                  }
                  className="text-xs font-medium text-indigo-light transition-colors hover:text-white"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] py-3 pl-12 pr-12 text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-indigo focus:ring-2 focus:ring-indigo/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-coral py-4 text-sm font-semibold tracking-wide text-white shadow-[0_0_15px_rgba(164,2,23,0.3)] transition-colors hover:bg-coral/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
            {!busy && <ArrowRight className="size-4" />}
          </button>
        </form>

        <div className="my-8 flex items-center before:flex-1 before:border-t before:border-white/10 after:flex-1 after:border-t after:border-white/10">
          <span className="px-4 text-xs uppercase tracking-wider text-muted-foreground">
            Or continue with
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SocialButton label="Google" onClick={() => oauth('google')}>
            <GoogleGlyph />
          </SocialButton>
          <SocialButton label="Microsoft" onClick={() => oauth('azure')}>
            <MicrosoftGlyph />
          </SocialButton>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setNotice(null)
            }}
            className="ml-1 font-semibold text-indigo-light transition-colors hover:text-white"
          >
            {mode === 'signin' ? 'Join Now' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

function SocialButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-[#1c1b1b] px-4 py-3',
        'text-sm font-medium transition-colors hover:bg-[#201f1f]',
      )}
    >
      {children}
      {label}
    </button>
  )
}

function GoogleGlyph() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.73-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.48l2.63-2.53C16.9 3.4 14.66 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 12S6.9 21.6 12 21.6c5.9 0 9.8-4.15 9.8-9.99 0-.67-.07-1.18-.16-1.41H12z"
      />
    </svg>
  )
}

function MicrosoftGlyph() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  )
}
