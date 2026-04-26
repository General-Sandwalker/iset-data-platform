import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore } from './core/stores/theme.store';
import { PublicLayout } from './app/layouts/PublicLayout';
import { AdminLayout } from './app/layouts/AdminLayout';
import LoginPage from './public-pages/login';
import LandingPage from './public-pages/landing';
import DashboardPage from './admin/dashboard';
import UserManagementPage from './admin/users';
import DatabasePage from './admin/database';
import ImportPage from './admin/import';
import SurveysPage from './admin/surveys';
import ChartsPage from './viz-builder/charts';
import DashboardsPage from './viz-builder/dashboards';
import ReportsPage from './report-center';
import AcademicAnalyticsPage from './analytics/academic';
import InsertionAnalyticsPage from './analytics/insertion';
import PartnershipsPage from './admin/partnerships';
import SettingsPage from './admin/settings';
import PublicDashboardPage from './public-pages/dashboard-viewer';
import PublicSurveyPage from './public-pages/survey-form';
import StudentDashboard from './portals/student';
import TeacherDashboard from './portals/teacher';
import AlumniDashboard from './portals/alumni';
import EcoleDashboard from './portals/ecole';
import { AuthGuard } from './app guards/AuthGuard';
import { RoleGuard } from './app guards/RoleGuard';

function App() {
  const { isDarkMode } = useThemeStore();

  return (
    <BrowserRouter future={{ v7_startTransition: true }}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/public/dashboards/:slug" element={<PublicDashboardPage />} />
          <Route path="/public/surveys/:slug" element={<PublicSurveyPage />} />
        </Route>

        <Route
          element={
            <AuthGuard>
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/database" element={<DatabasePage />} />
          <Route path="/admin/import" element={<ImportPage />} />
          <Route path="/admin/surveys" element={<SurveysPage />} />
          <Route path="/admin/partnerships" element={<PartnershipsPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>

        <Route
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['super_admin', 'admin', 'responsable_observatoire']} />
            </AuthGuard>
          }
        >
          <Route path="/admin/visualizations/charts" element={<ChartsPage />} />
          <Route path="/admin/visualizations/dashboards" element={<DashboardsPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/analytics/academic" element={<AcademicAnalyticsPage />} />
          <Route path="/admin/analytics/insertion" element={<InsertionAnalyticsPage />} />
        </Route>

        <Route
          element={
            <AuthGuard>
              <StudentDashboard />
            </AuthGuard>
          }
        >
          <Route path="/student" element={<Navigate to="/student/dashboard" />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
        </Route>

        <Route
          element={
            <AuthGuard>
              <TeacherDashboard />
            </AuthGuard>
          }
        >
          <Route path="/teacher" element={<Navigate to="/teacher/dashboard" />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        </Route>

        <Route
          element={
            <AuthGuard>
              <AlumniDashboard />
            </AuthGuard>
          }
        >
          <Route path="/alumni" element={<Navigate to="/alumni/dashboard" />} />
          <Route path="/alumni/dashboard" element={<AlumniDashboard />} />
        </Route>

        <Route
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['responsable_observatoire']} />
            </AuthGuard>
          }
        >
          <Route path="/observatoire" element={<EcoleDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;