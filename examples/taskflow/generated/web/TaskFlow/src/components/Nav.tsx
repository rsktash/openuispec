import { NavLink } from "react-router-dom";
import { t } from "../i18n";

export function SidebarNav(props: { currentPath: string }) {
  return (
    <aside className="sidebar-shell">
      <div className="brand-lockup">
        <div className="brand-mark">TF</div>
        <div>
          <p className="eyebrow">OpenUISpec</p>
          <h2>TaskFlow</h2>
        </div>
      </div>
      <nav className="nav-list">
        <NavItem to="/tasks" active={props.currentPath.startsWith("/tasks")}>{t("nav.tasks")}</NavItem>
        <NavItem to="/projects" active={props.currentPath.startsWith("/projects")}>{t("nav.projects")}</NavItem>
        <NavItem to="/calendar" active={props.currentPath.startsWith("/calendar")}>{t("nav.calendar")}</NavItem>
        <NavItem to="/settings" active={props.currentPath.startsWith("/settings") || props.currentPath.startsWith("/profile")}>{t("nav.settings")}</NavItem>
      </nav>
    </aside>
  );
}

export function BottomNav(props: { currentPath: string }) {
  return (
    <nav className="bottom-nav">
      <NavItem to="/tasks" active={props.currentPath.startsWith("/tasks")}>{t("nav.tasks")}</NavItem>
      <NavItem to="/projects" active={props.currentPath.startsWith("/projects")}>{t("nav.projects")}</NavItem>
      <NavItem to="/calendar" active={props.currentPath.startsWith("/calendar")}>{t("nav.calendar")}</NavItem>
      <NavItem to="/settings" active={props.currentPath.startsWith("/settings") || props.currentPath.startsWith("/profile")}>{t("nav.settings")}</NavItem>
    </nav>
  );
}

function NavItem(props: { to: string; active: boolean; children: string }) {
  return (
    <NavLink className={props.active ? "nav-item active" : "nav-item"} to={props.to}>
      {props.children}
    </NavLink>
  );
}
