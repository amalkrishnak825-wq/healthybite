export default function AdminPageHeader({ kicker, title, description, action }) {
  return (
    <div className="admin-title-row">
      <div className="admin-page-heading-copy">
        <span className="admin-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="admin-page-heading-action">{action}</div>}
    </div>
  );
}
