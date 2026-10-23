import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  Check,
  Languages,
  LogOut,
  Boxes,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "../api";
import { LogoMark } from "./Logo";
import { Avatar } from "./Avatar";
import { CommandPalette } from "./CommandPalette";
import { formatNumber, formatToday } from "../lib/format";
import { LANGUAGES, lang, setLang, t } from "../i18n";

function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`lang-switch ${dark ? "lang-switch-dark" : ""}`} role="group" aria-label={t("Language")}>
      {LANGUAGES.map((item) => (
        <button
          key={item.code}
          type="button"
          className={item.code === lang ? "active" : ""}
          aria-pressed={item.code === lang}
          title={item.label}
          onClick={() => item.code !== lang && setLang(item.code)}
        >
          {item.short}
        </button>
      ))}
    </div>
  );
}

const navigation = [
  { to: "/", label: t("Overview"), icon: LayoutDashboard, end: true },
  { to: "/money", label: t("Money"), icon: Wallet },
  { to: "/orders", label: t("Orders"), icon: FolderKanban },
  { to: "/products", label: t("Products"), icon: Package },
  { to: "/materials", label: t("Materials"), icon: Boxes },
  { to: "/team", label: t("Team"), icon: Users },
  { to: "/clients", label: t("Clients"), icon: Building2 },
];

export function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetch("/api/me").then((r) => (r.ok ? (r.json() as Promise<{ username: string }>) : null)),
    staleTime: Infinity,
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
    setProfileOpen(false);
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

  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  const today = formatToday();
  const username = me?.username || "";

  return (
    <div className="app-frame">
      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label={t("Close navigation")}
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
              <div className="brand-sub">{t("SIGNAGE PRODUCTION")}</div>
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
              aria-label={t("Close menu")}
            >
              <X size={16} />
            </button>
          </div>

          <div className="nav-section">{t("Workspace")}</div>
          <nav className="nav-list" aria-label={t("Main navigation")}>
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
            <NavLink
              to="/agent"
              className={({ isActive }) => `nav-item nav-agent-trigger ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Sparkles />
              <span>{t("AI agent")}</span>
              <span className="nav-ai-tag">AI</span>
            </NavLink>
          </nav>

          <div className="sidebar-spacer" />

          {lowStockCount > 0 ? (
            <div className="sidebar-note">
              <div className="sidebar-note-title">
                <Boxes size={13} />
                {t("{n} stock items need attention", { n: lowStockCount })}
              </div>
              <div className="sidebar-note-copy">
                {t("{list} supplies are below their reorder level.", {
                  list: [...new Set(lowStock.map((item) => t(item.category)))].slice(0, 3).join(", "),
                })}
              </div>
              <NavLink to="/materials" className="sidebar-note-link">
                {t("Review inventory")} <ArrowUpRight size={11} />
              </NavLink>
            </div>
          ) : (
            <div className="sidebar-note" style={{ borderColor: "rgba(106,191,131,.16)" }}>
              <div className="sidebar-note-title" style={{ color: "#9dd4ae" }}>
                <Boxes size={13} />
                {t("Inventory looks healthy")}
              </div>
              <div className="sidebar-note-copy">{t("All materials are above their reorder levels.")}</div>
            </div>
          )}

          <div className="sidebar-user">
            <Avatar name={username || "?"} color="#b16a3e" size={32} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="sidebar-user-name">{username || "…"}</div>
              <a className="sidebar-user-role" href="/logout" style={{ textDecoration: "underline" }}>
                {t("Sign out")}
              </a>
            </div>
            <LanguageSwitch dark />
          </div>
          <div className="sidebar-live">
            <span className="live-dot" />
            {t("Kokand · All systems normal")}
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={() => setSidebarOpen(true)}
            aria-label={t("Open navigation")}
          >
            <Menu size={17} />
          </button>

          <button type="button" className="search-trigger" onClick={() => setSearchOpen(true)}>
            <Search size={14} />
            <span>{t("Search anything")}</span>
            <span className="kbd">⌘ K</span>
          </button>

          <div className="topbar-spacer" />

          <div className="topbar-context">
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-amber-deep)" }} />
            <strong>{t("Kokand")}</strong>
            <span>· {today}</span>
          </div>

          <NavLink
            to="/agent"
            className={({ isActive }) => `icon-btn ai-topbar-btn ${isActive ? "active" : ""}`}
            aria-label={t("Open AI agent")}
            title={t("Open AI agent")}
          >
            <Sparkles size={16} />
          </NavLink>

          <div style={{ position: "relative" }} ref={notificationRef}>
            <button
              type="button"
              className="icon-btn"
              aria-label={t("Notifications")}
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
                      {t("Needs attention")}
                    </div>
                    <div className="card-subtitle" style={{ fontSize: 9 }}>
                      {t("Live operational alerts")}
                    </div>
                  </div>
                  <span className="badge badge-low">{t("{n} low", { n: formatNumber(lowStockCount) })}</span>
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
                            {t("{qty} {unit} left · reorder at {min}", {
                              qty: formatNumber(material.stock, 1),
                              unit: t(material.unit),
                              min: formatNumber(material.minStock, 1),
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "18px 0", fontSize: 10, color: "var(--color-muted)", textAlign: "center" }}>
                      {t("No active alerts. Everything is running smoothly.")}
                    </div>
                  )}
                </div>
                <div className="notification-foot">
                  <NavLink to="/materials" className="card-link" onClick={() => setNotificationsOpen(false)}>
                    {t("Open inventory")} <ArrowUpRight size={12} />
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }} ref={profileRef}>
            <button
              type="button"
              className="profile-trigger"
              aria-label={t("Profile")}
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((current) => !current)}
            >
              <Avatar name={username || "?"} color="#b16a3e" size={37} />
            </button>
            {profileOpen && (
              <div className="notification-panel profile-panel" style={{ top: 47, right: 0 }}>
                <div className="profile-head">
                  <Avatar name={username || "?"} color="#b16a3e" size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div className="card-title" style={{ fontSize: 13 }}>{username}</div>
                    <div className="card-subtitle" style={{ fontSize: 10 }}>{t("Signed in")}</div>
                  </div>
                </div>
                <div className="profile-section">
                  <div className="profile-label">
                    <Languages size={13} /> {t("Language")}
                  </div>
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className={`profile-option ${item.code === lang ? "active" : ""}`}
                      onClick={() => item.code !== lang && setLang(item.code)}
                    >
                      <span>{item.label}</span>
                      {item.code === lang && <Check size={14} />}
                    </button>
                  ))}
                </div>
                <div className="profile-section">
                  <a className="profile-option profile-logout" href="/logout">
                    <span>{t("Sign out")}</span>
                    <LogOut size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
