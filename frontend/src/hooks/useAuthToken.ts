import { useAuthStore } from '../stores/authStore'

export function useAuthToken() {
  return useAuthStore((s) => s.token)
}

export function requireToken(token: string | null): string {
  if (!token) throw new Error('Not authenticated')
  return token
}
