import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from './components/layout/AdminShell'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from './components/ui'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { AdminSpacesPage } from './pages/admin/AdminSpacesPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AiAssistantPage } from './pages/AiAssistantPage'
import { CompanyPage } from './pages/CompanyPage'
import { DashboardHomePage } from './pages/DashboardHomePage'
import { InboxPage } from './pages/InboxPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SpaceDetailPage } from './pages/SpaceDetailPage'
import { SpacesPage } from './pages/SpacesPage'
import { TasksPage } from './pages/TasksPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<DashboardHomePage />} />
            <Route path="spaces" element={<SpacesPage />} />
            <Route path="spaces/:spaceId" element={<SpaceDetailPage />} />
            <Route path="spaces/:spaceId/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="ai" element={<AiAssistantPage />} />
            <Route path="company" element={<CompanyPage />} />
          </Route>
          <Route path="/app/admin" element={<AdminShell />}>
            <Route index element={<Navigate to="spaces" replace />} />
            <Route path="spaces" element={<AdminSpacesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
