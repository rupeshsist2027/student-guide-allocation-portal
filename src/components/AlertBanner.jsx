import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const ICON_MAP = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

function AlertBanner({ variant = 'info', title, message }) {
  const Icon = ICON_MAP[variant] || Info;

  return (
    <div className={`alert alert--${variant}`} role="alert">
      <Icon size={18} className="alert-icon" />
      <div>
        {title && <p className="alert-title">{title}</p>}
        {message && <p className="alert-message">{message}</p>}
      </div>
    </div>
  );
}

export default AlertBanner;

