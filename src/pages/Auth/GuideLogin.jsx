import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, KeyRound } from 'lucide-react';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';

function GuideLogin() {
  const {
    loginWithCredentials,
    activateFirstLoginAccount,
  } = usePortalData();

  const [mode, setMode] = useState('login');
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
        title: 'Faculty ID Required',
        message: 'Enter your Faculty ID or Email.',
      });
      return;
    }

    setLoading(true);
    try {
      await loginWithCredentials(trimmed, password, 'FACULTY');
      navigate('/guide/dashboard');
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('first-login password setup')) {
        setFeedback({
          variant: 'info',
          title: 'First-Time Password Setup Required',
          message:
            'Set your personal password below using your Faculty ID or Email to activate your account.',
        });
        setMode('activate');
      } else if (!password.trim()) {
        setFeedback({
          variant: 'danger',
          title: 'Password Required',
          message: 'Please enter your faculty password.',
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
          'Enter your Faculty ID or Email and a personal password of at least 6 characters.',
      });
      return;
    }

    setLoading(true);
    try {
      await activateFirstLoginAccount(
        userId.trim(),
        newPassword,
        'FACULTY'
      );
      navigate('/guide/dashboard');
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
            {mode === 'activate' ? <KeyRound size={24} /> : <BookOpen size={24} />}
          </div>
          <p className="auth-portal-label">Student Guide Allocation Portal</p>
          <h1 className="auth-title">
            {mode === 'activate' ? 'Activate Faculty Account' : 'Faculty / Guide Login'}
          </h1>
          <p className="auth-subtitle">
            {mode === 'activate'
              ? 'First-login password setup using your Faculty ID or Email.'
              : 'Sign in with your Faculty ID or Email to view allocated teams and manage project progress.'}
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
              <label htmlFor="guide-user-id" className="form-label">
                Email / Faculty ID
              </label>
              <input
                id="guide-user-id"
                type="text"
                className="form-input"
                placeholder="Enter Faculty ID or University Email"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="guide-password" className="form-label">
                Password
              </label>
              <input
                id="guide-password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="form-hint">
                First-time login after import? Switch to <strong>First-Time Activation</strong> to set your password using your Faculty ID or Email.
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleActivationSubmit}>
            <div className="form-group">
              <label htmlFor="activate-faculty-id" className="form-label">
                Email / Faculty ID
              </label>
              <input
                id="activate-faculty-id"
                type="text"
                className="form-input"
                placeholder="Enter Faculty ID or Email"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="activate-faculty-password" className="form-label">
                Set Personal Password
              </label>
              <input
                id="activate-faculty-password"
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

export default GuideLogin;
