NextSpace AI — Production Bugs & Fixes (Interview Notes)

Project: NextSpace AI (FastAPI + React/Vite)
Deploy: Backend on Railway · Frontend on Vercel · DB Neon · Email Brevo · Files AWS S3
Context: End-to-end production QA after first cloud deploy; found and fixed real production issues.

Use these as STAR stories (Situation → Task → Action → Result).


1. Frontend calling Vercel instead of Railway (API 404 on login)

Severity: P0 — Login broken in production
Tags: Vite, env vars, build-time config, SPA hosting

Situation
After deploying frontend to Vercel and backend to Railway, login POST went to
https://next-space-ai.vercel.app/auth/login → 404. Backend lived on Railway.

Root cause
- VITE_API_URL was empty on Vercel.
- Fetch client used import.meta.env.VITE_API_URL || '', so requests became relative to the Vercel origin.
- Vite bakes env at build time — setting the var without redeploy is not enough.

Fix
1. Set VITE_API_URL=https://nextspace-ai-production.up.railway.app on Vercel (Production + Preview).
2. Redeploy frontend so the Railway URL is compiled into the JS bundle.
3. Verified baked asset contained railway.app.

Interview angle
“I traced Network tab → relative URL → empty Vite env → explained build-time vs runtime env, then fixed with correct Vercel env + redeploy.”


2. SPA deep links / refresh → Vercel 404

Severity: P0 — Direct /login, /app, /invite/:token broken
Tags: SPA routing, Vercel rewrites, client-side router

Situation
Client-side navigation from / worked, but hard refresh or opening /login directly showed Vercel’s 404 NOT_FOUND.

Root cause
No SPA fallback rewrite. Vercel looked for a real file at /login instead of serving index.html for React Router.

Fix
Added frontend/vercel.json with a rewrite: source /(.*) → destination /index.html.
Redeployed; /login, /register, /app, /invite/* all returned 200.

Interview angle
“Classic SPA hosting bug. Differentiated soft nav vs hard navigation; fixed with host rewrites without changing app routes.”


3. Invite emails timing out on Railway (SMTP blocked)

Severity: P1 — Invites created but email never arrived
Tags: SMTP, cloud networking, Brevo, HTTPS API fallback

Situation
POST /admin/invites returned email_sent: false, email_error: "timed out". Invite link still generated; users never got mail.

Root cause
- Local machine: Brevo SMTP 587 STARTTLS and 465 SSL both worked.
- Railway: outbound connect to SMTP ports timed out (network restriction).
- Existing SMTP_PASSWORD was an SMTP key (xsmtpsib-…), not a Brevo API key (xkeysib-…).

Fix
1. Hardened email service: SMTP SSL/STARTTLS attempts + clear errors.
2. Added Brevo HTTPS Transactional API path (works on Railway because it uses port 443).
3. Set BREVO_API_KEY + SMTP_PREFER_API=true on Railway.
4. Verified production: email_sent: true.

Interview angle
“Debugged env vs network: same credentials worked locally, failed on Railway. Identified SMTP egress block, switched to provider HTTPS API, clarified SMTP key ≠ API key.”


4. Dashboard “Open work” empty while Open count = 1

Severity: P2 — Misleading empty state
Tags: UX consistency, derived metrics, unassigned work

Situation
Completion gauge showed Open: 1, but “Open work” card said “No open work items.”

Root cause
Card rendered member_performance filtered to people with assigned/open work. Unassigned tasks counted in KPIs but not in that list.

Fix
Compute unassignedOpen = tasks_open - sum(member.open) and show an Unassigned row when > 0.

Interview angle
“Caught metric inconsistency between KPI and widget; fixed data presentation without changing backend schema.”


5. Auth header flash: “Welcome back, there” / “User”

Severity: P2 — Bad first paint on hard refresh
Tags: Zustand persist, auth hydration, UX

Situation
On hard refresh / new tab, header briefly showed placeholder “there” / “User” until /auth/me returned.

Root cause
Zustand persist only saved token, not user. Shell rendered before fetchMe() completed.

Fix
Persist token and user together. Still revalidate with fetchMe() on mount; failed /me still clears session.

Interview angle
“Balanced UX vs freshness: cache identity for instant chrome, revalidate in background.”


6. Closed ConfirmDialog still in accessibility tree

Severity: P3 — A11y noise
Tags: a11y, native dialog, React

Situation
Space detail a11y snapshot exposed “Check compliance?” even when dialog was closed.

Root cause
dialog element stayed mounted; closed native dialogs can still appear in the accessibility tree.

Fix
Return null when open === false so the dialog is unmounted when unused.


7. Label mismatch: “Work in progress” vs “In progress”

Severity: P3 — Copy consistency
Aligned analytics bar label with legend to “In progress”.


Supporting production learnings (also interview-worthy)

Railway env
Vars must be on the service, not only in local .env.
Takeaway: Local .env ≠ production.

Domain / port
App listened on $PORT / 8080; public domain pointed at wrong port → 502.
Takeaway: Health OK ≠ public routing OK.

CORS
Allowed Vercel origin; rejected others.
Takeaway: Explicit allowlist.

Vite Root Directory
Deploy from monorepo root with frontend as root directory, or rewrites break.
Takeaway: Monorepo deploy paths matter.

IDOR check
Other company’s /spaces/1 → 404 for new tenant.
Takeaway: Basic tenancy verification.


One-liner summary for interviews

“After shipping NextSpace to Vercel + Railway, I ran production QA: fixed empty Vite API URL, SPA rewrites, Railway SMTP egress via Brevo HTTPS API, and several UX/auth hydration bugs — then verified with live API + browser checks.”


Stack talking points

Backend: FastAPI, SQLAlchemy, JWT, Neon Postgres
Frontend: React, Vite, Zustand, React Query, React Router
Infra: Railway, Vercel, Brevo, AWS S3, CORS, health checks
Process: Reproduce → isolate (Network/logs/env) → fix → redeploy → verify
