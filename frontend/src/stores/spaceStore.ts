import { create } from 'zustand'
import * as spacesApi from '../api/spaces'
import { useAuthStore } from './authStore'
import type { Space, SpacePayload } from '../types'

interface SpaceState {
  spaces: Space[]
  loading: boolean
  error: string | null
  fetchSpaces: () => Promise<void>
  createSpace: (payload: SpacePayload) => Promise<void>
  updateSpace: (id: number, payload: Partial<SpacePayload>) => Promise<void>
  deleteSpace: (id: number) => Promise<void>
  addMembers: (spaceId: number, userIds: number[]) => Promise<void>
  clearError: () => void
}

function requireToken() {
  const token = useAuthStore.getState().token
  if (!token) throw new Error('Not authenticated')
  return token
}

export const useSpaceStore = create<SpaceState>((set, get) => ({
  spaces: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchSpaces: async () => {
    set({ loading: true, error: null })
    try {
      const spaces = await spacesApi.listSpaces(requireToken())
      set({ spaces, loading: false })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load spaces',
      })
    }
  },

  createSpace: async (payload) => {
    set({ loading: true, error: null })
    try {
      const space = await spacesApi.createSpace(requireToken(), payload)
      set({ spaces: [space, ...get().spaces], loading: false })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to create space',
      })
      throw err
    }
  },

  updateSpace: async (id, payload) => {
    set({ loading: true, error: null })
    try {
      const updated = await spacesApi.updateSpace(requireToken(), id, payload)
      set({
        spaces: get().spaces.map((s) => (s.id === id ? updated : s)),
        loading: false,
      })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to update space',
      })
      throw err
    }
  },

  deleteSpace: async (id) => {
    set({ loading: true, error: null })
    try {
      await spacesApi.deleteSpace(requireToken(), id)
      set({ spaces: get().spaces.filter((s) => s.id !== id), loading: false })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to delete space',
      })
      throw err
    }
  },

  addMembers: async (spaceId, userIds) => {
    set({ loading: true, error: null })
    try {
      const updated = await spacesApi.addSpaceMembers(requireToken(), spaceId, userIds)
      set({
        spaces: get().spaces.map((space) => (space.id === spaceId ? updated : space)),
        loading: false,
      })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to add members',
      })
      throw err
    }
  },
}))
