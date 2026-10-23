import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  Boxes,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "../api";
import { LogoMark } from "./Logo";
import { Avatar } from "./Avatar";
import { CommandPalette } from "./CommandPalette";
import { formatNumber } from "../lib/format";

const navigation = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/money", label: "Money", icon: Wallet },
  { to: "/orders", label: "Orders", icon: FolderKanban },
  { to: "/products", label: "Products", icon: Package },
  { to: "/materials", label: "Materials", icon: Boxes },
  { to: "/team", label: "Team", icon: Users },
  { to: "/clients", label: "Clients", icon: Building2 },
];

export function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
    staleTime: 45_000,
  });

  const lowStock = dashboard?.lowStock || [];
  const lowStockCount = dashboard?.stats.lowStockCount || 0;

  useEffect(() => {
    setSidebarOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notificationsOpen]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="app-frame">
      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="brand-lockup">
            <div className="brand-mark" style={{ color: "#f3f1e7" }}>
              <LogoMark size={25} />
            </div>
            <div>
              <div className="brand-name">ZD REKLAMA</div>
              <div className="brand-sub">SIGNAGE PRODUCTION</div>
            </div>
            <button
              type="button"
              className="icon-btn mobile-only"
              style={{
                marginLeft: "auto",
                borderColor: "rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.05)",
                color: "#fff",
              }}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          <div className="nav-section">Workspace</div>
          <nav className="nav-list" aria-label="Main navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon />
                  <span>{item.label}</span>
                  {item.to === "/materials" && lowStockCount > 0 && (
                    <span className="nav-badge">{lowStockCount}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="sidebar-spacer" />

          {lowStockCount > 0 ? (
            <div className="sidebar-note">
              <div className="sidebar-note-title">
                <Boxes size={13} />
                {lowStockCount} stock items need attention
              </div>
              <div className="sidebar-note-copy">
                {[...new Set(lowStock.map((item) => item.category))].slice(0, 3).join(", ")} supplies are below their reorder level.
              </div>
              <NavLink to="/materials" className="sidebar-note-link">
                Review inventory <ArrowUpRight size={11} />
              </NavLink>
            </div>
          ) : (
            <div className="sidebar-note" style={{ borderColor: "rgba(106,191,131,.16)" }}>
              <div className="sidebar-note-title" style={{ color: "#9dd4ae" }}>
                <Boxes size={13} />
                Inventory looks healthy
              </div>
              <div className="sidebar-note-copy">All materials are above their reorder levels.</div>
            </div>
          )}

          <div className="sidebar-user">
            <Avatar name="Madina Yusupova" color="#b16a3e" size={32} />
            <div>
              <div className="sidebar-user-name">Madina Yusupova</div>
              <div className="sidebar-user-role">Finance Manager</div>
            </div>
          </div>
          <div className="sidebar-live">
            <span className="live-dot" />
            Kokand · All systems normal
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={17} />
          </button>

          <button type="button" className="search-trigger" onClick={() => setSearchOpen(true)}>
            <Search size={14} />
            <span>Search anything</span>
            <span className="kbd">⌘ K</span>
          </button>

          <div className="topbar-spacer" />

          <div className="topbar-context">
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-amber-deep)" }} />
            <strong>Kokand</strong>
            <span>· {today}</span>
          </div>

          <div style={{ position: "relative" }} ref={notificationRef}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => setNotificationsOpen((current) => !current)}
            >
              <Bell size={16} />
              {lowStockCount > 0 && <span className="notification-dot" />}
            </button>
            {notificationsOpen && (
              <div className="notification-panel" style={{ top: 47, right: 0 }}>
                <div className="notification-head">
                  <div>
                    <div className="card-title" style={{ fontSize: 12 }}>
                      Needs attention
                    </div>
                    <div className="card-subtitle" style={{ fontSize: 9 }}>
                      Live operational alerts
                    </div>
                  </div>
                  <span className="badge badge-low">{formatNumber(lowStockCount)} low</span>
                </div>
                <div className="notification-body">
                  {lowStock.length ? (
                    lowStock.map((material) => (
                      <div className="notification-item" key={material.id}>
                        <div className="material-glyph">
                          <Boxes size={12} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <strong>{material.name}</strong>
                          <span>
                            {formatNumber(material.stock, 1)} {material.unit} left · reorder at {formatNumber(material.minStock, 1)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "18px 0", fontSize: 10, color: "var(--color-muted)", textAlign: "center" }}>
                      No active alerts. Everything is running smoothly.
                    </div>
                  )}
                </div>
                <div className="notification-foot">
                  <NavLink to="/materials" className="card-link" onClick={() => setNotificationsOpen(false)}>
                    Open inventory <ArrowUpRight size={12} />
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          <NavLink to="/team" aria-label="Open team profile">
            <Avatar name="Madina Yusupova" color="#b16a3e" size={37} />
          </NavLink>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
