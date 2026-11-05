import { apiRequest } from './client'
import type { RegisterPayload, TokenResponse, User } from '../types'

export function register(payload: RegisterPayload) {
  return apiRequest<User>('/auth/register', {
    method: 'POST',
    body: payload,
  })
}

export function login(email: string, password: string) {
  const body = new URLSearchParams()
  body.set('username', email)
  body.set('password', password)
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body,
    form: true,
  })
}

export function getMe(token: string) {
  return apiRequest<User>('/auth/me', { token })
}
