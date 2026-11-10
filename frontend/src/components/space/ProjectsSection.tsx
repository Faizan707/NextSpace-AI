import { Button } from '../ui'
import type { SpaceProject } from '../../types'
import { ProjectCard } from './ProjectCard'

interface ProjectsSectionProps {
  projects: SpaceProject[]
  canManageProject?: (project: SpaceProject) => boolean
  onCreate: () => void
  onOpen: (project: SpaceProject) => void
  onEdit: (project: SpaceProject) => void
  onAddMembers: (project: SpaceProject) => void
  onDelete: (project: SpaceProject) => void
}

export function ProjectsSection({
  projects,
  canManageProject,
  onCreate,
  onOpen,
  onEdit,
  onAddMembers,
  onDelete,
}: ProjectsSectionProps) {
  return (
    <section className="fade-up">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Projects</h2>
          <p className="text-sm text-muted">Create and track work inside this space.</p>
        </div>
        <Button type="button" onClick={onCreate}>
          Create project
        </Button>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-accent/25 bg-accent-soft/40 px-4 py-14 text-center">
          <p className="font-display text-lg text-ink">No projects yet</p>
          <p className="mt-1 text-sm text-muted">Create your first project for this space.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              canManage={canManageProject?.(project) ?? false}
              onOpen={onOpen}
              onEdit={onEdit}
              onAddMembers={onAddMembers}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
