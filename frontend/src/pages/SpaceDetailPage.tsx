import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as spacesApi from '../api/spaces'
import { Avatar } from '../components/Avatar'
import { DocumentsSection } from '../components/space/DocumentsSection'
import { ProjectsSection } from '../components/space/ProjectsSection'
import { TeamsSection } from '../components/space/TeamsSection'
import {
  Alert,
  Button,
  DeadlinePicker,
  Drawer,
  Input,
  Select,
  SpaceDetailSkeleton,
  Textarea,
} from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import type { ProjectStatus, Space, SpaceDocument, SpaceProject, SpaceTeam } from '../types'
import { cn } from '../lib/cn'

const PROJECT_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

function deadlineToIso(value: Date | undefined) {
  if (!value) return null
  const date = new Date(value)
  date.setHours(23, 59, 0, 0)
  return date.toISOString()
}

function parseDeadline(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

export function SpaceDetailPage() {
  const { spaceId: spaceIdParam } = useParams<{ spaceId: string }>()
  const spaceId = Number(spaceIdParam)
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const currentUser = useAuthStore((s) => s.user)

  const [space, setSpace] = useState<Space | null>(null)
  const [projects, setProjects] = useState<SpaceProject[]>([])
  const [teams, setTeams] = useState<SpaceTeam[]>([])
  const [documents, setDocuments] = useState<SpaceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [projectOpen, setProjectOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<SpaceProject | null>(null)
  const [teamOpen, setTeamOpen] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  const [membersProject, setMembersProject] = useState<SpaceProject | null>(null)
  const [membersTeam, setMembersTeam] = useState<SpaceTeam | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('open')
  const [projectProgress, setProjectProgress] = useState(0)
  const [projectDeadline, setProjectDeadline] = useState<Date | undefined>(undefined)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set())
  const [projectAddSelected, setProjectAddSelected] = useState<Set<number>>(new Set())
  const [teamAddSelected, setTeamAddSelected] = useState<Set<number>>(new Set())
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  async function loadAll() {
    if (!token || !Number.isFinite(spaceId)) return
    setLoading(true)
    setError(null)
    try {
      const [spaceData, projectData, teamData, documentData] = await Promise.all([
        spacesApi.getSpace(token, spaceId),
        spacesApi.listProjects(token, spaceId),
        spacesApi.listTeams(token, spaceId),
        spacesApi.listDocuments(token, spaceId),
      ])
      setSpace(spaceData)
      setProjects(projectData)
      setTeams(teamData)
      setDocuments(documentData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load space')
      setSpace(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [token, spaceId])

  const selectableMembers = useMemo(
    () => (space?.members || []).filter((member) => member.id !== currentUser?.id),
    [space, currentUser?.id],
  )

  const projectAddCandidates = useMemo(() => {
    if (!membersProject || !space) return []
    const existing = new Set(
      (membersProject.members?.length ? membersProject.members : [membersProject.created_by]).map(
        (member) => member.id,
      ),
    )
    return space.members.filter((member) => !existing.has(member.id))
  }, [membersProject, space])

  const teamAddCandidates = useMemo(() => {
    if (!membersTeam || !space) return []
    const existing = new Set(membersTeam.members.map((member) => member.id))
    return space.members.filter((member) => !existing.has(member.id))
  }, [membersTeam, space])

  function resetProjectForm() {
    setProjectName('')
    setProjectDescription('')
    setProjectStatus('open')
    setProjectProgress(0)
    setProjectDeadline(undefined)
    setEditingProject(null)
  }

  function openCreateProject() {
    resetProjectForm()
    setFormError(null)
    setProjectOpen(true)
  }

  function openEditProject(project: SpaceProject) {
    setEditingProject(project)
    setProjectName(project.name)
    setProjectDescription(project.description || '')
    setProjectStatus(project.status || 'open')
    setProjectProgress(project.progress ?? 0)
    setProjectDeadline(parseDeadline(project.deadline))
    setFormError(null)
    setProjectOpen(true)
  }

  async function handleSaveProject(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: projectName,
        description: projectDescription || null,
        status: projectStatus,
        progress: projectProgress,
        deadline: deadlineToIso(projectDeadline),
      }
      if (editingProject) {
        const updated = await spacesApi.updateProject(token, spaceId, editingProject.id, payload)
        setProjects((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const created = await spacesApi.createProject(token, spaceId, payload)
        setProjects((prev) => [created, ...prev])
      }
      setProjectOpen(false)
      resetProjectForm()
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : editingProject
            ? 'Failed to update project'
            : 'Failed to create project',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddProjectMembers() {
    if (!token || !membersProject || projectAddSelected.size === 0) return
    setSubmitting(true)
    setFormError(null)
    try {
      const updated = await spacesApi.addProjectMembers(
        token,
        spaceId,
        membersProject.id,
        [...projectAddSelected],
      )
      setProjects((prev) => prev.map((project) => (project.id === updated.id ? updated : project)))
      setMembersProject(null)
      setProjectAddSelected(new Set())
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add members')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateTeam(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await spacesApi.createTeam(token, spaceId, {
        name: teamName,
        description: teamDescription || null,
        member_ids: [...selectedMembers],
      })
      setTeams((prev) => [created, ...prev])
      setTeamOpen(false)
      setTeamName('')
      setTeamDescription('')
      setSelectedMembers(new Set())
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUploadDocument(event: FormEvent) {
    event.preventDefault()
    if (!token || !uploadFile) return
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await spacesApi.uploadDocument(token, spaceId, uploadFile)
      setDocuments((prev) => [created, ...prev])
      setDocOpen(false)
      setUploadFile(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddTeamMembers() {
    if (!token || !membersTeam || teamAddSelected.size === 0) return
    setSubmitting(true)
    setFormError(null)
    try {
      const updated = await spacesApi.addTeamMembers(
        token,
        spaceId,
        membersTeam.id,
        [...teamAddSelected],
      )
      setTeams((prev) => prev.map((team) => (team.id === updated.id ? updated : team)))
      setMembersTeam(null)
      setTeamAddSelected(new Set())
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add members')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteProject(project: SpaceProject) {
    if (!token) return
    if (!window.confirm('Delete this project?')) return
    await spacesApi.deleteProject(token, spaceId, project.id)
    setProjects((prev) => prev.filter((item) => item.id !== project.id))
  }

  async function handleDeleteTeam(team: SpaceTeam) {
    if (!token) return
    if (!window.confirm('Delete this team?')) return
    await spacesApi.deleteTeam(token, spaceId, team.id)
    setTeams((prev) => prev.filter((item) => item.id !== team.id))
  }

  async function handleDeleteDocument(document: SpaceDocument) {
    if (!token) return
    if (!window.confirm('Delete this document?')) return
    await spacesApi.deleteDocument(token, spaceId, document.id)
    setDocuments((prev) => prev.filter((item) => item.id !== document.id))
  }

  async function handleDownload(document: SpaceDocument) {
    if (!token) return
    const response = await fetch(spacesApi.documentDownloadUrl(spaceId, document.id), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      setError('Download failed')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = document.original_name
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function toggleMember(userId: number) {
    setSelectedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function toggleProjectAddMember(userId: number) {
    setProjectAddSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function toggleTeamAddMember(userId: number) {
    setTeamAddSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  if (!Number.isFinite(spaceId)) {
    return <Alert>Invalid space.</Alert>
  }

  if (loading && !space) {
    return <SpaceDetailSkeleton />
  }

  if (!space) {
    return (
      <div className="space-y-4">
        {error ? <Alert>{error}</Alert> : null}
        <Button type="button" variant="secondary" onClick={() => navigate('/app/spaces')}>
          Back to spaces
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="fade-up">
        <Link to="/app/spaces" className="text-sm font-semibold text-accent hover:underline">
          ← Back to spaces
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">{space.name}</h1>
            <p className="mt-1 text-muted">{space.description || 'No description'}</p>
          </div>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase text-accent">
            {space.space_type}
          </span>
        </div>
      </section>

      {error ? <Alert>{error}</Alert> : null}

      <ProjectsSection
        projects={projects}
        onCreate={openCreateProject}
        onEdit={openEditProject}
        onAddMembers={(project) => {
          setFormError(null)
          setProjectAddSelected(new Set())
          setMembersProject(project)
        }}
        onDelete={(project) => void handleDeleteProject(project)}
      />

      <TeamsSection
        teams={teams}
        onCreate={() => {
          setFormError(null)
          setTeamOpen(true)
        }}
        onAddMembers={(team) => {
          setFormError(null)
          setTeamAddSelected(new Set())
          setMembersTeam(team)
        }}
        onDelete={(team) => void handleDeleteTeam(team)}
      />

      <DocumentsSection
        documents={documents}
        onUpload={() => {
          setFormError(null)
          setDocOpen(true)
        }}
        onDownload={(document) => void handleDownload(document)}
        onDelete={(document) => void handleDeleteDocument(document)}
      />

      <Drawer
        open={projectOpen}
        eyebrow="Projects"
        title={editingProject ? 'Edit project' : 'Create project'}
        description={
          editingProject
            ? 'Update name, description, or deadline anytime.'
            : 'You are added as a member automatically.'
        }
        onClose={() => {
          setProjectOpen(false)
          resetProjectForm()
        }}
      >
        <form className="flex flex-1 flex-col gap-4" onSubmit={handleSaveProject}>
          {formError ? <Alert>{formError}</Alert> : null}
          <Input
            id="project-name"
            label="Name"
            required
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Q1 launch"
          />
          <Textarea
            id="project-description"
            label="Description"
            rows={4}
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="What is this project about?"
          />
          <Select
            id="project-status"
            label="Status"
            value={projectStatus}
            onChange={(value) => setProjectStatus(value as ProjectStatus)}
            options={PROJECT_STATUS_OPTIONS}
          />
          <Input
            id="project-progress"
            label="Progress (%)"
            type="number"
            min={0}
            max={100}
            value={projectProgress}
            onChange={(e) => setProjectProgress(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            hint="0 to 100"
          />
          <DeadlinePicker
            value={projectDeadline}
            onChange={setProjectDeadline}
            hint="Optional. You can set or change this later from Edit."
          />
          <div className="mt-auto flex gap-3 border-t border-line pt-5">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setProjectOpen(false)
                resetProjectForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-[1.3]" disabled={submitting}>
              {submitting
                ? editingProject
                  ? 'Saving…'
                  : 'Creating…'
                : editingProject
                  ? 'Save changes'
                  : 'Create project'}
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(membersProject)}
        eyebrow="Projects"
        title={membersProject ? `Add members · ${membersProject.name}` : 'Add members'}
        description="Choose space members who are not already on this project."
        onClose={() => {
          setMembersProject(null)
          setProjectAddSelected(new Set())
        }}
      >
        <div className="flex flex-1 flex-col gap-4">
          {formError ? <Alert>{formError}</Alert> : null}
          {projectAddCandidates.length === 0 ? (
            <p className="text-sm text-muted">Everyone in this space is already on the project.</p>
          ) : (
            projectAddCandidates.map((member) => {
              const checked = projectAddSelected.has(member.id)
              return (
                <label
                  key={member.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3',
                    checked && 'border-accent/40 bg-accent-soft',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProjectAddMember(member.id)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <Avatar name={member.full_name} email={member.email} imageUrl={member.avatar_url} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {member.full_name || 'Unnamed'}
                    </span>
                    <span className="block truncate text-xs text-muted">{member.email}</span>
                  </span>
                </label>
              )
            })
          )}
          <div className="mt-auto flex gap-3 border-t border-line pt-5">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setMembersProject(null)
                setProjectAddSelected(new Set())
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-[1.3]"
              disabled={submitting || projectAddSelected.size === 0}
              onClick={() => void handleAddProjectMembers()}
            >
              {submitting ? 'Adding…' : 'Add members'}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={teamOpen}
        eyebrow="Teams"
        title="Create team"
        description="You are added automatically. Pick other space members if needed."
        onClose={() => setTeamOpen(false)}
      >
        <form className="flex flex-1 flex-col gap-4" onSubmit={handleCreateTeam}>
          {formError ? <Alert>{formError}</Alert> : null}
          <Input
            id="team-name"
            label="Name"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Design crew"
          />
          <Textarea
            id="team-description"
            label="Description"
            rows={3}
            value={teamDescription}
            onChange={(e) => setTeamDescription(e.target.value)}
          />
          <div className="grid gap-2">
            <p className="text-sm font-medium text-ink/80">Other members</p>
            {selectableMembers.length === 0 ? (
              <p className="text-sm text-muted">No other space members to add.</p>
            ) : (
              selectableMembers.map((member) => {
                const checked = selectedMembers.has(member.id)
                return (
                  <label
                    key={member.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3',
                      checked && 'border-accent/40 bg-accent-soft',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(member.id)}
                      className="size-4 accent-[var(--color-accent)]"
                    />
                    <Avatar name={member.full_name} email={member.email} imageUrl={member.avatar_url} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {member.full_name || 'Unnamed'}
                      </span>
                      <span className="block truncate text-xs text-muted">{member.email}</span>
                    </span>
                  </label>
                )
              })
            )}
          </div>
          <div className="mt-auto flex gap-3 border-t border-line pt-5">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setTeamOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-[1.3]" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create team'}
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(membersTeam)}
        eyebrow="Teams"
        title={membersTeam ? `Add members · ${membersTeam.name}` : 'Add members'}
        description="Choose space members who are not already on this team."
        onClose={() => {
          setMembersTeam(null)
          setTeamAddSelected(new Set())
        }}
      >
        <div className="flex flex-1 flex-col gap-4">
          {formError ? <Alert>{formError}</Alert> : null}
          {teamAddCandidates.length === 0 ? (
            <p className="text-sm text-muted">Everyone in this space is already on the team.</p>
          ) : (
            teamAddCandidates.map((member) => {
              const checked = teamAddSelected.has(member.id)
              return (
                <label
                  key={member.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3',
                    checked && 'border-accent/40 bg-accent-soft',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTeamAddMember(member.id)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <Avatar name={member.full_name} email={member.email} imageUrl={member.avatar_url} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {member.full_name || 'Unnamed'}
                    </span>
                    <span className="block truncate text-xs text-muted">{member.email}</span>
                  </span>
                </label>
              )
            })
          )}
          <div className="mt-auto flex gap-3 border-t border-line pt-5">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setMembersTeam(null)
                setTeamAddSelected(new Set())
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-[1.3]"
              disabled={submitting || teamAddSelected.size === 0}
              onClick={() => void handleAddTeamMembers()}
            >
              {submitting ? 'Adding…' : 'Add members'}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={docOpen}
        eyebrow="Documents"
        title="Upload document"
        onClose={() => setDocOpen(false)}
      >
        <form className="flex flex-1 flex-col gap-4" onSubmit={handleUploadDocument}>
          {formError ? <Alert>{formError}</Alert> : null}
          <div className="grid gap-1.5">
            <label htmlFor="document-file" className="text-sm font-medium text-ink/80">
              File
            </label>
            <input
              id="document-file"
              type="file"
              required
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="block w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent"
            />
            <p className="text-xs text-muted">Max 25MB.</p>
          </div>
          <div className="mt-auto flex gap-3 border-t border-line pt-5">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setDocOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-[1.3]" disabled={submitting || !uploadFile}>
              {submitting ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
