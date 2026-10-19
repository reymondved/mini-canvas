import { Routes, Route, Navigate } from 'react-router-dom';
import DemoBanner from './components/DemoBanner.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import BrowseCoursesPage from './pages/BrowseCoursesPage.jsx';
import HomePage from './pages/HomePage.jsx';

// Each <Route> says: "when the URL is this path, show this page".
export default function App() {
  return (
    <>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/courses" element={<BrowseCoursesPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
