import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import DemoBanner from './components/DemoBanner.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import BrowseCoursesPage from './pages/BrowseCoursesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CoursePage from './pages/CoursePage.jsx';

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
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
