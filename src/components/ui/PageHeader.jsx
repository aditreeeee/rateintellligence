import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function PageHeader({ crumbs = [], title, subtitle, actions }) {
  return (
    <div className="page-header">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            {i > 0 && <ChevronRight />}
            {i === crumbs.length - 1 || !c.to ? (
              <span className="current">{c.label}</span>
            ) : (
              <Link to={c.to}>{c.label}</Link>
            )}
          </span>
        ))}
      </nav>
      <div className="page-header__row">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </div>
  );
}
