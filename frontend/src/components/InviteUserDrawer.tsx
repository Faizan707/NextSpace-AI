import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Drawer, Input } from './ui'

interface InviteUserDrawerProps {
  open: boolean
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (payload: {
    email: string
    full_name?: string
    send_password: boolean
  }) => Promise<void>
}

export function InviteUserDrawer({
  open,
  submitting,
  error,
  onClose,
  onSubmit,
}: InviteUserDrawerProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [sendPassword, setSendPassword] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setFullName('')
    setSendPassword(false)
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({
      email,
      full_name: fullName || undefined,
      send_password: sendPassword,
    })
  }

  return (
    <Drawer
      open={open}
      eyebrow="Team"
      title="Invite member"
      description="Send an invite with a signup link, or create the account and email a temporary password."
      onClose={onClose}
    >
      <form id="invite-user-form" className="flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
        {error ? <Alert>{error}</Alert> : null}

        <Input
          id="invite-name"
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Optional"
        />
        <Input
          id="invite-email"
          type="email"
          label="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@company.com"
        />

        <div className="grid gap-3">
          <p className="text-sm font-medium text-ink/80">Invite method</p>
          <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line bg-surface-2 px-4 py-3 transition has-checked:border-accent/40 has-checked:bg-accent-soft">
            <input
              type="radio"
              name="invite-method"
              checked={!sendPassword}
              onChange={() => setSendPassword(false)}
              className="mt-1 size-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">Invite link only</span>
              <span className="mt-0.5 block text-xs text-muted">
                They join via email link and choose their own password.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line bg-surface-2 px-4 py-3 transition has-checked:border-accent/40 has-checked:bg-accent-soft">
            <input
              type="radio"
              name="invite-method"
              checked={sendPassword}
              onChange={() => setSendPassword(true)}
              className="mt-1 size-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">
                Create account + email password
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Account is created now and a temporary password is emailed.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-auto flex gap-3 border-t border-line pt-5">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-[1.3]" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send invite'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
