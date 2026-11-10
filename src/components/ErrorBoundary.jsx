import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage:
        error?.message || 'An unexpected UI error occurred while rendering this page.',
    };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof console !== 'undefined') {
      console.error('Portal ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-page">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div className="auth-header">
              <div className="auth-icon-wrap" style={{ margin: '0 auto 12px' }}>
                <AlertTriangle size={24} />
              </div>
              <p className="auth-portal-label">Student Guide Allocation Portal</p>
              <h1 className="auth-title">Something Went Wrong</h1>
              <p className="auth-subtitle">{this.state.errorMessage}</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button type="button" className="btn btn-primary" onClick={this.handleReload}>
                <RotateCcw size={16} />
                <span>Reload Page</span>
              </button>
              <button type="button" className="btn btn-outline" onClick={this.handleGoHome}>
                <span>Go Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

