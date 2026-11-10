import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Library,
  GitMerge,
  Upload,
  UserCircle,
  Lightbulb,
  TrendingUp,
  CalendarCheck,
  Bell,
  Settings,
  PlusCircle,
  Search,
  CheckSquare,
  ClipboardCheck,
  Sliders,
} from 'lucide-react';

import { PortalDataProvider, usePortalData } from './context/PortalDataContext';
import DashboardLayout from './layouts/DashboardLayout';
import HomePage from './pages/Home/HomePage';
import AdminLogin from './pages/Auth/AdminLogin';
import GuideLogin from './pages/Auth/GuideLogin';
import StudentLogin from './pages/Auth/StudentLogin';

import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminStudents from './pages/Admin/AdminStudents';
import AdminGuides from './pages/Admin/AdminGuides';
import AdminSubjects from './pages/Admin/AdminSubjects';
import AdminAllocation from './pages/Admin/AdminAllocation';
import TeamSettings from './pages/Admin/TeamSettings';
import BulkDataImport from './pages/Admin/BulkDataImport';
import AdminProfile from './pages/Admin/AdminProfile';

import GuideDashboard from './pages/Guide/GuideDashboard';
import GuideProfile from './pages/Guide/GuideProfile';
import GuideTeams from './pages/Guide/GuideTeams';
import GuideTopics from './pages/Guide/GuideTopics';
import GuideProgress from './pages/Guide/GuideProgress';
import GuideAvailability from './pages/Guide/GuideAvailability';
import GuideNotifications from './pages/Guide/GuideNotifications';
import GuideSettings from './pages/Guide/GuideSettings';

import StudentDashboard from './pages/Student/StudentDashboard';
import StudentProfile from './pages/Student/StudentProfile';
import CreateTeam from './pages/Student/CreateTeam';
import MyTeam from './pages/Student/MyTeam';
import StudentGuides from './pages/Student/StudentGuides';
import SelectGuide from './pages/Student/SelectGuide';
import StudentAllocation from './pages/Student/StudentAllocation';
import StudentNotifications from './pages/Student/StudentNotifications';

const ADMIN_NAV = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Team & Guide Capacity Settings', path: '/admin/team-settings', icon: Sliders },
  { label: 'Students', path: '/admin/students', icon: Users },
  { label: 'Guides', path: '/admin/guides', icon: BookOpen },
  { label: 'Subjects', path: '/admin/subjects', icon: Library },
  { label: 'Guide Allocation', path: '/admin/allocation', icon: GitMerge },
  { label: 'Bulk Data Import', path: '/admin/bulk-import', icon: Upload },
  { label: 'Profile', path: '/admin/profile', icon: UserCircle },
];

const GUIDE_NAV = [
  { label: 'Dashboard', path: '/guide/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', path: '/guide/profile', icon: UserCircle },
  { label: 'My Teams', path: '/guide/teams', icon: Users },
  { label: 'Project Topics', path: '/guide/topics', icon: Lightbulb },
  { label: 'Project Progress', path: '/guide/progress', icon: TrendingUp },
  { label: 'My Availability', path: '/guide/availability', icon: CalendarCheck },
  { label: 'Notifications', path: '/guide/notifications', icon: Bell },
  { label: 'Settings', path: '/guide/settings', icon: Settings },
];

const STUDENT_NAV = [
  { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', path: '/student/profile', icon: UserCircle },
  { label: 'Create Team', path: '/student/create-team', icon: PlusCircle },
  { label: 'My Team', path: '/student/my-team', icon: Users },
  { label: 'Browse Guides', path: '/student/guides', icon: Search },
  { label: 'Select Guide', path: '/student/select-guide', icon: CheckSquare },
  { label: 'My Allocation', path: '/student/allocation', icon: ClipboardCheck },
  { label: 'Notifications', path: '/student/notifications', icon: Bell },
];

function AdminPortalLayout() {
  const { authSession } = usePortalData();
  if (authSession?.role !== 'ADMIN') {
    return <Navigate to="/login/admin" replace />;
  }

  const labelName = authSession.fullName || authSession.username || 'Admin';
  const initial = labelName.charAt(0).toUpperCase() || 'A';

  return (
    <DashboardLayout
      roleLabel="Admin"
      userLabel={`${labelName} (${authSession.username})`}
      userInitial={initial}
      navItems={ADMIN_NAV}
    />
  );
}

function FacultyPortalLayout() {
  const { authSession, currentFaculty } = usePortalData();
  if (authSession?.role !== 'FACULTY' || !currentFaculty) {
    return <Navigate to="/login/guide" replace />;
  }

  const initial = currentFaculty.facultyName
    ? currentFaculty.facultyName
        .replace(/^Dr\.\s*|^Prof\.\s*/i, '')
        .charAt(0)
        .toUpperCase()
    : 'F';

  return (
    <DashboardLayout
      roleLabel="Faculty"
      userLabel={`${currentFaculty.facultyName} (${currentFaculty.facultyId})`}
      userInitial={initial}
      navItems={GUIDE_NAV}
    />
  );
}

function StudentPortalLayout() {
  const { authSession, currentStudent } = usePortalData();
  if (authSession?.role !== 'STUDENT' || !currentStudent) {
    return <Navigate to="/login/student" replace />;
  }

  const initial = currentStudent.name
    ? currentStudent.name.charAt(0).toUpperCase()
    : 'S';

  return (
    <DashboardLayout
      roleLabel="Student"
      userLabel={`${currentStudent.name} (${currentStudent.registerNumber})`}
      userInitial={initial}
      navItems={STUDENT_NAV}
    />
  );
}

function App() {
  return (
    <PortalDataProvider>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<HomePage />} />

        {/* Login Pages */}
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/login/guide" element={<GuideLogin />} />
        <Route path="/login/student" element={<StudentLogin />} />

        {/* Admin Portal */}
        <Route path="/admin" element={<AdminPortalLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="team-settings" element={<TeamSettings />} />
          <Route path="capacity-settings" element={<Navigate to="/admin/team-settings" replace />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="guides" element={<AdminGuides />} />
          <Route path="subjects" element={<AdminSubjects />} />
          <Route path="allocation" element={<AdminAllocation />} />
          <Route path="bulk-import" element={<BulkDataImport />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        {/* Guide (Faculty) Portal */}
        <Route path="/guide" element={<FacultyPortalLayout />}>
          <Route index element={<Navigate to="/guide/dashboard" replace />} />
          <Route path="dashboard" element={<GuideDashboard />} />
          <Route path="profile" element={<GuideProfile />} />
          <Route path="teams" element={<GuideTeams />} />
          <Route path="topics" element={<GuideTopics />} />
          <Route path="progress" element={<GuideProgress />} />
          <Route path="availability" element={<GuideAvailability />} />
          <Route path="notifications" element={<GuideNotifications />} />
          <Route path="settings" element={<GuideSettings />} />
        </Route>

        {/* Student Portal */}
        <Route path="/student" element={<StudentPortalLayout />}>
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="create-team" element={<CreateTeam />} />
          <Route path="my-team" element={<MyTeam />} />
          <Route path="guides" element={<StudentGuides />} />
          <Route path="select-guide" element={<SelectGuide />} />
          <Route path="allocation" element={<StudentAllocation />} />
          <Route path="notifications" element={<StudentNotifications />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PortalDataProvider>
  );
}

export default App;
