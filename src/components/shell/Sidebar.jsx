import { NavLink } from "react-router-dom";
import {
  Waves, LayoutDashboard, Building2, BedDouble, Layers, CalendarDays,
  BarChart3, Settings, PanelLeftClose,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/rooms", label: "Rooms", icon: BedDouble },
  { to: "/rate-plans", label: "Rate Plans", icon: Layers },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/comparison", label: "Rate Comparison", icon: BarChart3 },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}>
      <span className="nav-item__link">
        <Icon />
        <span className="nav-item__label">{label}</span>
      </span>
    </NavLink>
  );
}

export default function Sidebar({ onToggleCollapse }) {
  return (
    <aside className="sidebar" aria-label="Sidebar navigation">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark"><Waves /></div>
        <div>
          <div className="sidebar__brand-text">RateIQ</div>
          <div className="sidebar__brand-sub">Rate Intelligence Platform</div>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        <div className="nav-group">
          <div className="nav-group__label">Workspace</div>
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavItem {...item} />
              </li>
            ))}
          </ul>
        </div>
        <div className="nav-group">
          <div className="nav-group__label">System</div>
          <ul>
            <li>
              <NavItem to="/settings" label="Settings" icon={Settings} />
            </li>
          </ul>
        </div>
      </nav>

      <div className="sidebar__footer">
        <button className="sidebar__collapse-btn" type="button" onClick={onToggleCollapse}>
          <PanelLeftClose />
          <span className="sidebar__collapse-label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}
