import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CourseCatalogPage from './pages/courses/CourseCatalogPage';
import CourseDetailsPage from './pages/courses/CourseDetailsPage';
import CoursesAdminPage from './pages/courses/CoursesAdminPage';
import CourseOfferingsPage from './pages/courses/CourseOfferingsPage';
import EnrollPage from './pages/enrollment/EnrollPage';
import TimetablePage from './pages/enrollment/TimetablePage';
import AttendanceStudentPage from './pages/attendance/AttendanceStudentPage';
import AttendanceFacultyPage from './pages/attendance/AttendanceFacultyPage';
import ProfilePage from './pages/settings/ProfilePage';
import Spinner from './components/ui/Spinner';
import HostelApplicationPage from './pages/hostel/HostelApplicationPage';
import HostelAdminPage from './pages/hostel/HostelAdminPage';
import StudentRegistrationPage from './pages/auth/StudentRegistrationPage';
import EnrollmentAdminPage from './pages/enrollment/EnrollmentAdminPage';
import NotFoundPage from './pages/NotFoundPage';

import UserManagementPage from './pages/admin/UserManagementPage';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="courses/catalog" element={<CourseCatalogPage />} />
        <Route path="courses/:id" element={<CourseDetailsPage />} />
        <Route path="courses/manage" element={<RequireAuth roles={['admin']}><CoursesAdminPage /></RequireAuth>} />
        <Route path="courses/offerings" element={<RequireAuth roles={['admin','faculty']}><CourseOfferingsPage /></RequireAuth>} />
        <Route path="enrollment/browse" element={<RequireAuth roles={['student']}><EnrollPage /></RequireAuth>} />
        <Route path="enrollment/timetable" element={<RequireAuth roles={['student']}><TimetablePage /></RequireAuth>} />
        <Route path="attendance/my" element={<RequireAuth roles={['student']}><AttendanceStudentPage /></RequireAuth>} />
        <Route path="attendance/mark" element={<RequireAuth roles={['faculty']}><AttendanceFacultyPage /></RequireAuth>} />
        <Route path="hostel" element={<RequireAuth roles={['student']}><HostelApplicationPage /></RequireAuth>} />
        <Route path="hostel/admin" element={<RequireAuth roles={['admin']}><HostelAdminPage /></RequireAuth>} />

        <Route path="enrollment/admin" element={<RequireAuth roles={['admin']}><EnrollmentAdminPage /></RequireAuth>} />
        <Route path="users/manage" element={<RequireAuth roles={['admin']}><UserManagementPage /></RequireAuth>} />
        <Route path="register-student" element={<RequireAuth roles={['student']}><StudentRegistrationPage /></RequireAuth>} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '14px', borderRadius: '12px' },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
