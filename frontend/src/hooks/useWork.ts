import { useQuery } from '@tanstack/react-query'
import * as workApi from '../api/work'
import { queryKeys } from '../lib/queryKeys'
import { requireToken, useAuthToken } from './useAuthToken'

export function useWorkProjectsQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.work.projects,
    enabled: Boolean(token),
    queryFn: () => workApi.listWorkProjects(requireToken(token)),
  })
}

export function useWorkTasksQuery() {
  const token = useAuthToken()
  return useQuery({
    queryKey: queryKeys.work.tasks,
    enabled: Boolean(token),
    queryFn: () => workApi.listWorkTasks(requireToken(token)),
  })
}
