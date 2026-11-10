import { Menu } from 'lucide-react';

function TopNavbar({ portalTitle, userLabel, userInitial, onMenuClick, headerExtra }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <span className="topbar-portal-name">{portalTitle}</span>
      </div>

      <div className="topbar-right">
        {headerExtra}
        <div className="topbar-user-pill">
          <span className="topbar-avatar">{userInitial}</span>
          <span>{userLabel}</span>
        </div>
      </div>
    </header>
  );
}

export default TopNavbar;

