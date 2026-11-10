import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

function RoleCard({ icon: Icon, title, description, loginPath }) {
  return (
    <div className="role-card">
      <div className="role-card-top">
        <div className="role-card-icon">
          <Icon size={24} />
        </div>
        <h3 className="role-card-title">{title}</h3>
        <p className="role-card-description">{description}</p>
      </div>
      <Link to={loginPath} className="btn btn-primary btn-full">
        <span>Login</span>
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

export default RoleCard;

