export default function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{Icon && <Icon />}</div>
      <div className="empty-state__title">{title}</div>
      {desc && <div className="empty-state__desc">{desc}</div>}
      {action}
    </div>
  );
}
