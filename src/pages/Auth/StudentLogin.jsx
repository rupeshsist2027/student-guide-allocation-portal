import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, KeyRound } from 'lucide-react';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';

function StudentLogin() {
  const {
    loginWithCredentials,
    activateFirstLoginAccount,
  } = usePortalData();

  const [mode, setMode] = useState('login'); // 'login' | 'activate'
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const trimmed = userId.trim();
    if (!trimmed) {
      setFeedback({
        variant: 'warning',
        title: 'Register Number Required',
        message: 'Enter your Register Number or Email.',
      });
      return;
    }

    setLoading(true);
    try {
      await loginWithCredentials(trimmed, password, 'STUDENT');
      navigate('/student/dashboard');
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('first-login password setup')) {
        setFeedback({
          variant: 'info',
          title: 'First-Time Password Setup Required',
          message:
            'Set your personal password below using your Register Number or Email to activate your account.',
        });
        setMode('activate');
      } else if (!password.trim()) {
        setFeedback({
          variant: 'danger',
          title: 'Password Required',
          message: 'Please enter your account password.',
        });
      } else {
        setFeedback({
          variant: 'danger',
          title: 'Sign In Failed',
          message: msg || 'Sign in failed.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActivationSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    if (!userId.trim() || newPassword.length < 6) {
      setFeedback({
        variant: 'warning',
        title: 'All Fields Required',
        message:
          'Enter your Register Number or Email and a personal password of at least 6 characters.',
      });
      return;
    }

    setLoading(true);
    try {
      await activateFirstLoginAccount(
        userId.trim(),
        newPassword,
        'STUDENT'
      );
      navigate('/student/dashboard');
    } catch (err) {
      setFeedback({
        variant: 'danger',
        title: 'Activation Failed',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            {mode === 'activate' ? <KeyRound size={24} /> : <GraduationCap size={24} />}
          </div>
          <p className="auth-portal-label">Student Guide Allocation Portal</p>
          <h1 className="auth-title">
            {mode === 'activate' ? 'Activate Student Account' : 'Student Login'}
          </h1>
          <p className="auth-subtitle">
            {mode === 'activate'
              ? 'First-login password setup using your Register Number or Email.'
              : 'Sign in with your Register Number or Email to manage your team and guide selection.'}
          </p>
        </div>

        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`auth-mode-tab ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('login');
              setFeedback(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-mode-tab ${mode === 'activate' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('activate');
              setFeedback(null);
            }}
          >
            First-Time Activation
          </button>
        </div>

        {feedback && (
          <AlertBanner
            variant={feedback.variant}
            title={feedback.title}
            message={feedback.message}
          />
        )}

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="student-user-id" className="form-label">
                Email / Register Number
              </label>
              <input
                id="student-user-id"
                type="text"
                className="form-input"
                placeholder="Enter Register Number or University Email"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="student-password" className="form-label">
                Password
              </label>
              <input
                id="student-password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="form-hint">
                First-time login after import? Switch to <strong>First-Time Activation</strong> to set your password using your Register Number or Email.
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleActivationSubmit}>
            <div className="form-group">
              <label htmlFor="activate-student-id" className="form-label">
                Email / Register Number
              </label>
              <input
                id="activate-student-id"
                type="text"
                className="form-input"
                placeholder="Enter Register Number or Email"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="activate-student-password" className="form-label">
                Set Personal Password
              </label>
              <input
                id="activate-student-password"
                type="password"
                className="form-input"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Activating Account...' : 'Set Password & Sign In'}
            </button>
          </form>
        )}

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

export default StudentLogin;
