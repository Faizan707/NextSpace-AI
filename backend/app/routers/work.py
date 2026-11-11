from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.project import Project, ProjectMember, ProjectTask
from app.models.space import Space
from app.models.team import Team
from app.models.user import User, UserRole
from app.schemas.space import SpaceCreatorRead
from app.schemas.work import (
    DashboardKpis,
    DashboardMemberPerformance,
    DashboardNamedCount,
    DashboardProjectProgress,
    DashboardTeamPerformance,
    WorkDashboardRead,
    WorkProjectRead,
    WorkTaskRead,
)

router = APIRouter(prefix="/work", tags=["work"])


def _stage_bucket(stage_name: str | None) -> str:
    name = (stage_name or "").strip().lower()
    if any(token in name for token in ("done", "complete", "closed", "finished")):
        return "done"
    if any(token in name for token in ("progress", "doing", "active", "review")):
        return "in_progress"
    return "todo"


def _person_label(user: User | None) -> str:
    if user is None:
        return "Unassigned"
    return (user.full_name or "").strip() or user.email


def _project_query():
    return select(Project).options(
        selectinload(Project.created_by),
        selectinload(Project.memberships).selectinload(ProjectMember.user),
        selectinload(Project.space),
    )


def _to_work_project(project: Project) -> WorkProjectRead:
    return WorkProjectRead(
        id=project.id,
        space_id=project.space_id,
        space_name=project.space.name if project.space else "",
        name=project.name,
        description=project.description,
        status=project.status,  # type: ignore[arg-type]
        progress=project.progress,
        deadline=project.deadline,
        created_by_id=project.created_by_id,
        created_by=SpaceCreatorRead.model_validate(project.created_by),
        members=[
            SpaceCreatorRead.model_validate(membership.user)
            for membership in project.memberships
            if membership.user is not None
        ],
        created_at=project.created_at,
    )


def _to_work_task(task: ProjectTask) -> WorkTaskRead:
    project = task.project
    stage = task.stage
    space = project.space if project else None
    return WorkTaskRead(
        id=task.id,
        project_id=task.project_id,
        project_name=project.name if project else "",
        space_id=project.space_id if project else 0,
        space_name=space.name if space else "",
        stage_id=task.stage_id,
        stage_name=stage.name if stage else "",
        title=task.title,
        description=task.description,
        priority=getattr(task, "priority", None) or "medium",
        position=task.position,
        assignee_id=task.assignee_id,
        assignee=SpaceCreatorRead.model_validate(task.assignee) if task.assignee else None,
        created_by_id=task.created_by_id,
        created_by=SpaceCreatorRead.model_validate(task.created_by),
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("/projects", response_model=list[WorkProjectRead])
def list_work_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkProjectRead]:
    query = _project_query().where(Project.space.has(Space.company_id == current_user.company_id))

    if current_user.role != UserRole.TENANT_OWNER:
        query = query.where(
            or_(
                Project.created_by_id == current_user.id,
                Project.memberships.any(ProjectMember.user_id == current_user.id),
            )
        )

    projects = list(db.scalars(query.order_by(Project.created_at.desc())).unique().all())
    return [_to_work_project(project) for project in projects]


@router.get("/tasks", response_model=list[WorkTaskRead])
def list_work_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkTaskRead]:
    query = (
        select(ProjectTask)
        .join(Project, ProjectTask.project_id == Project.id)
        .join(Space, Project.space_id == Space.id)
        .where(Space.company_id == current_user.company_id)
        .options(
            selectinload(ProjectTask.assignee),
            selectinload(ProjectTask.created_by),
            selectinload(ProjectTask.stage),
            selectinload(ProjectTask.project).selectinload(Project.space),
        )
    )

    if current_user.role != UserRole.TENANT_OWNER:
        query = query.where(
            or_(
                ProjectTask.created_by_id == current_user.id,
                ProjectTask.assignee_id == current_user.id,
            )
        )

    tasks = list(db.scalars(query.order_by(ProjectTask.updated_at.desc())).unique().all())
    return [_to_work_task(task) for task in tasks]


