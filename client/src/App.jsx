import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './auth/AuthContext.jsx';
import DemoBanner from './components/DemoBanner.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import BrowseCoursesPage from './pages/BrowseCoursesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CoursePage from './pages/CoursePage.jsx';
import AssignmentPage from './pages/AssignmentPage.jsx';
import GradesPage from './pages/GradesPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import RequireRole from './components/RequireRole.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminCoursesPage from './pages/AdminCoursesPage.jsx';
import AdminCoursePage from './pages/AdminCoursePage.jsx';

// Each <Route> says: "when the URL is this path, show this page".
export default function App() {
  return (
    <AuthProvider>
      <DemoBanner />
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/courses" element={<BrowseCoursesPage />} />

        {/* Pages inside here need a login */}
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses/:id" element={<CoursePage />} />
          <Route path="/assignments/:id" element={<AssignmentPage />} />
          <Route path="/grades" element={<GradesPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* Pages inside here are for admins only */}
          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/courses" element={<AdminCoursesPage />} />
            <Route path="/admin/courses/:id" element={<AdminCoursePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
