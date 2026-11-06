import { apiRequest } from './client'
import type { WorkProject, WorkTask } from '../types'

export function listWorkProjects(token: string) {
  return apiRequest<WorkProject[]>('/work/projects', { token })
}

export function listWorkTasks(token: string) {
  return apiRequest<WorkTask[]>('/work/tasks', { token })
}
