import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import styles from "./AppShell.module.css";
import { useAuth } from "../lib/AuthContext";
import { API_BASE } from "../lib/config";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export function AppShell({ navItems, children }: { navItems: NavItem[]; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const inAdmin = location.pathname.startsWith("/admin");

  async function handleLogout() {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandRow}>
          <div className={styles.logoTile}>
            <div className={styles.logoRing} />
          </div>
          <span className={styles.brandText}>Transcripts</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [styles.navItem, isActive ? styles.navItemActive : ""].join(" ")
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          {user?.isAdmin && (
            <Link className={styles.footerLink} to={inAdmin ? "/upload" : "/admin/users"}>
              {inAdmin ? "Back to app" : "Admin dashboard"}
            </Link>
          )}
          <button className={styles.footerLink} onClick={handleLogout}>
            Log out
          </button>
          <div className={styles.userRow}>
            <span className={styles.userInfo}>{user?.email}</span>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.page}>{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <div className={styles.pageSubtitle}>{subtitle}</div>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </div>
  );
}
