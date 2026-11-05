import { apiRequest } from './client'
import type { InvitePublic, User } from '../types'

export function getInvite(token: string) {
  return apiRequest<InvitePublic>(`/auth/invites/${token}`)
}

export function acceptInvite(token: string, payload: { password: string; full_name?: string }) {
  return apiRequest<User>(`/auth/invites/${token}/accept`, {
    method: 'POST',
    body: payload,
  })
}