@router.get("/dashboard", response_model=WorkDashboardRead)
def get_work_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkDashboardRead:
    company_id = current_user.company_id

    spaces = list(
        db.scalars(select(Space).where(Space.company_id == company_id).order_by(Space.name)).all()
    )
    space_ids = [space.id for space in spaces]
    space_name_by_id = {space.id: space.name for space in spaces}

    projects = list(
        db.scalars(
            select(Project)
            .where(Project.space_id.in_(space_ids) if space_ids else False)
            .order_by(Project.progress.desc(), Project.name)
        ).all()
    ) if space_ids else []

    teams = list(
        db.scalars(
            select(Team)
            .options(selectinload(Team.memberships))
            .where(Team.space_id.in_(space_ids) if space_ids else False)
            .order_by(Team.name)
        ).all()
    ) if space_ids else []

    members = list(
        db.scalars(
            select(User).where(User.company_id == company_id).order_by(User.full_name, User.email)
        ).all()
    )

    tasks = list(
        db.scalars(
            select(ProjectTask)
            .join(Project, ProjectTask.project_id == Project.id)
            .join(Space, Project.space_id == Space.id)
            .where(Space.company_id == company_id)
            .options(
                selectinload(ProjectTask.stage),
                selectinload(ProjectTask.assignee),
                selectinload(ProjectTask.project).selectinload(Project.space),
            )
        ).all()
    )

    priority_counts = {"low": 0, "medium": 0, "high": 0}
    status_counts = {"todo": 0, "in_progress": 0, "done": 0}
    space_task_counts: dict[str, int] = defaultdict(int)
    member_assigned: dict[int, int] = defaultdict(int)
    member_done: dict[int, int] = defaultdict(int)

    for task in tasks:
        priority = (getattr(task, "priority", None) or "medium").lower()
        if priority not in priority_counts:
            priority = "medium"
        priority_counts[priority] += 1

        bucket = _stage_bucket(task.stage.name if task.stage else None)
        status_counts[bucket] += 1

        space_name = ""
        if task.project and task.project.space:
            space_name = task.project.space.name
        elif task.project:
            space_name = space_name_by_id.get(task.project.space_id, "Unknown")
        else:
            space_name = "Unknown"
        space_task_counts[space_name] += 1

        if task.assignee_id is not None:
            member_assigned[task.assignee_id] += 1
            if bucket == "done":
                member_done[task.assignee_id] += 1

    tasks_done = status_counts["done"]
    tasks_total = len(tasks)
    tasks_open = tasks_total - tasks_done
    avg_progress = (
        int(round(sum(project.progress for project in projects) / len(projects)))
        if projects
        else 0
    )

    project_progress = [
        DashboardProjectProgress(
            name=project.name,
            space_name=space_name_by_id.get(project.space_id, "Unknown"),
            progress=project.progress,
        )
        for project in projects[:10]
    ]

    # Tasks in each space for team scoring
    tasks_by_space_id: dict[int, list[ProjectTask]] = defaultdict(list)
    for task in tasks:
        if task.project is not None:
            tasks_by_space_id[task.project.space_id].append(task)

    team_performance: list[DashboardTeamPerformance] = []
    for team in teams:
        member_ids = {item.user_id for item in team.memberships}
        space_tasks = tasks_by_space_id.get(team.space_id, [])
        assigned = [
            task
            for task in space_tasks
            if task.assignee_id is not None and task.assignee_id in member_ids
        ]
        done = [
            task
            for task in assigned
            if _stage_bucket(task.stage.name if task.stage else None) == "done"
        ]
        team_performance.append(
            DashboardTeamPerformance(
                name=team.name,
                space_name=space_name_by_id.get(team.space_id, "Unknown"),
                members=len(member_ids),
                assigned_tasks=len(assigned),
                done_tasks=len(done),
            )
        )
    team_performance.sort(key=lambda item: item.assigned_tasks, reverse=True)

    member_performance = [
        DashboardMemberPerformance(
            name=_person_label(member),
            assigned=member_assigned.get(member.id, 0),
            done=member_done.get(member.id, 0),
            open=max(member_assigned.get(member.id, 0) - member_done.get(member.id, 0), 0),
        )
        for member in members
    ]
    member_performance.sort(key=lambda item: item.assigned, reverse=True)

    return WorkDashboardRead(
        kpis=DashboardKpis(
            spaces=len(spaces),
            projects=len(projects),
            teams=len(teams),
            members=len(members),
            tasks_total=tasks_total,
            tasks_done=tasks_done,
            tasks_open=tasks_open,
            avg_project_progress=avg_progress,
        ),
        tasks_by_priority=[
            DashboardNamedCount(name="Low", value=priority_counts["low"]),
            DashboardNamedCount(name="Medium", value=priority_counts["medium"]),
            DashboardNamedCount(name="High", value=priority_counts["high"]),
        ],
        tasks_by_status=[
            DashboardNamedCount(name="Todo", value=status_counts["todo"]),
            DashboardNamedCount(name="In Progress", value=status_counts["in_progress"]),
            DashboardNamedCount(name="Done", value=status_counts["done"]),
        ],
        tasks_by_space=[
            DashboardNamedCount(name=name, value=count)
            for name, count in sorted(space_task_counts.items(), key=lambda item: item[1], reverse=True)
        ],
        project_progress=project_progress,
        team_performance=team_performance[:10],
        member_performance=member_performance[:10],
    )
