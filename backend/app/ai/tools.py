"""Authenticated workspace tools the AI assistant can call on behalf of the user."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.project import Project, ProjectMember, ProjectStage, ProjectTask, TaskComment
from app.models.space import Space
from app.models.space_member import SpaceMember
from app.models.user import User, UserRole
from app.routers.task_comments import comment_query, comment_with_replies, save_comment_row
from app.services.notifications import notify_user
from app.services.project_board import (
    ensure_default_stages,
    next_task_position,
    recalculate_project_progress,
)
from app.services.space_access import (
    can_manage_space,
    get_company_space,
    require_space_access,
    space_query,
)


@dataclass
class ToolContext:
    db: Session
    user: User


def tool_specs() -> list[dict[str, Any]]:
    """OpenAI / Ollama compatible tool definitions."""
    return [
        {
            "type": "function",
            "function": {
                "name": "get_workspace_summary",
                "description": "Get counts: spaces, projects, my assigned open/total tasks, company members.",
                "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "list_spaces",
                "description": "List spaces the current user can access.",
                "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "create_space",
                "description": "Create a new space and add the current user as a member.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                    },
                    "required": ["name"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "update_space",
                "description": "Update a space name and/or description (manager/owner only).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "space_id": {"type": "integer"},
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                    },
                    "required": ["space_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "list_projects",
                "description": (
                    "List projects the user can access (created by them or they are a member). "
                    "Optionally filter by space_id or name query. Includes can_update flag."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "space_id": {"type": "integer"},
                        "query": {
                            "type": "string",
                            "description": "Optional case-insensitive name filter, e.g. frontend",
                        },
                    },
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "update_project",
                "description": (
                    "Rename or update a project. Allowed only for the project creator or company/space admin "
                    "(tenant owner / space creator). Plain project members who were only added cannot rename. "
                    "Identify by project_id, or by project_name (+ optional space_id). Check can_update from list_projects first."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "integer"},
                        "project_name": {
                            "type": "string",
                            "description": "Current project name to find when project_id is unknown.",
                        },
                        "space_id": {"type": "integer"},
                        "name": {"type": "string", "description": "New project name."},
                        "description": {"type": "string"},
                        "status": {
                            "type": "string",
                            "enum": ["open", "in_progress", "completed"],
                        },
                    },
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "list_my_tasks",
                "description": "List tasks assigned to the current user (and optionally created by them).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "include_created": {
                            "type": "boolean",
                            "description": "Also include tasks the user created. Default false.",
                        }
                    },
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "create_task",
                "description": "Create a task in a project. Defaults to Todo stage. Can assign by user id or email.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "space_id": {"type": "integer"},
                        "project_id": {"type": "integer"},
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                        "assignee_id": {"type": "integer"},
                        "assignee_email": {"type": "string"},
                        "stage_name": {
                            "type": "string",
                            "description": "Stage name like Todo, In Progress, Done. Default Todo.",
                        },
                    },
                    "required": ["space_id", "project_id", "title"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "assign_task",
                "description": "Assign or reassign a task to a company user by id or email.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "space_id": {"type": "integer"},
                        "project_id": {"type": "integer"},
                        "task_id": {"type": "integer"},
                        "assignee_id": {"type": "integer"},
                        "assignee_email": {"type": "string"},
                    },
                    "required": ["space_id", "project_id", "task_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "list_task_comments",
                "description": "Read comments and nested replies on a task.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "space_id": {"type": "integer"},
                        "project_id": {"type": "integer"},
                        "task_id": {"type": "integer"},
                    },
                    "required": ["space_id", "project_id", "task_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "reply_to_comment",
                "description": "Reply to an existing task comment (or create a top-level comment if comment_id omitted).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "space_id": {"type": "integer"},
                        "project_id": {"type": "integer"},
                        "task_id": {"type": "integer"},
                        "comment_id": {
                            "type": "integer",
                            "description": "Parent comment id. Omit to post a new top-level comment.",
                        },
                        "body": {"type": "string"},
                    },
                    "required": ["space_id", "project_id", "task_id", "body"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "find_user",
                "description": "Find a company member by name or email to get their user id for assignment.",
                "parameters": {
                    "type": "object",
                    "properties": {"query": {"type": "string"}},
                    "required": ["query"],
                    "additionalProperties": False,
                },
            },
        },
    ]


def _user_spaces(ctx: ToolContext) -> list[Space]:
    return list(
        ctx.db.scalars(
            space_query()
            .join(SpaceMember, SpaceMember.space_id == Space.id)
            .where(
                Space.company_id == ctx.user.company_id,
                SpaceMember.user_id == ctx.user.id,
            )
            .order_by(Space.created_at.desc())
        )
        .unique()
        .all()
    )


def _resolve_user(ctx: ToolContext, *, user_id: int | None = None, email: str | None = None) -> User:
    if user_id is not None:
        user = ctx.db.scalar(
            select(User).where(User.id == user_id, User.company_id == ctx.user.company_id)
        )
        if user is None:
            raise ValueError(f"User id {user_id} not found in your company")
        return user
    if email:
        user = ctx.db.scalar(
            select(User).where(
                User.company_id == ctx.user.company_id,
                func.lower(User.email) == email.strip().lower(),
            )
        )
        if user is None:
            raise ValueError(f"No company member with email {email}")
        return user
    raise ValueError("Provide assignee_id or assignee_email")


def _get_project(ctx: ToolContext, space_id: int, project_id: int) -> tuple[Space, Project]:
    space = get_company_space(ctx.db, space_id, ctx.user.company_id)
    require_space_access(ctx.user, space)
    project = ctx.db.scalar(
        select(Project)
        .where(Project.id == project_id, Project.space_id == space_id)
        .options(selectinload(Project.memberships))
    )
    if project is None:
        raise ValueError("Project not found in that space")
    return space, project


def _get_stage(ctx: ToolContext, project_id: int, stage_name: str | None) -> ProjectStage:
    ensure_default_stages(ctx.db, project_id)
    stages = list(
        ctx.db.scalars(
            select(ProjectStage)
            .where(ProjectStage.project_id == project_id)
            .order_by(ProjectStage.position.asc())
        )
    )
    if not stages:
        raise ValueError("Project has no stages")
    if not stage_name:
        return stages[0]
    key = stage_name.strip().lower()
    for stage in stages:
        if stage.name.strip().lower() == key:
            return stage
    raise ValueError(f"Stage {stage_name!r} not found. Available: {[s.name for s in stages]}")


def _task_brief(task: ProjectTask) -> dict[str, Any]:
    return {
        "id": task.id,
        "title": task.title,
        "priority": getattr(task, "priority", None) or "medium",
        "stage": task.stage.name if task.stage else None,
        "project_id": task.project_id,
        "space_id": task.project.space_id if task.project else None,
        "assignee_id": task.assignee_id,
        "assignee": (task.assignee.full_name or task.assignee.email) if task.assignee else None,
    }


def get_workspace_summary(ctx: ToolContext, _args: dict[str, Any]) -> dict[str, Any]:
    spaces = _user_spaces(ctx)
    space_ids = [s.id for s in spaces]
    projects_count = 0
    if space_ids:
        projects_count = int(
            ctx.db.scalar(
                select(func.count()).select_from(Project).where(Project.space_id.in_(space_ids))
            )
            or 0
        )
    assigned_total = int(
        ctx.db.scalar(
            select(func.count()).select_from(ProjectTask).where(ProjectTask.assignee_id == ctx.user.id)
        )
        or 0
    )
    assigned_done = int(
        ctx.db.scalar(
            select(func.count())
            .select_from(ProjectTask)
            .join(ProjectStage, ProjectStage.id == ProjectTask.stage_id)
            .where(
                ProjectTask.assignee_id == ctx.user.id,
                func.lower(ProjectStage.name).in_(("done", "complete", "completed")),
            )
        )
        or 0
    )
    members = int(
        ctx.db.scalar(select(func.count()).select_from(User).where(User.company_id == ctx.user.company_id))
        or 0
    )
    return {
        "spaces": len(spaces),
        "projects": projects_count,
        "my_tasks_assigned_total": assigned_total,
        "my_tasks_assigned_open": max(assigned_total - assigned_done, 0),
        "my_tasks_assigned_done": assigned_done,
        "company_members": members,
        "you": {
            "id": ctx.user.id,
            "name": ctx.user.full_name,
            "email": ctx.user.email,
            "role": ctx.user.role.value if hasattr(ctx.user.role, "value") else str(ctx.user.role),
        },
    }


def list_spaces(ctx: ToolContext, _args: dict[str, Any]) -> dict[str, Any]:
    spaces = _user_spaces(ctx)
    return {
        "spaces": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "space_type": s.space_type.value if hasattr(s.space_type, "value") else str(s.space_type),
            }
            for s in spaces
        ]
    }


def create_space(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    name = str(args.get("name") or "").strip()
    if not name:
        raise ValueError("name is required")
    space = Space(
        name=name,
        description=(str(args["description"]).strip() if args.get("description") else None),
        company_id=ctx.user.company_id,
        created_by_id=ctx.user.id,
    )
    ctx.db.add(space)
    ctx.db.flush()
    ctx.db.add(SpaceMember(space_id=space.id, user_id=ctx.user.id))
    ctx.db.commit()
    return {"ok": True, "space": {"id": space.id, "name": space.name, "description": space.description}}


def update_space(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    space_id = int(args["space_id"])
    space = get_company_space(ctx.db, space_id, ctx.user.company_id)
    if not can_manage_space(ctx.user, space):
        raise ValueError("Not allowed to update this space")
    if args.get("name"):
        space.name = str(args["name"]).strip()
    if "description" in args:
        space.description = str(args["description"]).strip() if args["description"] is not None else None
    ctx.db.commit()
    return {"ok": True, "space": {"id": space.id, "name": space.name, "description": space.description}}


def _accessible_projects(ctx: ToolContext, *, space_id: int | None = None) -> list[Project]:
    spaces = _user_spaces(ctx)
    space_by_id = {s.id: s for s in spaces}
    space_ids = list(space_by_id)
    if space_id is not None:
        if space_id not in space_by_id:
            raise ValueError("You do not have access to that space")
        space_ids = [space_id]
    if not space_ids:
        return []
    query = (
        select(Project)
        .where(Project.space_id.in_(space_ids))
        .options(selectinload(Project.space))
        .order_by(Project.created_at.desc())
    )
    if ctx.user.role != UserRole.TENANT_OWNER:
        query = (
            select(Project)
            .outerjoin(
                ProjectMember,
                (ProjectMember.project_id == Project.id) & (ProjectMember.user_id == ctx.user.id),
            )
            .where(
                Project.space_id.in_(space_ids),
                or_(Project.created_by_id == ctx.user.id, ProjectMember.id.is_not(None)),
            )
            .options(selectinload(Project.space))
            .order_by(Project.created_at.desc())
        )
    return list(ctx.db.scalars(query).unique().all())


def _can_update_project(ctx: ToolContext, space: Space, project: Project) -> bool:
    """Creator or admin (tenant owner / space creator) only — not plain project members."""
    return can_manage_space(ctx.user, space) or project.created_by_id == ctx.user.id


def list_projects(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    space_id = int(args["space_id"]) if args.get("space_id") is not None else None
    projects = _accessible_projects(ctx, space_id=space_id)
    name_query = str(args.get("query") or "").strip().lower()
    if name_query:
        projects = [p for p in projects if name_query in (p.name or "").lower()]
    spaces = {s.id: s for s in _user_spaces(ctx)}
    return {
        "projects": [
            {
                "id": p.id,
                "name": p.name,
                "space_id": p.space_id,
                "space_name": p.space.name if p.space else None,
                "progress": p.progress,
                "status": p.status,
                "created_by_id": p.created_by_id,
                "can_update": _can_update_project(ctx, spaces[p.space_id], p)
                if p.space_id in spaces
                else False,
            }
            for p in projects
        ]
    }


def update_project(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    new_name = str(args["name"]).strip() if args.get("name") is not None else None
    if new_name is not None and not new_name:
        raise ValueError("name cannot be empty")
    if (
        new_name is None
        and "description" not in args
        and args.get("status") is None
    ):
        raise ValueError("Provide name, description, and/or status to update")

    project: Project | None = None
    space: Space | None = None
    if args.get("project_id") is not None:
        project_id = int(args["project_id"])
        space_id = int(args["space_id"]) if args.get("space_id") is not None else None
        if space_id is not None:
            space, project = _get_project(ctx, space_id, project_id)
        else:
            candidates = [p for p in _accessible_projects(ctx) if p.id == project_id]
            if not candidates:
                raise ValueError("Project not found or you do not have access")
            project = candidates[0]
            space = get_company_space(ctx.db, project.space_id, ctx.user.company_id)
    else:
        project_name = str(args.get("project_name") or "").strip()
        if not project_name:
            raise ValueError("Provide project_id or project_name")
        space_id = int(args["space_id"]) if args.get("space_id") is not None else None
        matches = [
            p
            for p in _accessible_projects(ctx, space_id=space_id)
            if (p.name or "").strip().lower() == project_name.lower()
        ]
        if not matches:
            # fallback: partial match
            matches = [
                p
                for p in _accessible_projects(ctx, space_id=space_id)
                if project_name.lower() in (p.name or "").lower()
            ]
        if not matches:
            raise ValueError(f"No accessible project matching {project_name!r}")
        if len(matches) > 1:
            return {
                "error": "Multiple projects matched; pass project_id",
                "matches": [
                    {"id": p.id, "name": p.name, "space_id": p.space_id} for p in matches
                ],
            }
        project = matches[0]
        space = get_company_space(ctx.db, project.space_id, ctx.user.company_id)

    assert space is not None and project is not None
    if not _can_update_project(ctx, space, project):
        raise ValueError(
            "Not allowed to rename this project. Only the project creator or an admin "
            "(company owner / space creator) can; being a project member is not enough."
        )

    if new_name is not None:
        project.name = new_name
    if "description" in args:
        project.description = (
            str(args["description"]).strip() if args["description"] is not None else None
        )
    if args.get("status") is not None:
        project.status = str(args["status"])

    ctx.db.commit()
    return {
        "ok": True,
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "space_id": project.space_id,
        },
    }


def list_my_tasks(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    include_created = bool(args.get("include_created"))
    conditions = [ProjectTask.assignee_id == ctx.user.id]
    if include_created:
        conditions = [or_(ProjectTask.assignee_id == ctx.user.id, ProjectTask.created_by_id == ctx.user.id)]
    tasks = list(
        ctx.db.scalars(
            select(ProjectTask)
            .where(*conditions)
            .options(
                selectinload(ProjectTask.stage),
                selectinload(ProjectTask.assignee),
                selectinload(ProjectTask.project).selectinload(Project.space),
            )
            .order_by(ProjectTask.updated_at.desc())
            .limit(50)
        )
    )
    return {"tasks": [_task_brief(t) for t in tasks], "count": len(tasks)}


def create_task(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    space_id = int(args["space_id"])
    project_id = int(args["project_id"])
    title = str(args.get("title") or "").strip()
    if not title:
        raise ValueError("title is required")
    _space, project = _get_project(ctx, space_id, project_id)
    stage = _get_stage(ctx, project_id, args.get("stage_name"))
    assignee_id = None
    if args.get("assignee_id") is not None or args.get("assignee_email"):
        assignee = _resolve_user(
            ctx,
            user_id=int(args["assignee_id"]) if args.get("assignee_id") is not None else None,
            email=args.get("assignee_email"),
        )
        member_ids = {m.user_id for m in project.memberships} | {project.created_by_id}
        if assignee.id not in member_ids and ctx.user.role != UserRole.TENANT_OWNER:
            # Tenant owners / managers often assign after adding — still require project membership for fairness
            pass
        if assignee.id not in member_ids:
            # Auto-add as project member so assignment is valid
            ctx.db.add(ProjectMember(project_id=project.id, user_id=assignee.id))
            ctx.db.flush()
        assignee_id = assignee.id

    priority = str(args.get("priority") or "medium").lower()
    if priority not in {"low", "medium", "high"}:
        priority = "medium"

    task = ProjectTask(
        project_id=project_id,
        stage_id=stage.id,
        title=title,
        description=(str(args["description"]).strip() if args.get("description") else None),
        priority=priority,
        position=next_task_position(ctx.db, stage.id),
        assignee_id=assignee_id,
        created_by_id=ctx.user.id,
    )
    ctx.db.add(task)
    ctx.db.flush()
    recalculate_project_progress(ctx.db, project_id)
    if assignee_id is not None:
        actor_label = ctx.user.full_name or ctx.user.email
        notify_user(
            ctx.db,
            user_id=assignee_id,
            actor_id=ctx.user.id,
            type="task_assigned",
            title=f"Assigned to “{task.title}”",
            body=f"{actor_label} assigned you this task via AI assistant.",
            link=f"/app/spaces/{space_id}/projects/{project_id}",
        )
    ctx.db.commit()
    created = ctx.db.scalar(
        select(ProjectTask)
        .where(ProjectTask.id == task.id)
        .options(
            selectinload(ProjectTask.stage),
            selectinload(ProjectTask.assignee),
            selectinload(ProjectTask.project).selectinload(Project.space),
        )
    )
    return {"ok": True, "task": _task_brief(created)}


def assign_task(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    space_id = int(args["space_id"])
    project_id = int(args["project_id"])
    task_id = int(args["task_id"])
    _space, project = _get_project(ctx, space_id, project_id)
    task = ctx.db.scalar(
        select(ProjectTask)
        .where(ProjectTask.id == task_id, ProjectTask.project_id == project_id)
        .options(selectinload(ProjectTask.stage), selectinload(ProjectTask.assignee), selectinload(ProjectTask.project))
    )
    if task is None:
        raise ValueError("Task not found")
    assignee = _resolve_user(
        ctx,
        user_id=int(args["assignee_id"]) if args.get("assignee_id") is not None else None,
        email=args.get("assignee_email"),
    )
    member_ids = {m.user_id for m in project.memberships} | {project.created_by_id}
    if assignee.id not in member_ids:
        ctx.db.add(ProjectMember(project_id=project.id, user_id=assignee.id))
        ctx.db.flush()
    previous = task.assignee_id
    task.assignee_id = assignee.id
    ctx.db.flush()
    if assignee.id != previous:
        actor_label = ctx.user.full_name or ctx.user.email
        notify_user(
            ctx.db,
            user_id=assignee.id,
            actor_id=ctx.user.id,
            type="task_assigned",
            title=f"Assigned to “{task.title}”",
            body=f"{actor_label} assigned you this task via AI assistant.",
            link=f"/app/spaces/{space_id}/projects/{project_id}",
        )
    ctx.db.commit()
    ctx.db.refresh(task)
    task = ctx.db.scalar(
        select(ProjectTask)
        .where(ProjectTask.id == task.id)
        .options(
            selectinload(ProjectTask.stage),
            selectinload(ProjectTask.assignee),
            selectinload(ProjectTask.project).selectinload(Project.space),
        )
    )
    return {"ok": True, "task": _task_brief(task)}


def list_task_comments(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    space_id = int(args["space_id"])
    project_id = int(args["project_id"])
    task_id = int(args["task_id"])
    _get_project(ctx, space_id, project_id)
    task = ctx.db.scalar(select(ProjectTask).where(ProjectTask.id == task_id, ProjectTask.project_id == project_id))
    if task is None:
        raise ValueError("Task not found")
    comments = list(
        ctx.db.scalars(
            comment_query()
            .where(TaskComment.task_id == task_id, TaskComment.parent_id.is_(None))
            .order_by(TaskComment.created_at.asc())
        )
    )

    payload = []
    for comment in comments:
        read = comment_with_replies(comment)
        payload.append(
            {
                "id": read.id,
                "body": read.body,
                "author": read.author.full_name or read.author.email,
                "author_id": read.author_id,
                "created_at": read.created_at.isoformat() if read.created_at else None,
                "replies": [
                    {
                        "id": r.id,
                        "body": r.body,
                        "author": r.author.full_name or r.author.email,
                        "author_id": r.author_id,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                        "replies": [
                            {
                                "id": n.id,
                                "body": n.body,
                                "author": n.author.full_name or n.author.email,
                                "author_id": n.author_id,
                            }
                            for n in r.replies
                        ],
                    }
                    for r in read.replies
                ],
            }
        )
    return {"task_id": task_id, "comments": payload, "count": len(payload)}


def reply_to_comment(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    space_id = int(args["space_id"])
    project_id = int(args["project_id"])
    task_id = int(args["task_id"])
    body = str(args.get("body") or "").strip()
    if not body:
        raise ValueError("body is required")
    _get_project(ctx, space_id, project_id)
    task = ctx.db.scalar(select(ProjectTask).where(ProjectTask.id == task_id, ProjectTask.project_id == project_id))
    if task is None:
        raise ValueError("Task not found")
    parent_id = int(args["comment_id"]) if args.get("comment_id") is not None else None
    if parent_id is not None:
        parent = ctx.db.scalar(
            select(TaskComment).where(TaskComment.id == parent_id, TaskComment.task_id == task_id)
        )
        if parent is None:
            raise ValueError("Parent comment not found on this task")
    created = save_comment_row(
        ctx.db,
        task_id=task_id,
        author_id=ctx.user.id,
        body=body,
        parent_id=parent_id,
        mention_ids=[],
    )
    return {
        "ok": True,
        "comment": {
            "id": created.id,
            "body": created.body,
            "parent_id": created.parent_id,
            "author_id": created.author_id,
        },
    }


def find_user(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    query = str(args.get("query") or "").strip()
    if not query:
        raise ValueError("query is required")
    like = f"%{query.lower()}%"
    users = list(
        ctx.db.scalars(
            select(User)
            .where(
                User.company_id == ctx.user.company_id,
                or_(func.lower(User.email).like(like), func.lower(User.full_name).like(like)),
            )
            .limit(10)
        )
    )
    return {
        "users": [
            {"id": u.id, "full_name": u.full_name, "email": u.email, "role": str(u.role)}
            for u in users
        ]
    }


TOOL_HANDLERS: dict[str, Callable[[ToolContext, dict[str, Any]], Any]] = {
    "get_workspace_summary": get_workspace_summary,
    "list_spaces": list_spaces,
    "create_space": create_space,
    "update_space": update_space,
    "list_projects": list_projects,
    "update_project": update_project,
    "list_my_tasks": list_my_tasks,
    "create_task": create_task,
    "assign_task": assign_task,
    "list_task_comments": list_task_comments,
    "reply_to_comment": reply_to_comment,
    "find_user": find_user,
}


def execute_tool(name: str, arguments: dict[str, Any] | str | None, ctx: ToolContext) -> str:
    if name not in TOOL_HANDLERS:
        return json.dumps({"error": f"Unknown tool: {name}"})
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments) if arguments.strip() else {}
        except json.JSONDecodeError:
            return json.dumps({"error": "Tool arguments were not valid JSON"})
    arguments = arguments or {}
    try:
        result = TOOL_HANDLERS[name](ctx, arguments)
        return json.dumps(result, default=str)
    except Exception as exc:  # noqa: BLE001 — return to model as tool error
        ctx.db.rollback()
        return json.dumps({"error": str(exc)})
