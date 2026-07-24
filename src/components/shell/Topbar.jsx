import { useState, useRef, useEffect } from "react";
import { Search, Menu, Bell, CircleHelp, ChevronDown, User, Shield, Settings, LogOut, Star } from "lucide-react";
import { useData } from "../../context/DataContext";
import ChooseBenchmarkModal from "../properties/ChooseBenchmarkModal";

export default function Topbar({ onOpenMobile }) {
  const { company, benchmarkProperty } = useData();
  const [userOpen, setUserOpen] = useState(false);
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu-btn" type="button" aria-label="Open menu" onClick={onOpenMobile}>
        <Menu />
      </button>

      <div className="topbar__search">
        <Search />
        <input type="text" placeholder="Search properties, rooms, rate plans..." aria-label="Search" />
        <kbd>⌘K</kbd>
      </div>

      {benchmarkProperty && (
        <button
          type="button"
          className="benchmark-switcher"
          data-tooltip="Change Our Property (benchmark)"
          onClick={() => setBenchmarkModalOpen(true)}
        >
          <span className="benchmark-switcher__icon"><Star /></span>
          <span className="benchmark-switcher__body">
            <span className="benchmark-switcher__label">Our Property</span>
            <span className="benchmark-switcher__name">{benchmarkProperty.name}</span>
          </span>
          <ChevronDown className={`benchmark-switcher__chev ${benchmarkModalOpen ? "is-rotated" : ""}`} />
        </button>
      )}

      <div className="topbar__spacer"></div>

      <div className="topbar__actions">
        <button className="icon-btn" data-tooltip="Notifications" type="button">
          <Bell /><span className="icon-btn__dot"></span>
        </button>
        <button className="icon-btn" data-tooltip="Help & Docs" type="button">
          <CircleHelp />
        </button>
        <div className={`dropdown ${userOpen ? "is-open" : ""}`} ref={ref}>
          <div className="user-menu" onClick={() => setUserOpen((v) => !v)}>
            <div className="user-menu__avatar">{initials(company.owner.name)}</div>
            <div className="user-menu__info">
              <div className="user-menu__name">{company.owner.name}</div>
              <div className="user-menu__role">{company.owner.role}</div>
            </div>
            <ChevronDown className="chev" style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
          </div>
          <div className="dropdown__menu">
            <div className="dropdown__note">{company.name}</div>
            <div className="dropdown__item"><User /> My Profile</div>
            <div className="dropdown__item"><Shield /> Roles &amp; Permissions</div>
            <div className="dropdown__item"><Settings /> Preferences</div>
            <div className="dropdown__divider"></div>
            <div className="dropdown__item danger"><LogOut /> Sign Out</div>
          </div>
        </div>
      </div>

      <ChooseBenchmarkModal open={benchmarkModalOpen} onClose={() => setBenchmarkModalOpen(false)} />
    </header>
  );
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
