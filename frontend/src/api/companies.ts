import { apiRequest } from './client'
import type { Company, CompanyMember, CompanyUpdatePayload } from '../types'

export function getMyCompany(token: string) {
  return apiRequest<Company>('/companies/me', { token })
}

export function listCompanyMembers(token: string) {
  return apiRequest<CompanyMember[]>('/companies/me/members', { token })
}

export function updateCompany(token: string, companyId: number, payload: CompanyUpdatePayload) {
  return apiRequest<Company>(`/companies/${companyId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}
