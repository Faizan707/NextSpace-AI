import { apiRequest } from './client'
import type { WorkDashboard, WorkProject, WorkTask } from '../types'

export function listWorkProjects(token: string) {
  return apiRequest<WorkProject[]>('/work/projects', { token })
}

export function listWorkTasks(token: string) {
  return apiRequest<WorkTask[]>('/work/tasks', { token })
}

export function getWorkDashboard(token: string) {
  return apiRequest<WorkDashboard>('/work/dashboard', { token })
}
