import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setUnauthorizedHandler } from '../api/client'
import * as authApi from '../api/auth'
import type { RegisterPayload, User } from '../types'

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,

      clearError: () => set({ error: null }),

      logout: () => set({ token: null, user: null, error: null }),

      login: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const { access_token } = await authApi.login(email, password)
          const user = await authApi.getMe(access_token)
          set({ token: access_token, user, loading: false })
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          })
          throw err
        }
      },

      register: async (payload) => {
        set({ loading: true, error: null })
        try {
          await authApi.register(payload)
          const { access_token } = await authApi.login(payload.email, payload.password)
          const user = await authApi.getMe(access_token)
          set({ token: access_token, user, loading: false })
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : 'Registration failed',
          })
          throw err
        }
      },

      fetchMe: async () => {
        const token = get().token
        if (!token) return
        set({ loading: true, error: null })
        try {
          const user = await authApi.getMe(token)
          set({ user, loading: false })
        } catch {
          set({ token: null, user: null, loading: false })
        }
      },
    }),
    {
      name: 'nextspace-auth',
      partialize: (state) => ({ token: state.token }),
    },
  ),
)

setUnauthorizedHandler(() => {
  useAuthStore.getState().logout()
})
