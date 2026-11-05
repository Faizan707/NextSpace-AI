import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Alert, AuthCard, Button, Input } from '../components/ui'
import { useAuthStore } from '../stores/authStore'

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 10V8.25a4.5 4.5 0 0 1 9 0V10h1.25A1.75 1.75 0 0 1 19.5 11.75v7A1.75 1.75 0 0 1 17.75 20.5h-11.5A1.75 1.75 0 0 1 4.5 18.75v-7A1.75 1.75 0 0 1 6.25 10H7.5Zm1.75 0h5.5V8.25a2.75 2.75 0 0 0-5.5 0V10Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const login = useAuthStore((s) => s.login)
  const clearError = useAuthStore((s) => s.clearError)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (token) return <Navigate to="/app" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearError()
    try {
      await login(email, password)
      navigate('/app')
    } catch {
      /* store holds message */
    }
  }

  return (
    <AuthCard
      icon={<LockIcon />}
      title="Welcome back"
      subtitle="Sign in to continue to your company workspace"
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-accent">
            Create a workspace
          </Link>
        </>
      }
    >
      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <form className="grid gap-4" onSubmit={onSubmit}>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="username"
          spellCheck={false}
          required
          enterKeyHint="next"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
        <Input
          id="current-password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          minLength={8}
          enterKeyHint="done"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" className="mt-1 w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  )
}
