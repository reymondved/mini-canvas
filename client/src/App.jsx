import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './auth/AuthContext.jsx';
import DemoBanner from './components/DemoBanner.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import BrowseCoursesPage from './pages/BrowseCoursesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MyCoursesPage from './pages/MyCoursesPage.jsx';
import CourseLayout from './pages/course/CourseLayout.jsx';
import AboutTab from './pages/course/AboutTab.jsx';
import AnnouncementsTab from './pages/course/AnnouncementsTab.jsx';
import AssignmentsTab from './pages/course/AssignmentsTab.jsx';
import ModulesTab from './pages/course/ModulesTab.jsx';
import GradesTab from './pages/course/GradesTab.jsx';
import PeopleTab from './pages/course/PeopleTab.jsx';
import AssignmentPage from './pages/AssignmentPage.jsx';
import GradesPage from './pages/GradesPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import AnnouncementPage from './pages/AnnouncementPage.jsx';
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
        <Route path="/catalog" element={<BrowseCoursesPage />} />

        {/* Pages inside here need a login */}
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<MyCoursesPage />} />

          {/* One course: CourseLayout (header + tabs) wraps whichever tab is open.
              "index" = /courses/1 itself, which opens the About tab. */}
          <Route path="/courses/:id" element={<CourseLayout />}>
            <Route index element={<Navigate to="about" replace />} />
            <Route path="about" element={<AboutTab />} />
            <Route path="announcements" element={<AnnouncementsTab />} />
            <Route path="assignments" element={<AssignmentsTab />} />
            <Route path="modules" element={<ModulesTab />} />
            <Route path="grades" element={<GradesTab />} />
            <Route path="people" element={<PeopleTab />} />
          </Route>

          <Route path="/assignments/:id" element={<AssignmentPage />} />
          <Route path="/grades" element={<GradesPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/announcements/:id" element={<AnnouncementPage />} />

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
