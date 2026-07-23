import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("rateiq_sidebar_collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("rateiq_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    function onClick(e) {
      const btn = e.target.closest(".btn");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left - size / 2}px`;
      span.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(span);
      setTimeout(() => span.remove(), 600);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}>
      <div className="sidebar-overlay" onClick={() => setMobileOpen(false)}></div>
      <Sidebar onToggleCollapse={() => setCollapsed((v) => !v)} />
      <div className="shell-main">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
