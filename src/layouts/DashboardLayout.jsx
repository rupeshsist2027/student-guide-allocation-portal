import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import { usePortalData } from '../context/PortalDataContext';

function DashboardLayout({ roleLabel, userLabel, userInitial, navItems, headerExtra }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logoutAuth } = usePortalData();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAuth();
    setSidebarOpen(false);
    navigate('/');
  };

  return (
    <div className="dashboard-shell">
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        roleLabel={roleLabel}
        navItems={navItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="dashboard-main">
        <TopNavbar
          portalTitle="Student Guide Allocation Portal"
          userLabel={userLabel}
          userInitial={userInitial}
          onMenuClick={() => setSidebarOpen(true)}
          headerExtra={headerExtra}
        />

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
