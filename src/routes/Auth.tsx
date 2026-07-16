import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Briefcase, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSessionStore } from '@/stores/useSessionStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

type Mode = 'signin' | 'signup'

export function Auth() {
  const session = useSessionStore((s) => s.session)
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      // Only reachable if mailer_autoconfirm gets turned off.
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
        // Microsoft returns no email without this scope, which would break the
        // handle_new_user trigger's profile insert.
        scopes: provider === 'azure' ? 'email openid profile' : undefined,
      },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Briefcase className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">ApplyHQ</h1>
          <p className="text-sm text-muted-foreground">Track every application in one place.</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => oauth('google')}>
            Continue with Google
          </Button>
          <Button variant="outline" onClick={() => oauth('azure')}>
            Continue with Microsoft
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {notice && <p className="text-xs text-muted-foreground">{notice}</p>}

          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
          }}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === 'signin'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
