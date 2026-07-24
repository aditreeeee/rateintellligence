import { useState, useRef, useEffect } from "react";
import { Search, Menu, Bell, CircleHelp, ChevronDown, User, Shield, Settings, LogOut } from "lucide-react";
import { useData } from "../../context/DataContext";
import CommandPalette from "./CommandPalette";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export default function Topbar({ onOpenMobile }) {
  const { company } = useData();
  const [userOpen, setUserOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const ref = useRef(null);

  function openPaletteWithQuery(q) {
    setPaletteQuery(q);
    setPaletteOpen(true);
  }

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu-btn" type="button" aria-label="Open menu" onClick={onOpenMobile}>
        <Menu />
      </button>

      <label className="topbar__search" htmlFor="global-search-input">
        <Search />
        <input
          id="global-search-input"
          type="text"
          value={paletteQuery}
          placeholder="Search properties, rooms, rate plans..."
          autoComplete="off"
          onFocus={() => setPaletteOpen(true)}
          onChange={(e) => openPaletteWithQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
        />
        <kbd>{isMac ? "⌘K" : "Ctrl+K"}</kbd>
      </label>

      <CommandPalette
        open={paletteOpen}
        query={paletteQuery}
        onQueryChange={setPaletteQuery}
        onClose={() => setPaletteOpen(false)}
      />

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
    </header>
  );
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
