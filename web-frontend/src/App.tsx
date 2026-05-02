import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './app/layouts/PublicLayout';
import { AdminLayout } from './app/layouts/AdminLayout';
import LoginPage from './public-pages/login';
import LandingPage from './public-pages/landing';
import DashboardPage from './admin/dashboard';
import UserManagementPage from './admin/users';
import DatabasePage from './admin/database';
import ImportPage from './admin/import';
import SurveysPage from './admin/surveys';
import SurveyBuilderEditor from './survey-builder/SurveyBuilderEditor';
import SurveyStatsPage from './survey-builder/SurveyStatsPage';
import ChartsPage from './viz-builder/charts';
import DashboardsPage from './viz-builder/dashboards';
import ReportsPage from './report-center';
import AcademicAnalyticsPage from './analytics/academic';
import InsertionAnalyticsPage from './analytics/insertion';
import PartnershipsPage from './admin/partnerships';
import SettingsPage from './admin/settings';
import PublicDashboardPage from './public-pages/dashboard-viewer';
import PublicSurveyPage from './public-pages/survey-form';
import { StudentLayout } from './app/layouts/StudentLayout';
import { TeacherLayout } from './app/layouts/TeacherLayout';
import { AlumniLayout } from './app/layouts/AlumniLayout';
import StudentDashboard from './portals/student/dashboard';
import StudentSurveysPage from './portals/student/surveys';
import StudentSurveyTakePage from './portals/student/survey-take';
import StudentMyDataPage from './portals/student/my-data';
import StudentDashboardsPage from './portals/student/dashboards';
import StudentProfilePage from './portals/student/profile';
import TeacherDashboard from './portals/teacher/dashboard';
import TeacherDashboardsPage from './portals/teacher/dashboards';
import TeacherSurveysPage from './portals/teacher/surveys';
import TeacherSurveyTakePage from './portals/teacher/survey-take';
import TeacherProfilePage from './portals/teacher/profile';
import AlumniDashboard from './portals/alumni/dashboard';
import AlumniProfilePage from './portals/alumni/profile';
import AlumniSurveysPage from './portals/alumni/surveys';
import AlumniSurveyTakePage from './portals/alumni/survey-take';
import AlumniDashboardsPage from './portals/alumni/dashboards';
import { ObservatoireLayout } from './app/layouts/ObservatoireLayout';
import ObservatoireDashboard from './portals/observatoire/dashboard';
import ObservatoireProfilePage from './portals/observatoire/profile';
import { AuthGuard } from './app/guards/AuthGuard';
import { RoleGuard } from './app/guards/RoleGuard';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/public/dashboards/:slug"
          element={<PublicDashboardPage />}
        />
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
<Route path="/admin/surveys/:id" element={<SurveyBuilderEditor />} />
<Route path="/admin/surveys/:id/stats" element={<SurveyStatsPage />} />
        <Route
          path="/admin/visualizations/charts"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <ChartsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/visualizations/dashboards"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <DashboardsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <ReportsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/analytics/academic"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <AcademicAnalyticsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/analytics/insertion"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <InsertionAnalyticsPage />
            </RoleGuard>
          }
        />
        <Route path="/admin/partnerships" element={<PartnershipsPage />} />
        <Route
          path="/admin/settings"
          element={
            <RoleGuard allowedRoles={['super_admin', 'admin']}>
              <SettingsPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route
        element={
          <AuthGuard>
            <RoleGuard allowedRoles={['etudiant']}>
              <StudentLayout />
            </RoleGuard>
          </AuthGuard>
        }
      >
        <Route path="/student" element={<Navigate to="/student/dashboard" />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/surveys" element={<StudentSurveysPage />} />
        <Route path="/student/surveys/:slug" element={<StudentSurveyTakePage />} />
        <Route path="/student/my-data" element={<StudentMyDataPage />} />
        <Route path="/student/dashboards" element={<StudentDashboardsPage />} />
        <Route path="/student/profile" element={<StudentProfilePage />} />
      </Route>

      <Route
        element={
          <AuthGuard>
            <RoleGuard allowedRoles={['enseignant']}>
              <TeacherLayout />
            </RoleGuard>
          </AuthGuard>
        }
      >
        <Route path="/teacher" element={<Navigate to="/teacher/dashboard" />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/dashboards" element={<TeacherDashboardsPage />} />
        <Route path="/teacher/surveys" element={<TeacherSurveysPage />} />
        <Route path="/teacher/surveys/:slug" element={<TeacherSurveyTakePage />} />
        <Route path="/teacher/profile" element={<TeacherProfilePage />} />
      </Route>

      <Route
        element={
          <AuthGuard>
            <RoleGuard allowedRoles={['alumni']}>
              <AlumniLayout />
            </RoleGuard>
          </AuthGuard>
        }
      >
        <Route path="/alumni" element={<Navigate to="/alumni/dashboard" />} />
        <Route path="/alumni/dashboard" element={<AlumniDashboard />} />
        <Route path="/alumni/profile" element={<AlumniProfilePage />} />
        <Route path="/alumni/surveys" element={<AlumniSurveysPage />} />
        <Route path="/alumni/surveys/:slug" element={<AlumniSurveyTakePage />} />
        <Route path="/alumni/dashboards" element={<AlumniDashboardsPage />} />
      </Route>

      <Route
        element={
          <AuthGuard>
            <RoleGuard allowedRoles={['responsable_observatoire']}>
              <ObservatoireLayout />
            </RoleGuard>
          </AuthGuard>
        }
      >
        <Route path="/observatoire" element={<Navigate to="/observatoire/dashboard" />} />
        <Route path="/observatoire/dashboard" element={<ObservatoireDashboard />} />
        <Route path="/observatoire/analytics/academic" element={<AcademicAnalyticsPage />} />
        <Route path="/observatoire/analytics/insertion" element={<InsertionAnalyticsPage />} />
        <Route path="/observatoire/surveys" element={<SurveysPage />} />
        <Route path="/observatoire/surveys/:id" element={<SurveyBuilderEditor />} />
        <Route path="/observatoire/surveys/:id/stats" element={<SurveyStatsPage />} />
        <Route path="/observatoire/charts" element={<ChartsPage />} />
        <Route path="/observatoire/reports" element={<ReportsPage />} />
        <Route path="/observatoire/profile" element={<ObservatoireProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;