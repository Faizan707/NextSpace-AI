import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as spacesApi from '../api/spaces'
import { Avatar } from '../components/Avatar'
import { Alert, Button, Drawer, Input, Textarea } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import type { Space, SpaceDocument, SpaceProject, SpaceTeam } from '../types'
import { cn } from '../lib/cn'

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
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
  const [teamOpen, setTeamOpen] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set())
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

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await spacesApi.createProject(token, spaceId, {
        name: projectName,
        description: projectDescription || null,
      })
      setProjects((prev) => [created, ...prev])
      setProjectOpen(false)
      setProjectName('')
      setProjectDescription('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create project')
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

  async function handleDeleteProject(projectId: number) {
    if (!token) return
    if (!window.confirm('Delete this project?')) return
    await spacesApi.deleteProject(token, spaceId, projectId)
    setProjects((prev) => prev.filter((item) => item.id !== projectId))
  }

  async function handleDeleteTeam(teamId: number) {
    if (!token) return
    if (!window.confirm('Delete this team?')) return
    await spacesApi.deleteTeam(token, spaceId, teamId)
    setTeams((prev) => prev.filter((item) => item.id !== teamId))
  }

  async function handleDeleteDocument(documentId: number) {
    if (!token) return
    if (!window.confirm('Delete this document?')) return
    await spacesApi.deleteDocument(token, spaceId, documentId)
    setDocuments((prev) => prev.filter((item) => item.id !== documentId))
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

  if (!Number.isFinite(spaceId)) {
    return <Alert>Invalid space.</Alert>
  }

  if (loading && !space) {
    return <p className="text-sm text-muted">Loading space…</p>
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
    <div className="mx-auto max-w-6xl space-y-5">
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

      <section className="rounded-[24px] border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Projects</h2>
            <p className="text-sm text-muted">Create and track work inside this space.</p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setFormError(null)
              setProjectOpen(true)
            }}
          >
            Create project
          </Button>
        </div>
        {projects.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-4 py-8 text-center text-sm text-muted">
            No projects yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <article key={project.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink">{project.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {project.description || 'No description'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 rounded-lg px-3 text-xs text-danger hover:bg-danger-soft"
                    onClick={() => void handleDeleteProject(project.id)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Teams</h2>
            <p className="text-sm text-muted">Group space members for collaboration.</p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setFormError(null)
              setTeamOpen(true)
            }}
          >
            Create team
          </Button>
        </div>
        {teams.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-4 py-8 text-center text-sm text-muted">
            No teams yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {teams.map((team) => (
              <article key={team.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink">{team.name}</h3>
                    <p className="mt-1 text-sm text-muted">{team.description || 'No description'}</p>
                    <div className="mt-3 flex -space-x-2">
                      {team.members.slice(0, 4).map((member) => (
                        <Avatar
                          key={member.id}
                          name={member.full_name}
                          email={member.email}
                          imageUrl={member.avatar_url}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 rounded-lg px-3 text-xs text-danger hover:bg-danger-soft"
                    onClick={() => void handleDeleteTeam(team.id)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Documents</h2>
            <p className="text-sm text-muted">Upload and share files with space members.</p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setFormError(null)
              setDocOpen(true)
            }}
          >
            Upload document
          </Button>
        </div>
        {documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-4 py-8 text-center text-sm text-muted">
            No documents yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-2 py-2 font-medium">File</th>
                  <th className="px-2 py-2 font-medium">Size</th>
                  <th className="px-2 py-2 font-medium">Uploaded by</th>
                  <th className="px-2 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id} className="border-b border-line/70">
                    <td className="px-2 py-3 font-medium text-ink">{document.original_name}</td>
                    <td className="px-2 py-3 text-muted">{formatBytes(document.size_bytes)}</td>
                    <td className="px-2 py-3 text-muted">
                      {document.uploaded_by.full_name || document.uploaded_by.email}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => void handleDownload(document)}
                        >
                          Download
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-lg px-3 text-xs text-danger hover:bg-danger-soft"
                          onClick={() => void handleDeleteDocument(document.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Drawer
        open={projectOpen}
        eyebrow="Projects"
        title="Create project"
        onClose={() => setProjectOpen(false)}
      >
        <form className="flex flex-1 flex-col gap-4" onSubmit={handleCreateProject}>
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
          <div className="mt-auto flex gap-3 border-t border-line pt-5">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setProjectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-[1.3]" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </form>
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
