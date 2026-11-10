function StatCard({ label, value, note, icon: Icon }) {
  return (
    <div className="stat-card">
      <div>
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
        {note && <p className="stat-card-note">{note}</p>}
      </div>
      {Icon && (
        <div className="stat-card-icon">
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}

export default StatCard;

