import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { PublicLayout } from './app/layouts/PublicLayout';
import { AdminLayout } from './app/layouts/AdminLayout';
import { StudentLayout } from './app/layouts/StudentLayout';
import { TeacherLayout } from './app/layouts/TeacherLayout';
import { AlumniLayout } from './app/layouts/AlumniLayout';
import { ObservatoireLayout } from './app/layouts/ObservatoireLayout';
import { AuthGuard } from './app/guards/AuthGuard';
import { RoleGuard } from './app/guards/RoleGuard';

const LoginPage = lazy(() => import('./public-pages/login'));
const LandingPage = lazy(() => import('./public-pages/landing'));
const DashboardPage = lazy(() => import('./admin/dashboard'));
const UserManagementPage = lazy(() => import('./admin/users'));
const DatabasePage = lazy(() => import('./admin/database'));
const ImportPage = lazy(() => import('./admin/import'));
const SurveysPage = lazy(() => import('./admin/surveys'));
const SurveyBuilderEditor = lazy(() => import('./survey-builder/SurveyBuilderEditor'));
const SurveyStatsPage = lazy(() => import('./survey-builder/SurveyStatsPage'));
const ChartsPage = lazy(() => import('./viz-builder/charts'));
const DashboardsPage = lazy(() => import('./viz-builder/dashboards'));
const ReportsPage = lazy(() => import('./report-center'));
const AcademicAnalyticsPage = lazy(() => import('./analytics/academic'));
const InsertionAnalyticsPage = lazy(() => import('./analytics/insertion'));
const PartnershipsPage = lazy(() => import('./admin/partnerships'));
const SettingsPage = lazy(() => import('./admin/settings'));
const PublicDashboardPage = lazy(() => import('./public-pages/dashboard-viewer'));
const PublicSurveyPage = lazy(() => import('./public-pages/survey-form'));

const StudentDashboard = lazy(() => import('./portals/student/dashboard'));
const StudentSurveysPage = lazy(() => import('./portals/student/surveys'));
const StudentSurveyTakePage = lazy(() => import('./portals/student/survey-take'));
const StudentMyDataPage = lazy(() => import('./portals/student/my-data'));
const StudentDashboardsPage = lazy(() => import('./portals/student/dashboards'));
const StudentProfilePage = lazy(() => import('./portals/student/profile'));

const TeacherDashboard = lazy(() => import('./portals/teacher/dashboard'));
const TeacherDashboardsPage = lazy(() => import('./portals/teacher/dashboards'));
const TeacherSurveysPage = lazy(() => import('./portals/teacher/surveys'));
const TeacherSurveyTakePage = lazy(() => import('./portals/teacher/survey-take'));
const TeacherProfilePage = lazy(() => import('./portals/teacher/profile'));

const AlumniDashboard = lazy(() => import('./portals/alumni/dashboard'));
const AlumniProfilePage = lazy(() => import('./portals/alumni/profile'));
const AlumniSurveysPage = lazy(() => import('./portals/alumni/surveys'));
const AlumniSurveyTakePage = lazy(() => import('./portals/alumni/survey-take'));
const AlumniDashboardsPage = lazy(() => import('./portals/alumni/dashboards'));

