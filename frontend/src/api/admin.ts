import { apiRequest } from './client'
import type { InviteCreatePayload, InviteCreateResult, InviteRecord, Space, User } from '../types'

export type AdminMember = Pick<
  User,
  'id' | 'email' | 'full_name' | 'job_role' | 'role' | 'created_at'
> & {
  avatar_url?: string | null
}

export interface AdminOverview {
  users: AdminMember[]
  spaces: Space[]
}

export function getOverview(token: string) {
  return apiRequest<AdminOverview>('/admin/overview', { token })
}

export function listInvites(token: string) {
  return apiRequest<InviteRecord[]>('/admin/invites', { token })
}

export function createInvite(token: string, payload: InviteCreatePayload) {
  return apiRequest<InviteCreateResult>('/admin/invites', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function revokeInvite(token: string, inviteId: number) {
  return apiRequest<InviteRecord>(`/admin/invites/${inviteId}/revoke`, {
    method: 'POST',
    token,
  })
}

export function updateUser(
  token: string,
  userId: number,
  payload: { full_name?: string | null; job_role?: string | null },
) {
  return apiRequest<AdminMember>(`/admin/users/${userId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function revokeUserAccess(token: string, userId: number) {
  return apiRequest<void>(`/admin/users/${userId}`, {
    method: 'DELETE',
    token,
  })
}
