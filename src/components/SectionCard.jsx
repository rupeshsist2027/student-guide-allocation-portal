function SectionCard({ title, subtitle, icon: Icon, flush = false, children }) {
  return (
    <section className="section-card">
      <div className="section-card-header">
        <h2 className="section-card-title">
          {Icon && <Icon size={18} />}
          <span>{title}</span>
        </h2>
        {subtitle && <span className="section-card-subtitle">{subtitle}</span>}
      </div>
      <div className={`section-card-body ${flush ? 'section-card-body--flush' : ''}`}>
        {children}
      </div>
    </section>
  );
}

export default SectionCard;

