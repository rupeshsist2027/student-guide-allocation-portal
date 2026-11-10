import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import portalLogo from '../assets/portal-logo.svg';

function Sidebar({ roleLabel, navItems, isOpen, onClose, onLogout }) {
  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img
            src={portalLogo}
            alt="Portal Logo"
            className="sidebar-logo"
          />
          <div className="sidebar-brand-text">
            <span className="sidebar-title">Guide Allocation</span>
            <span className="sidebar-role">{roleLabel} Panel</span>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label={`${roleLabel} navigation`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'is-active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-link sidebar-logout"
          onClick={onLogout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