const ObservatoireDashboard = lazy(() => import('./portals/observatoire/dashboard'));
const ObservatoireProfilePage = lazy(() => import('./portals/observatoire/profile'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Lazy><LandingPage /></Lazy>} />
        <Route path="/login" element={<Lazy><LoginPage /></Lazy>} />
        <Route
          path="/public/dashboards/:slug"
          element={<Lazy><PublicDashboardPage /></Lazy>}
        />
        <Route path="/public/surveys/:slug" element={<Lazy><PublicSurveyPage /></Lazy>} />
      </Route>

      <Route
        element={
          <AuthGuard>
            <AdminLayout />
          </AuthGuard>
        }
      >
        <Route path="/admin" element={<Lazy><DashboardPage /></Lazy>} />
        <Route path="/admin/users" element={<Lazy><UserManagementPage /></Lazy>} />
        <Route path="/admin/database" element={<Lazy><DatabasePage /></Lazy>} />
        <Route path="/admin/import" element={<Lazy><ImportPage /></Lazy>} />
        <Route path="/admin/surveys" element={<Lazy><SurveysPage /></Lazy>} />
        <Route path="/admin/surveys/:id" element={<Lazy><SurveyBuilderEditor /></Lazy>} />
        <Route path="/admin/surveys/:id/stats" element={<Lazy><SurveyStatsPage /></Lazy>} />
        <Route
          path="/admin/visualizations/charts"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <Lazy><ChartsPage /></Lazy>
            </RoleGuard>
          }
        />
        <Route
          path="/admin/visualizations/dashboards"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <Lazy><DashboardsPage /></Lazy>
            </RoleGuard>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <Lazy><ReportsPage /></Lazy>
            </RoleGuard>
          }
        />
        <Route
          path="/admin/analytics/academic"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <Lazy><AcademicAnalyticsPage /></Lazy>
            </RoleGuard>
          }
        />
        <Route
          path="/admin/analytics/insertion"
          element={
            <RoleGuard
              allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}
            >
              <Lazy><InsertionAnalyticsPage /></Lazy>
            </RoleGuard>
          }
        />
        <Route path="/admin/partnerships" element={<Lazy><PartnershipsPage /></Lazy>} />
        <Route
          path="/admin/settings"
          element={
            <RoleGuard allowedRoles={['super_admin', 'admin']}>
              <Lazy><SettingsPage /></Lazy>
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
        <Route path="/student/dashboard" element={<Lazy><StudentDashboard /></Lazy>} />
        <Route path="/student/surveys" element={<Lazy><StudentSurveysPage /></Lazy>} />
        <Route path="/student/surveys/:slug" element={<Lazy><StudentSurveyTakePage /></Lazy>} />
        <Route path="/student/my-data" element={<Lazy><StudentMyDataPage /></Lazy>} />
        <Route path="/student/dashboards" element={<Lazy><StudentDashboardsPage /></Lazy>} />
        <Route path="/student/profile" element={<Lazy><StudentProfilePage /></Lazy>} />
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
        <Route path="/teacher/dashboard" element={<Lazy><TeacherDashboard /></Lazy>} />
        <Route path="/teacher/dashboards" element={<Lazy><TeacherDashboardsPage /></Lazy>} />
        <Route path="/teacher/surveys" element={<Lazy><TeacherSurveysPage /></Lazy>} />
        <Route path="/teacher/surveys/:slug" element={<Lazy><TeacherSurveyTakePage /></Lazy>} />
        <Route path="/teacher/profile" element={<Lazy><TeacherProfilePage /></Lazy>} />
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
        <Route path="/alumni/dashboard" element={<Lazy><AlumniDashboard /></Lazy>} />
        <Route path="/alumni/profile" element={<Lazy><AlumniProfilePage /></Lazy>} />
        <Route path="/alumni/surveys" element={<Lazy><AlumniSurveysPage /></Lazy>} />
        <Route path="/alumni/surveys/:slug" element={<Lazy><AlumniSurveyTakePage /></Lazy>} />
        <Route path="/alumni/dashboards" element={<Lazy><AlumniDashboardsPage /></Lazy>} />
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
        <Route path="/observatoire/dashboard" element={<Lazy><ObservatoireDashboard /></Lazy>} />
        <Route path="/observatoire/analytics/academic" element={<Lazy><AcademicAnalyticsPage /></Lazy>} />
        <Route path="/observatoire/analytics/insertion" element={<Lazy><InsertionAnalyticsPage /></Lazy>} />
        <Route path="/observatoire/surveys" element={<Lazy><SurveysPage /></Lazy>} />
        <Route path="/observatoire/surveys/:id" element={<Lazy><SurveyBuilderEditor /></Lazy>} />
        <Route path="/observatoire/surveys/:id/stats" element={<Lazy><SurveyStatsPage /></Lazy>} />
        <Route path="/observatoire/charts" element={<Lazy><ChartsPage /></Lazy>} />
        <Route path="/observatoire/reports" element={<Lazy><ReportsPage /></Lazy>} />
        <Route path="/observatoire/profile" element={<Lazy><ObservatoireProfilePage /></Lazy>} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
