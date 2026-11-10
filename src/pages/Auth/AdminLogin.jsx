import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';

function AdminLogin() {
  const { loginWithCredentials } = usePortalData();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please enter both Admin Email/ID and Password.');
      return;
    }

    setLoading(true);
    try {
      await loginWithCredentials(identifier.trim(), password, 'ADMIN');
      navigate('/admin/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <ShieldCheck size={24} />
          </div>
          <p className="auth-portal-label">Student Guide Allocation Portal</p>
          <h1 className="auth-title">Admin Login</h1>
          <p className="auth-subtitle">
            Sign in with your administrator credentials to manage statistics, student/faculty directories, and bulk data imports.
          </p>
        </div>

        {errorMsg && (
          <AlertBanner variant="danger" title="Sign In Failed" message={errorMsg} />
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="admin-user-id" className="form-label">
              Email / Admin ID
            </label>
            <input
              id="admin-user-id"
              type="text"
              className="form-input"
              placeholder="Enter Admin Email or Admin ID (e.g., ADM001)"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password" className="form-label">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              className="form-input"
              placeholder="Enter Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
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

export default AdminLogin;
