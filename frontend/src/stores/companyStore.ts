import { create } from 'zustand'
import * as companiesApi from '../api/companies'
import { useAuthStore } from './authStore'
import type { Company, CompanyUpdatePayload } from '../types'

interface CompanyState {
  company: Company | null
  loading: boolean
  error: string | null
  fetchCompany: () => Promise<void>
  updateCompany: (payload: CompanyUpdatePayload) => Promise<void>
  clearError: () => void
}

function requireToken() {
  const token = useAuthStore.getState().token
  if (!token) throw new Error('Not authenticated')
  return token
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  company: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchCompany: async () => {
    set({ loading: true, error: null })
    try {
      const company = await companiesApi.getMyCompany(requireToken())
      set({ company, loading: false })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load company',
      })
    }
  },

  updateCompany: async (payload) => {
    const company = get().company
    if (!company) throw new Error('No company loaded')
    set({ loading: true, error: null })
    try {
      const updated = await companiesApi.updateCompany(requireToken(), company.id, payload)
      set({ company: updated, loading: false })
      const user = useAuthStore.getState().user
      if (user) {
        useAuthStore.setState({ user: { ...user, company: updated } })
      }
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to update company',
      })
      throw err
    }
  },
}))
