import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function LoginForm({
  roleTitle,
  subtitle,
  icon: Icon,
  idPlaceholder,
  dashboardPath,
}) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate(dashboardPath);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <Icon size={24} />
          </div>
          <p className="auth-portal-label">Student Guide Allocation Portal</p>
          <h1 className="auth-title">{roleTitle}</h1>
          <p className="auth-subtitle">{subtitle}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user-id" className="form-label">
              Email / User ID
            </label>
            <input
              id="user-id"
              type="text"
              className="form-input"
              placeholder={idPlaceholder}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            Login
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;

