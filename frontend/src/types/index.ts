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
  job_role: string | null
  role: UserRole
  company_id: number
  company: Company
  created_at: string
}

export interface SpaceCreator {
  id: number
  email: string
  full_name: string | null
  job_role?: string | null
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
  projects_count: number
  teams_count: number
  documents_count: number
  created_at: string
}

export interface CompanyMember {
  id: number
  email: string
  full_name: string | null
  job_role?: string | null
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
  job_role?: string
  send_password: boolean
}

export interface InviteRecord {
  id: number
  email: string
  full_name?: string | null
  job_role?: string | null
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

export type ProjectStatus = 'open' | 'in_progress' | 'completed'

export interface SpaceProject {
  id: number
  space_id: number
  name: string
  description: string | null
  status: ProjectStatus
  progress: number
  deadline: string | null
  created_by_id: number
  created_by: SpaceCreator
  members: SpaceCreator[]
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

export type DocumentComplianceStatus = 'pending' | 'passed' | 'failed' | 'error'

export interface DocumentComplianceFinding {
  severity: 'high' | 'medium' | 'low' | 'info' | string
  code: string
  message: string
}

export interface SpaceDocument {
  id: number
  space_id: number
  original_name: string
  content_type: string | null
  size_bytes: number
  uploaded_by_id: number
  uploaded_by: SpaceCreator
  members?: SpaceCreator[]
  created_at: string
  compliance_status?: DocumentComplianceStatus | string
  compliance_summary?: string | null
  compliance_score?: number | null
  compliance_findings?: DocumentComplianceFinding[]
  compliance_checked_at?: string | null
  compliance_engine?: string | null
}

export type TaskPriority = 'low' | 'medium' | 'high'

export interface ProjectTask {
  id: number
  project_id: number
  stage_id: number
  title: string
  description: string | null
  priority: TaskPriority
  position: number
  assignee_id: number | null
  assignee: SpaceCreator | null
  created_by_id: number
  created_at: string
  updated_at: string
}

export interface TaskDetail extends ProjectTask {
  stage_name: string
  created_by: SpaceCreator
}

export interface TaskComment {
  id: number
  task_id: number
  author_id: number
  author: SpaceCreator
  parent_id: number | null
  body: string
  mention_ids: number[]
  mentions: SpaceCreator[]
  replies: TaskComment[]
  created_at: string
  updated_at: string
}

export interface TaskAttachment {
  id: number
  task_id: number
  original_name: string
  content_type: string | null
  size_bytes: number
  uploaded_by_id: number
  uploaded_by: SpaceCreator
  created_at: string
}

export interface ProjectStage {
  id: number
  project_id: number
  name: string
  position: number
  is_default: boolean
  tasks: ProjectTask[]
  created_at: string
}

export interface ProjectBoard {
  project_id: number
  stages: ProjectStage[]
}

export interface WorkProject extends SpaceProject {
  space_name: string
}

export interface WorkTask {
  id: number
  project_id: number
  project_name: string
  space_id: number
  space_name: string
  stage_id: number
  stage_name: string
  title: string
  description: string | null
  priority: TaskPriority
  position: number
  assignee_id: number | null
  assignee: SpaceCreator | null
  created_by_id: number
  created_by: SpaceCreator
  created_at: string
  updated_at: string
}

export interface DashboardKpis {
  spaces: number
  projects: number
  teams: number
  members: number
  tasks_total: number
  tasks_done: number
  tasks_open: number
  avg_project_progress: number
}

export interface DashboardNamedCount {
  name: string
  value: number
}

export interface DashboardProjectProgress {
  name: string
  space_name: string
  progress: number
}

export interface DashboardTeamPerformance {
  name: string
  space_name: string
  members: number
  assigned_tasks: number
  done_tasks: number
}

export interface DashboardMemberPerformance {
  name: string
  assigned: number
  done: number
  open: number
}

export interface WorkDashboard {
  kpis: DashboardKpis
  tasks_by_priority: DashboardNamedCount[]
  tasks_by_status: DashboardNamedCount[]
  tasks_by_space: DashboardNamedCount[]
  project_progress: DashboardProjectProgress[]
  team_performance: DashboardTeamPerformance[]
  member_performance: DashboardMemberPerformance[]
}

export type NotificationType =
  | 'task_assigned'
  | 'space_added'
  | 'project_added'
  | 'chat_message'

export interface ChatMessage {
  id: number
  conversation_id: number
  sender_id: number
  sender: SpaceCreator
  body: string
  created_at: string
}

export interface Conversation {
  id: number
  company_id: number
  other_user: SpaceCreator
  last_message: ChatMessage | null
  created_at: string
}

export interface AppNotification {
  id: number
  user_id: number
  actor_id: number | null
  actor: SpaceCreator | null
  type: NotificationType | string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}
