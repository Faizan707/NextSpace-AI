import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { AdminMember } from '../api/admin'
import { CUSTOM_JOB_ROLE_VALUE, JOB_ROLE_OPTIONS, jobRoleSelectValue } from '../lib/jobRoles'
import { Alert, Button, Drawer, Input, Select } from './ui'

interface EditMemberDrawerProps {
  open: boolean
  member: AdminMember | null
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (payload: { full_name?: string | null; job_role?: string | null }) => Promise<void>
}

export function EditMemberDrawer({
  open,
  member,
  submitting,
  error,
  onClose,
  onSubmit,
}: EditMemberDrawerProps) {
  const [fullName, setFullName] = useState('')
  const [jobRole, setJobRole] = useState('')
  const [customJobRole, setCustomJobRole] = useState('')

  useEffect(() => {
    if (!open || !member) return
    setFullName(member.full_name || '')
    const current = member.job_role || ''
    if (current && !JOB_ROLE_OPTIONS.some((option) => option.value === current)) {
      setJobRole(CUSTOM_JOB_ROLE_VALUE)
      setCustomJobRole(current)
    } else {
      setJobRole(current)
      setCustomJobRole('')
    }
  }, [open, member])

  const selectValue = jobRoleSelectValue(jobRole)
  const showCustom = selectValue === CUSTOM_JOB_ROLE_VALUE

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const resolvedRole =
      selectValue === CUSTOM_JOB_ROLE_VALUE ? customJobRole.trim() : jobRole.trim()
    await onSubmit({
      full_name: fullName.trim() || null,
      job_role: resolvedRole || null,
    })
  }

  return (
    <Drawer
      open={open}
      eyebrow="Team"
      title={member ? `Edit · ${member.full_name || member.email}` : 'Edit member'}
      description="Update name or job role for this teammate."
      onClose={onClose}
    >
      <form className="flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
        {error ? <Alert>{error}</Alert> : null}

        <Input
          id="edit-member-name"
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Optional"
        />

        <Select
          id="edit-member-job-role"
          label="Job role"
          value={selectValue}
          onChange={(value) => {
            if (value === CUSTOM_JOB_ROLE_VALUE) {
              setJobRole(CUSTOM_JOB_ROLE_VALUE)
              return
            }
            setJobRole(value)
            setCustomJobRole('')
          }}
          options={[
            { value: '', label: 'No role set' },
            ...JOB_ROLE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            })),
          ]}
        />
        {showCustom ? (
          <Input
            id="edit-member-job-role-custom"
            label="Custom job role"
            required
            value={customJobRole}
            onChange={(e) => setCustomJobRole(e.target.value)}
            placeholder="e.g. Mobile Engineer"
          />
        ) : null}

        <div className="mt-auto flex gap-3 border-t border-line pt-5">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-[1.3]" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
