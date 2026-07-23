import { useState } from "react";
import { Building2, Users, PlugZap, BellRing, Database, KeyRound, ShieldCheck, Hammer } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { useData } from "../../context/DataContext";

const SECTIONS = [
  { key: "company", label: "Company &amp; Ownership", icon: Building2 },
  { key: "users", label: "Users &amp; Access", icon: Users },
  { key: "rbac", label: "Roles &amp; RBAC", icon: ShieldCheck },
  { key: "integrations", label: "Integrations", icon: PlugZap },
  { key: "notifications", label: "Notifications", icon: BellRing },
  { key: "data", label: "Data &amp; Import", icon: Database },
  { key: "api", label: "API Keys", icon: KeyRound },
];

function ComingSoon({ title, desc }) {
  return (
    <div className="card coming-soon-card">
      <div className="coming-soon-card__icon"><Hammer /></div>
      <div className="empty-state__title">{title}</div>
      <div className="empty-state__desc">{desc}</div>
      <span className="badge badge-info">Coming in Future Release</span>
    </div>
  );
}

export default function SettingsPage() {
  const { company } = useData();
  const [active, setActive] = useState("company");

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Settings" }]}
        title="Settings"
        subtitle="Workspace, ownership and system configuration. Full functionality arrives with backend integration."
      />

      <div className="form-page-grid">
        <aside className="card" style={{ padding: "var(--space-4)" }}>
          <nav className="settings-nav" aria-label="Settings sections">
            {SECTIONS.map((s) => (
              <a key={s.key} className={active === s.key ? "is-active" : ""} onClick={() => setActive(s.key)} style={{ cursor: "pointer" }}>
                <s.icon /> {s.label.replace("&amp;", "&")}
              </a>
            ))}
          </nav>
        </aside>

        {active === "company" ? (
          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Company &amp; Ownership</div>
                <div className="card__subtitle">The Company owns every Property in this workspace.</div>
              </div>
            </div>
            <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div className="company-strip" style={{ margin: 0 }}>
                <div className="company-strip__logo">{company.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                <div>
                  <div className="company-strip__name">{company.name}</div>
                  <div className="company-strip__meta">Company ID: {company.id}</div>
                </div>
              </div>
              <div>
                <div className="filter-panel__label">Company Owner</div>
                <div className="filter-option is-active" style={{ cursor: "default" }}>
                  <span className="filter-option__avatar">{company.owner.name.split(" ").map((w) => w[0]).join("")}</span>
                  <span><div>{company.owner.name}</div><div className="filter-option__meta">{company.owner.email}</div></span>
                  <span className="badge badge-yale">{company.owner.role}</span>
                </div>
              </div>
              <div>
                <div className="filter-panel__label">Company Admins</div>
                <div className="filter-option-list">
                  {company.admins.map((a) => (
                    <div className="filter-option" key={a.email} style={{ cursor: "default" }}>
                      <span className="filter-option__avatar">{a.name.split(" ").map((w) => w[0]).join("")}</span>
                      <span><div>{a.name}</div><div className="filter-option__meta">{a.email}</div></span>
                      <span className="badge badge-neutral">{a.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : active === "users" ? (
          <ComingSoon title="User Management" desc="Company Owners will be able to invite and manage Company Admins and Property-level users once ASP.NET Identity is integrated." />
        ) : active === "rbac" ? (
          <ComingSoon title="Roles & RBAC" desc="Enterprise role-based access control across Company, Property and Room levels arrives with the backend release." />
        ) : active === "integrations" ? (
          <ComingSoon title="Integrations" desc="HMS, REST API, and Python scraping service connections will be configured here once available." />
        ) : active === "notifications" ? (
          <ComingSoon title="Notifications" desc="Configure alerts for rate changes, competitor movements and rate plan approvals." />
        ) : active === "data" ? (
          <ComingSoon title="Data & Import" desc="Bulk import and HMS data sync tools will appear here." />
        ) : (
          <ComingSoon title="API Keys" desc="Manage API keys for REST integrations once authentication is available." />
        )}
      </div>
    </>
  );
}
