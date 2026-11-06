export const JOB_ROLE_OPTIONS = [
  { value: 'Frontend Engineer', label: 'Frontend Engineer' },
  { value: 'Backend Engineer', label: 'Backend Engineer' },
  { value: 'Full Stack Engineer', label: 'Full Stack Engineer' },
  { value: 'UI/UX Designer', label: 'UI/UX Designer' },
  { value: 'Product Manager', label: 'Product Manager' },
  { value: 'QA Engineer', label: 'QA Engineer' },
  { value: 'DevOps Engineer', label: 'DevOps Engineer' },
  { value: '__custom__', label: 'Custom…' },
] as const

export const CUSTOM_JOB_ROLE_VALUE = '__custom__'

export function jobRoleSelectValue(jobRole: string) {
  if (!jobRole) return ''
  return JOB_ROLE_OPTIONS.some((option) => option.value === jobRole)
    ? jobRole
    : CUSTOM_JOB_ROLE_VALUE
}
