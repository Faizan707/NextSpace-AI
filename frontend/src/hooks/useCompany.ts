import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as companiesApi from '../api/companies'
import { queryKeys } from '../lib/queryKeys'
import { useAuthStore } from '../stores/authStore'
import type { CompanyUpdatePayload } from '../types'
import { requireToken, useAuthToken } from './useAuthToken'

export function useCompanyQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.company.me,
    enabled: Boolean(token),
    queryFn: () => companiesApi.getMyCompany(requireToken(token)),
  })
}

export function useCompanyMembersQuery(enabled = true) {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.company.members,
    enabled: Boolean(token) && enabled,
    queryFn: () => companiesApi.listCompanyMembers(requireToken(token)),
  })
}

export function useUpdateCompanyMutation() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      companyId,
      payload,
    }: {
      companyId: number
      payload: CompanyUpdatePayload
    }) => companiesApi.updateCompany(requireToken(token), companyId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.company.me, updated)
      const user = useAuthStore.getState().user
      if (user) {
        useAuthStore.setState({ user: { ...user, company: updated } })
      }
    },
  })
}
