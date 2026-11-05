export type UserRole = 'tenant_owner' | 'member'
export type SpaceType = 'public' | 'specific' | 'private'

export interface Company {
  id: number
  name: string
  employee_count: number
  location: string
  created_at: string
}

export interface User {
  id: number
  email: string
  full_name: string | null
  role: UserRole
  company_id: number
  company: Company
  created_at: string
}

export interface SpaceCreator {
  id: number
  email: string
  full_name: string | null
  avatar_url: string | null
}

export interface Space {
  id: number
  name: string
  description: string | null
  space_type: SpaceType
  company_id: number
  created_by_id: number
  created_by: SpaceCreator
  members: SpaceCreator[]
  created_at: string
}

export interface CompanyMember {
  id: number
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface RegisterPayload {
  email: string
  password: string
  full_name?: string
  company: {
    name: string
    employee_count: number
    location: string
  }
}

export interface SpacePayload {
  name: string
  description?: string | null
  space_type: SpaceType
}

export interface CompanyUpdatePayload {
  name?: string
  employee_count?: number
  location?: string
}

export interface InviteCreatePayload {
  email: string
  full_name?: string
  send_password: boolean
}

export interface InviteRecord {
  id: number
  email: string
  status: string
  send_password: boolean
  company_id: number
  invited_by_id: number
  created_at: string
  accepted_at: string | null
}

export interface InviteCreateResult {
  invite: InviteRecord
  temporary_password: string | null
  invite_link: string | null
}

export interface InvitePublic {
  email: string
  company_name: string
  status: string
}

export interface SpaceProject {
  id: number
  space_id: number
  name: string
  description: string | null
  created_by_id: number
  created_by: SpaceCreator
  created_at: string
}

export interface SpaceTeam {
  id: number
  space_id: number
  name: string
  description: string | null
  created_by_id: number
  created_by: SpaceCreator
  members: SpaceCreator[]
  created_at: string
}

export interface SpaceDocument {
  id: number
  space_id: number
  original_name: string
  content_type: string | null
  size_bytes: number
  uploaded_by_id: number
  uploaded_by: SpaceCreator
  created_at: string
}
