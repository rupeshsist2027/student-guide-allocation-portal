import { ShieldCheck, BookOpen, GraduationCap } from 'lucide-react';
import RoleCard from '../../components/RoleCard';
import portalLogo from '../../assets/portal-logo.svg';

const ROLES = [
  {
    id: 'admin',
    title: 'Admin',
    icon: ShieldCheck,
    description:
      'Manage student records, faculty guides, academic subjects, and oversee guide allocations across departments.',
    loginPath: '/login/admin',
  },
  {
    id: 'guide',
    title: 'Guide / Faculty',
    icon: BookOpen,
    description:
      'Review student project requests, manage assigned mentees, publish project topics, and track allocation slots.',
    loginPath: '/login/guide',
  },
  {
    id: 'student',
    title: 'Student',
    icon: GraduationCap,
    description:
      'Browse available faculty guides, view project details, track guide allocation status, and stay updated with notices.',
    loginPath: '/login/student',
  },
];

function HomePage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <img
              src={portalLogo}
              alt="Student Guide Allocation Portal Logo"
              className="landing-logo"
            />
            <div>
              <p className="landing-brand-title">Student Guide Allocation Portal</p>
              <p className="landing-brand-subtitle">University Academic Project Management</p>
            </div>
          </div>
          <span className="landing-tag">Academic Portal</span>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <span className="landing-pill">University Project Mentorship System</span>
            <h1 className="landing-title">Student Guide Allocation Portal</h1>
            <p className="landing-description">
              A centralized university platform to streamline academic project guide
              assignment, faculty slot coordination, and student mentorship tracking
              for final-year and semester projects.
            </p>
          </div>
        </section>

        <section className="landing-roles-section" aria-label="Role selection">
          <div className="landing-section-heading">
            <h2>Select Your Role to Continue</h2>
            <p>Choose your portal role below to access your dedicated dashboard.</p>
          </div>

          <div className="role-cards-grid">
            {ROLES.map((role) => (
              <RoleCard
                key={role.id}
                icon={role.icon}
                title={role.title}
                description={role.description}
                loginPath={role.loginPath}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Student Guide Allocation Portal &bull; University Academic Department</p>
      </footer>
    </div>
  );
}

export default HomePage;

