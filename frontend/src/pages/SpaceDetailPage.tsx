import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import * as spacesApi from '../api/spaces'
import { AddSpaceMembersDrawer } from '../components/AddSpaceMembersDrawer'
import { Avatar } from '../components/Avatar'
import { SpaceMembersDrawer } from '../components/SpaceMembersDrawer'
import {
  AddProjectMembersPicker,
  countProjectAddSelection,
} from '../components/space/AddProjectMembersPicker'
import { DocumentPreviewModal } from '../components/space/DocumentPreviewModal'
import { DocumentsSection } from '../components/space/DocumentsSection'
import { ProjectsSection } from '../components/space/ProjectsSection'
import { TeamsSection } from '../components/space/TeamsSection'
import {
  Alert,
  Breadcrumbs,
  Button,
  DeadlinePicker,
  Drawer,
  Input,
  Select,
  SpaceDetailSkeleton,
  Textarea,
} from '../components/ui'
import {
  useAddDocumentMembersMutation,
  useAddProjectMembersMutation,
  useAddSpaceMembersMutation,
  useAddTeamMembersMutation,
  useCreateProjectMutation,
  useCreateTeamMutation,
  useDeleteDocumentMutation,
  useDeleteProjectMutation,
  useDeleteTeamMutation,
  useRemoveSpaceMemberMutation,
  useRunDocumentComplianceMutation,
  useSpaceDocumentsQuery,
  useSpaceProjectsQuery,
  useSpaceQuery,
  useSpaceTeamsQuery,
  useUpdateProjectMutation,
  useUploadDocumentMutation,
} from '../hooks'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import type {
  ProjectStatus,
  SpaceCreator,
  SpaceDocument,
  SpaceProject,
  SpaceTeam,
} from '../types'
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

  const spaceQuery = useSpaceQuery(spaceId)
  const projectsQuery = useSpaceProjectsQuery(spaceId)
  const teamsQuery = useSpaceTeamsQuery(spaceId)
  const documentsQuery = useSpaceDocumentsQuery(spaceId)

  const createProject = useCreateProjectMutation(spaceId)
  const updateProject = useUpdateProjectMutation(spaceId)
  const deleteProject = useDeleteProjectMutation(spaceId)
  const addProjectMembers = useAddProjectMembersMutation(spaceId)
  const addSpaceMembers = useAddSpaceMembersMutation()
  const removeSpaceMember = useRemoveSpaceMemberMutation()
  const createTeam = useCreateTeamMutation(spaceId)
  const deleteTeam = useDeleteTeamMutation(spaceId)
  const addTeamMembers = useAddTeamMembersMutation(spaceId)
  const uploadDocument = useUploadDocumentMutation(spaceId)
  const addDocumentMembers = useAddDocumentMembersMutation(spaceId)
  const deleteDocument = useDeleteDocumentMutation(spaceId)
  const runDocumentCompliance = useRunDocumentComplianceMutation(spaceId)

  const space = spaceQuery.data ?? null
  const projects = projectsQuery.data ?? []
  const teams = teamsQuery.data ?? []
  const documents = documentsQuery.data ?? []
  const loading =
    (spaceQuery.isLoading ||
      projectsQuery.isLoading ||
      teamsQuery.isLoading ||
      documentsQuery.isLoading) &&
    !space
  const error = spaceQuery.error
    ? spaceQuery.error instanceof Error
      ? spaceQuery.error.message
      : 'Failed to load space'
    : null

  const [projectOpen, setProjectOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<SpaceProject | null>(null)
  const [teamOpen, setTeamOpen] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  const [membersProject, setMembersProject] = useState<SpaceProject | null>(null)
  const [membersTeam, setMembersTeam] = useState<SpaceTeam | null>(null)
  const [membersDocument, setMembersDocument] = useState<SpaceDocument | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('open')
  const [projectDeadline, setProjectDeadline] = useState<Date | undefined>(undefined)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set())
  const [projectAddSelected, setProjectAddSelected] = useState<Set<number>>(new Set())
  const [projectAddTeamsSelected, setProjectAddTeamsSelected] = useState<Set<number>>(new Set())
  const [teamAddSelected, setTeamAddSelected] = useState<Set<number>>(new Set())
  const [documentAddSelected, setDocumentAddSelected] = useState<Set<number>>(new Set())
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewDocument, setPreviewDocument] = useState<SpaceDocument | null>(null)
  const [membersOpen, setMembersOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [addSpaceMembersOpen, setAddSpaceMembersOpen] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null)

  const submitting =
    createProject.isPending ||
    updateProject.isPending ||
    deleteProject.isPending ||
    addProjectMembers.isPending ||
    addSpaceMembers.isPending ||
    removeSpaceMember.isPending ||
    createTeam.isPending ||
    deleteTeam.isPending ||
    addTeamMembers.isPending ||
    uploadDocument.isPending ||
    addDocumentMembers.isPending ||
    deleteDocument.isPending

  const selectableMembers = useMemo(
    () => (space?.members || []).filter((member) => member.id !== currentUser?.id),
    [space, currentUser?.id],
  )

  const projectExistingMemberIds = useMemo(() => {
    if (!membersProject) return new Set<number>()
    return new Set(
      (membersProject.members?.length ? membersProject.members : [membersProject.created_by]).map(
        (member) => member.id,
      ),
    )
  }, [membersProject])

  const projectAddSelectionCount = useMemo(
    () =>
      countProjectAddSelection(
        projectAddSelected,
        projectAddTeamsSelected,
        teams,
        projectExistingMemberIds,
      ),
    [projectAddSelected, projectAddTeamsSelected, teams, projectExistingMemberIds],
  )

  const teamAddCandidates = useMemo(() => {
    if (!membersTeam || !space) return []
    const existing = new Set(membersTeam.members.map((member) => member.id))
    return space.members.filter((member) => !existing.has(member.id))
  }, [membersTeam, space])

  const documentAddCandidates = useMemo(() => {
    if (!membersDocument || !space) return []
    const existing = new Set(
      (
        membersDocument.members?.length
          ? membersDocument.members
          : [membersDocument.uploaded_by]
      ).map((member) => member.id),
    )
    return space.members.filter((member) => !existing.has(member.id))
  }, [membersDocument, space])

  function resetProjectForm() {
    setProjectName('')
    setProjectDescription('')
    setProjectStatus('open')
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
    setProjectDeadline(parseDeadline(project.deadline))
    setFormError(null)
    setProjectOpen(true)
  }

  async function handleSaveProject(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      const payload = {
        name: projectName,
        description: projectDescription || null,
        status: projectStatus,
        deadline: deadlineToIso(projectDeadline),
      }
      if (editingProject) {
        const updated = await updateProject.mutateAsync({
          projectId: editingProject.id,
          payload,
        })
        toast.success('Project updated', updated.name)
      } else {
        const created = await createProject.mutateAsync(payload)
        toast.success('Project created', created.name)
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
    }
  }

  function resetProjectAddSelection() {
    setProjectAddSelected(new Set())
    setProjectAddTeamsSelected(new Set())
  }

  function toggleProjectAddMember(userId: number) {
    setProjectAddSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function toggleProjectAddTeam(teamId: number) {
    setProjectAddTeamsSelected((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  async function handleAddProjectMembers() {
    if (
      !membersProject ||
      (projectAddSelected.size === 0 && projectAddTeamsSelected.size === 0)
    ) {
      return
    }
    setFormError(null)
    try {
      await addProjectMembers.mutateAsync({
        projectId: membersProject.id,
        userIds: [...projectAddSelected],
        teamIds: [...projectAddTeamsSelected],
      })
      toast.success(
        projectAddSelectionCount === 1
          ? '1 member added'
          : `${projectAddSelectionCount} members added`,
      )
      setMembersProject(null)
      resetProjectAddSelection()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add members')
    }
  }

  async function handleCreateTeam(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      const created = await createTeam.mutateAsync({
        name: teamName,
        description: teamDescription || null,
        member_ids: [...selectedMembers],
      })
      setTeamOpen(false)
      setTeamName('')
      setTeamDescription('')
      setSelectedMembers(new Set())
      toast.success('Team created', created.name)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create team')
    }
  }

  async function handleUploadDocument(event: FormEvent) {
    event.preventDefault()
    if (!uploadFile) return
    setFormError(null)
    setUploadProgress(0)
    try {
      const created = await uploadDocument.mutateAsync({
        file: uploadFile,
        onProgress: setUploadProgress,
      })
      setDocOpen(false)
      setUploadFile(null)
      setUploadProgress(0)
      toast.success('Document uploaded', created.original_name)
      const runCheck = window.confirm(
        `Do you want to check compliance for “${created.original_name}”?`,
      )
      if (runCheck) {
        await handleDocumentComplianceCheck(created)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to upload document')
      toast.error('Upload failed', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleAddTeamMembers() {
    if (!membersTeam || teamAddSelected.size === 0) return
    setFormError(null)
    try {
      await addTeamMembers.mutateAsync({
        teamId: membersTeam.id,
        userIds: [...teamAddSelected],
      })
      setMembersTeam(null)
      setTeamAddSelected(new Set())
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add members')
    }
  }

  async function handleAddDocumentMembers() {
    if (!membersDocument || documentAddSelected.size === 0) return
    setFormError(null)
    try {
      await addDocumentMembers.mutateAsync({
        documentId: membersDocument.id,
        userIds: [...documentAddSelected],
      })
      setMembersDocument(null)
      setDocumentAddSelected(new Set())
      toast.success('Document shared')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add members')
    }
  }

  async function handleDeleteProject(project: SpaceProject) {
    if (!window.confirm('Delete this project?')) return
    await deleteProject.mutateAsync(project.id)
  }

  async function handleDeleteTeam(team: SpaceTeam) {
    if (!window.confirm('Delete this team?')) return
    await deleteTeam.mutateAsync(team.id)
  }

  async function handleDeleteDocument(document: SpaceDocument) {
    if (!window.confirm('Delete this document?')) return
    await deleteDocument.mutateAsync(document.id)
  }

  async function handleDocumentComplianceCheck(document: SpaceDocument) {
    try {
      const updated = await runDocumentCompliance.mutateAsync(document.id)
      const status = updated.compliance_status || 'pending'
      if (status === 'passed') {
        toast.success('Compliance passed', updated.compliance_summary || undefined)
      } else if (status === 'failed') {
        toast.error('Compliance failed', updated.compliance_summary || undefined)
      } else if (status === 'error') {
        toast.error('Compliance error', updated.compliance_summary || undefined)
      } else {
        toast.success('Compliance checked', updated.compliance_summary || undefined)
      }
    } catch (err) {
      toast.error(
        'Compliance check failed',
        err instanceof Error ? err.message : undefined,
      )
    }
  }

  async function handleDownload(document: SpaceDocument) {
    if (!token) return
    const response = await fetch(spacesApi.documentDownloadUrl(spaceId, document.id), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      toast.error('Download failed')
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

  function toggleTeamAddMember(userId: number) {
    setTeamAddSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function toggleDocumentAddMember(userId: number) {
    setDocumentAddSelected((prev) => {
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

  const currentSpace = space
  const spaceMembers =
    currentSpace.members?.length > 0
      ? currentSpace.members
      : currentSpace.created_by
        ? [currentSpace.created_by]
        : []
  const memberPreview = spaceMembers.slice(0, 4)
  const memberExtra = Math.max(spaceMembers.length - memberPreview.length, 0)

  function openMembers(member?: SpaceCreator) {
    setSelectedMemberId(member?.id ?? spaceMembers[0]?.id ?? null)
    setMembersOpen(true)
  }

  async function handleAddSpaceMembers(userIds: number[]) {
    await addSpaceMembers.mutateAsync({ spaceId: currentSpace.id, userIds })
    toast.success('Members added')
    setAddSpaceMembersOpen(false)
  }

  const canManageSpace =
    currentUser?.role === 'tenant_owner' || currentSpace.created_by_id === currentUser?.id

  async function handleRemoveSpaceMember(member: SpaceCreator) {
    if (
      !window.confirm(
        `Remove ${member.full_name || member.email} from this space? They will also lose project and team access here.`,
      )
    ) {
      return
    }
    setRemovingMemberId(member.id)
    try {
      await removeSpaceMember.mutateAsync({ spaceId, userId: member.id })
      toast.success('Member removed', member.full_name || member.email)
      if (selectedMemberId === member.id) {
        setSelectedMemberId(null)
      }
    } catch (err) {
      toast.error('Failed to remove member', err instanceof Error ? err.message : undefined)
    } finally {
      setRemovingMemberId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="fade-up">
        <Breadcrumbs
          items={[
            { label: 'Spaces', to: '/app/spaces' },
            { label: currentSpace.name },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">{currentSpace.name}</h1>
            <p className="mt-1 text-muted">{currentSpace.description || 'No description'}</p>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase text-accent">
              {currentSpace.space_type}
            </span>
            <div className="flex items-center" aria-label="Space members">
              {memberPreview.map((member, index) => (
                <button
                  key={member.id}
                  type="button"
                  title={member.full_name || member.email}
                  aria-label={`View ${member.full_name || member.email}`}
                  onClick={() => openMembers(member)}
                  className={cn(
                    'cursor-pointer rounded-full transition hover:z-10 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    index === 0 ? undefined : 'ml-[-8px]',
                  )}
                >
                  <Avatar
                    name={member.full_name}
                    email={member.email}
                    imageUrl={member.avatar_url}
                    className="pointer-events-none"
                  />
                </button>
              ))}
              {memberExtra > 0 ? (
                <button
                  type="button"
                  title={`View all ${spaceMembers.length} members`}
                  aria-label={`View all ${spaceMembers.length} members`}
                  onClick={() => openMembers()}
                  className="ml-[-8px] grid size-9 cursor-pointer place-items-center rounded-full bg-bg-elevated text-[0.7rem] font-bold text-muted ring-2 ring-surface transition hover:z-10 hover:scale-110 hover:text-ink"
                >
                  +{memberExtra}
                </button>
              ) : null}
              {canManageSpace ? (
                <button
                  type="button"
                  title="Add members"
                  aria-label="Add space members"
                  onClick={() => setAddSpaceMembersOpen(true)}
                  className="ml-2 grid size-9 cursor-pointer place-items-center rounded-full border border-dashed border-line text-muted transition hover:border-accent hover:bg-accent-soft hover:text-accent"
                >
                  <FiPlus size={16} aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {error ? <Alert>{error}</Alert> : null}

      <SpaceMembersDrawer
        open={membersOpen}
        spaceName={currentSpace.name}
        members={spaceMembers}
        selectedId={selectedMemberId}
        canManage={canManageSpace}
        creatorId={currentSpace.created_by_id}
        removingId={removingMemberId}
        onSelect={(member) => setSelectedMemberId(member.id)}
        onRemove={(member) => void handleRemoveSpaceMember(member)}
        onClose={() => {
          setMembersOpen(false)
          setSelectedMemberId(null)
        }}
      />

      <AddSpaceMembersDrawer
        open={addSpaceMembersOpen}
        space={currentSpace}
        submitting={addSpaceMembers.isPending || removeSpaceMember.isPending}
        removingId={removingMemberId}
        onClose={() => setAddSpaceMembersOpen(false)}
        onSubmit={handleAddSpaceMembers}
        onRemove={handleRemoveSpaceMember}
      />

      <ProjectsSection
        projects={projects}
        canManageProject={(project) =>
          canManageSpace || project.created_by_id === currentUser?.id
        }
        onCreate={openCreateProject}
        onOpen={(project) => navigate(`/app/spaces/${spaceId}/projects/${project.id}`)}
        onEdit={openEditProject}
        onAddMembers={(project) => {
          setFormError(null)
          resetProjectAddSelection()
          setMembersProject(project)
        }}
        onDelete={(project) => void handleDeleteProject(project)}
      />

      <TeamsSection
        teams={teams}
        canManageTeam={(team) => canManageSpace || team.created_by_id === currentUser?.id}
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
        canManageDocument={(document) =>
          canManageSpace || document.uploaded_by_id === currentUser?.id
        }
        complianceDocumentId={
          runDocumentCompliance.isPending
            ? (runDocumentCompliance.variables ?? null)
            : null
        }
        onUpload={() => {
          setFormError(null)
          setDocOpen(true)
        }}
        onAddMembers={(document) => {
          setFormError(null)
          setDocumentAddSelected(new Set())
          setMembersDocument(document)
        }}
        onPreview={setPreviewDocument}
        onDownload={(document) => void handleDownload(document)}
        onDelete={(document) => void handleDeleteDocument(document)}
        onComplianceCheck={(document) => void handleDocumentComplianceCheck(document)}
      />

      <DocumentPreviewModal
        open={Boolean(previewDocument)}
        file={previewDocument}
        token={token}
        downloadUrl={
          previewDocument
            ? spacesApi.documentDownloadUrl(spaceId, previewDocument.id)
            : null
        }
        onClose={() => setPreviewDocument(null)}
        onDownload={(document) => void handleDownload(document)}
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
          <p className="text-sm text-muted">
            Progress updates automatically from the Kanban board (Todo 0%, other stages 50%, Done
            100%).
          </p>
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
        description="Add people or whole teams. Anyone already on the project is skipped."
        onClose={() => {
          setMembersProject(null)
          resetProjectAddSelection()
        }}
      >
        <div className="flex flex-1 flex-col gap-4">
          {formError ? <Alert>{formError}</Alert> : null}
          <AddProjectMembersPicker
            people={space?.members ?? []}
            teams={teams}
            existingMemberIds={projectExistingMemberIds}
            selectedPeople={projectAddSelected}
            selectedTeams={projectAddTeamsSelected}
            onTogglePerson={toggleProjectAddMember}
            onToggleTeam={toggleProjectAddTeam}
          />
          <div className="mt-auto flex gap-3 border-t border-line pt-5">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setMembersProject(null)
                resetProjectAddSelection()
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-[1.3]"
              disabled={
                submitting ||
                (projectAddSelected.size === 0 && projectAddTeamsSelected.size === 0)
              }
              onClick={() => void handleAddProjectMembers()}
            >
              {submitting
                ? 'Adding…'
                : projectAddSelectionCount > 0
                  ? `Add (${projectAddSelectionCount})`
                  : 'Add members'}
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
        open={Boolean(membersDocument)}
        eyebrow="Documents"
        title={
          membersDocument
            ? `Share · ${membersDocument.original_name}`
            : 'Share document'
        }
        description="Choose space members who can see this document."
        onClose={() => {
          setMembersDocument(null)
          setDocumentAddSelected(new Set())
        }}
      >
        <div className="flex flex-1 flex-col gap-4">
          {formError ? <Alert>{formError}</Alert> : null}
          {documentAddCandidates.length === 0 ? (
            <p className="text-sm text-muted">Everyone in this space already has access.</p>
          ) : (
            documentAddCandidates.map((member) => {
              const checked = documentAddSelected.has(member.id)
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
                    onChange={() => toggleDocumentAddMember(member.id)}
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
                setMembersDocument(null)
                setDocumentAddSelected(new Set())
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-[1.3]"
              disabled={submitting || documentAddSelected.size === 0}
              onClick={() => void handleAddDocumentMembers()}
            >
              {submitting ? 'Sharing…' : 'Share'}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={docOpen}
        eyebrow="Documents"
        title="Upload document"
        onClose={() => {
          if (submitting) return
          setDocOpen(false)
          setUploadFile(null)
          setUploadProgress(0)
          setFormError(null)
        }}
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
              disabled={submitting}
              onChange={(e) => {
                setUploadFile(e.target.files?.[0] || null)
                setUploadProgress(0)
              }}
              className="block w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-muted">Max 25MB.</p>
          </div>

          {submitting || uploadProgress > 0 ? (
            <div className="rounded-2xl border border-line bg-bg-elevated/70 px-3.5 py-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                <span className="text-muted">
                  {uploadProgress >= 100 ? 'Finishing upload…' : 'Uploading…'}
                </span>
                <span className="tabular-nums text-ink">{uploadProgress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {uploadFile ? (
                <p className="mt-2 m-0 truncate text-xs text-muted">{uploadFile.name}</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-auto flex gap-3 border-t border-line pt-5">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={submitting}
              onClick={() => {
                setDocOpen(false)
                setUploadFile(null)
                setUploadProgress(0)
                setFormError(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-[1.3]" disabled={submitting || !uploadFile}>
              {submitting ? `Uploading ${uploadProgress}%` : 'Upload document'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
