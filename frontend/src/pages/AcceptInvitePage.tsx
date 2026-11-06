import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { FiMail } from 'react-icons/fi'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import * as invitesApi from '../api/invites'
import { Alert, AuthCard, Button, FormSkeleton, Input } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import type { InvitePublic } from '../types'

function InviteIcon() {
  return <FiMail size={20} aria-hidden />
}

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const authToken = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)

  const [invite, setInvite] = useState<InvitePublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    invitesApi
      .getInvite(token)
      .then(setInvite)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Invite not found')
      })
      .finally(() => setLoading(false))
  }, [token])

  if (authToken) return <Navigate to="/app" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !invite) return
    setSubmitting(true)
    setError(null)
    try {
      await invitesApi.acceptInvite(token, {
        password,
        full_name: fullName || undefined,
      })
      await login(invite.email, password)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      icon={<InviteIcon />}
      title="Accept invite"
      subtitle={
        invite
          ? `Join ${invite.company_name} and set your password`
          : 'Preparing your invitation'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent">
            Sign in
          </Link>
        </>
      }
    >
      {loading ? <FormSkeleton fields={3} /> : null}
      {error ? <Alert className="mb-4">{error}</Alert> : null}

      {invite && invite.status === 'pending' ? (
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Input id="invite-email" label="Email" value={invite.email} disabled />
          <Input
            id="invite-name"
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            id="invite-password"
            type="password"
            label="Create password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Join workspace'}
          </Button>
        </form>
      ) : null}

      {invite && invite.status !== 'pending' ? (
        <p className="text-sm text-muted">
          This invite is {invite.status}. Please{' '}
          <Link to="/login" className="font-semibold text-accent">
            sign in
          </Link>
          .
        </p>
      ) : null}
    </AuthCard>
  )
}
