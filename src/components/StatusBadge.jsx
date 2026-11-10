function StatusBadge({ text, variant = 'info' }) {
  return <span className={`status-badge status-badge--${variant}`}>{text}</span>;
}

export default StatusBadge;

