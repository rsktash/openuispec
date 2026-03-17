import { type PropsWithChildren, useEffect, useMemo } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { Icon } from "../lib/icons";
import type { SizeClass } from "../lib/tokens";
import { cn, useSizeClass } from "../lib/utils";
import { selectUnreadNotifications, useAppStore } from "../state/store";
import { ActionButton, ActionGroup } from "./ui";

const primaryRoutes = [
  { to: "/home", icon: "home" as const, labelKey: "nav.home" },
  { to: "/discover", icon: "discover" as const, labelKey: "nav.discover" },
  { to: "/notifications", icon: "notifications" as const, labelKey: "nav.notifications" },
  { to: "/profile", icon: "profile" as const, labelKey: "nav.profile" },
];

export function AppShell() {
  const sizeClass = useSizeClass();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();
  const toast = useAppStore((state) => state.toast);
  const clearToast = useAppStore((state) => state.clearToast);
  const dialog = useAppStore((state) => state.dialog);
  const closeDialog = useAppStore((state) => state.closeDialog);
  const unreadCount = useAppStore(selectUnreadNotifications);

  const pageMeta = useMemo(() => resolvePageMeta(location.pathname, t), [location.pathname, t]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => clearToast(), 3000);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  return (
    <div className="min-h-screen bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-[color:rgba(91,82,163,0.12)] blur-3xl" />
        <div className="absolute bottom-[-8rem] right-[-4rem] h-80 w-80 rounded-full bg-[color:rgba(212,146,14,0.12)] blur-3xl" />
      </div>

      {sizeClass === "expanded" ? <DesktopSidebar unreadCount={unreadCount} /> : null}

      <div className={cn("min-h-screen", sizeClass === "expanded" && "pl-[304px]")}>
        <header className="sticky top-0 z-30 border-b border-[var(--color-border-default)] bg-[color:rgba(250,248,245,0.88)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 py-4 md:px-6 xl:px-8">
            {pageMeta.showBack ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="interactive-press rounded-cap-alternate border border-[var(--color-border-default)] p-2 text-[var(--color-text-primary)]"
                aria-label="Back"
              >
                <Icon name="back" className="h-5 w-5" />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{pageMeta.title}</p>
              {pageMeta.subtitle ? (
                <p className="truncate text-sm text-[var(--color-text-secondary)]">{pageMeta.subtitle}</p>
              ) : null}
            </div>
            <label className="hidden items-center gap-2 rounded-cap-primary border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm text-[var(--color-text-secondary)] sm:flex">
              <span>Lang</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as typeof locale)}
                className="bg-transparent font-medium text-[var(--color-text-primary)] outline-none"
              >
                <option value="en">EN</option>
                <option value="ru">RU</option>
                <option value="uz">UZ</option>
              </select>
            </label>
            <Link
              to="/settings"
              className="interactive-press rounded-cap-primary border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-2 text-[var(--color-text-primary)]"
              aria-label="Settings"
            >
              <Icon name="settings" className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <main>
          <Outlet />
        </main>

        {sizeClass !== "expanded" ? <BottomTabBar unreadCount={unreadCount} /> : null}

        {location.pathname.startsWith("/home") || location.pathname === "/" ? (
          <Link
            to="/create"
            className={cn(
              "interactive-press fixed z-30 flex h-14 w-14 items-center justify-center rounded-cap-primary bg-[var(--color-brand-primary)] text-white shadow-md",
              sizeClass === "expanded" ? "bottom-8 right-8" : "bottom-20 right-4",
            )}
            aria-label={t("nav.create")}
          >
            <Icon name="create_post" className="h-6 w-6" />
          </Link>
        ) : null}
      </div>

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="rounded-cap-primary bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-medium text-white shadow-md">
            {toast.message}
          </div>
        </div>
      ) : null}

      {dialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(28,27,26,0.35)] px-4">
          <div className="w-full max-w-md rounded-surface border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] p-6 shadow-lg">
            <h2 className="text-xl font-semibold">{dialog.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{dialog.message}</p>
            <ActionGroup className="mt-6 sm:flex-row sm:items-center sm:justify-end">
              {dialog.actions.map((action) => (
                <ActionButton
                  key={action.label}
                  variant={action.variant ?? "secondary"}
                  onClick={() => {
                    action.onPress();
                    closeDialog();
                  }}
                >
                  {action.label}
                </ActionButton>
              ))}
            </ActionGroup>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BottomTabBar({ unreadCount }: { unreadCount: number }) {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border-default)] bg-[color:rgba(250,248,245,0.94)] px-2 py-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
        {primaryRoutes.map((route) => (
          <NavLink
            key={route.to}
            to={route.to}
            className={({ isActive }) =>
              cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-cap-primary px-2 text-[11px] font-medium transition",
                isActive
                  ? "bg-[var(--color-surface-secondary)] text-[var(--color-brand-primary)]"
                  : "text-[var(--color-text-tertiary)]",
              )
            }
          >
            <Icon name={route.icon} className="h-5 w-5" />
            <span>{t(route.labelKey)}</span>
            {route.to === "/notifications" && unreadCount > 0 ? (
              <span className="absolute right-3 top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-brand-accent)] px-1.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function DesktopSidebar({ unreadCount }: { unreadCount: number }) {
  const { t, locale, setLocale } = useI18n();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[280px] flex-col border-r border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-5 py-6">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-tertiary)]">social-app</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">Editorial social, reworked for the browser.</h1>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {primaryRoutes.map((route) => (
          <NavLink
            key={route.to}
            to={route.to}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 rounded-cap-primary px-4 py-3 text-sm font-semibold transition",
                isActive
                  ? "bg-[var(--color-brand-primary)] text-white shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]",
              )
            }
          >
            <Icon name={route.icon} className="h-5 w-5" />
            <span>{t(route.labelKey)}</span>
            {route.to === "/notifications" && unreadCount > 0 ? (
              <span className="ml-auto rounded-full bg-[var(--color-brand-accent)] px-2 py-1 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 rounded-surface border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] p-4">
        <p className="text-sm font-semibold">Locale</p>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as typeof locale)}
          className="mt-3 w-full rounded-cap-primary border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-3 text-sm outline-none"
        >
          <option value="en">English</option>
          <option value="ru">Русский</option>
          <option value="uz">Oʻzbekcha</option>
        </select>
      </div>
    </aside>
  );
}

function resolvePageMeta(pathname: string, t: (key: string) => string) {
  if (pathname.startsWith("/discover")) {
    return { title: t("nav.discover"), subtitle: "Search, trends, and people worth following.", showBack: false };
  }
  if (pathname.startsWith("/notifications")) {
    return { title: t("nav.notifications"), subtitle: "Your latest activity and responses.", showBack: false };
  }
  if (pathname.startsWith("/messages")) {
    return { title: "Messages", subtitle: "Direct conversations with creators and collaborators.", showBack: false };
  }
  if (pathname.startsWith("/profile/edit")) {
    return { title: "Edit Profile", showBack: true };
  }
  if (pathname.startsWith("/profile")) {
    return { title: t("nav.profile"), subtitle: "Your public identity, posts, and settings surface.", showBack: false };
  }
  if (pathname.startsWith("/search")) {
    return { title: "Search Results", showBack: true };
  }
  if (pathname.startsWith("/posts/")) {
    return { title: "Post Detail", showBack: true };
  }
  if (pathname.startsWith("/u/")) {
    return { title: "Profile", showBack: true };
  }
  if (pathname.startsWith("/chat/")) {
    return { title: "Conversation", showBack: true };
  }
  if (pathname.startsWith("/settings")) {
    return { title: "Settings", subtitle: "Appearance, notifications, and account actions.", showBack: true };
  }
  if (pathname.startsWith("/create")) {
    return { title: "Create Post", subtitle: "Compose something with the same tokenized system as the feed.", showBack: true };
  }
  return { title: t("nav.home"), subtitle: "Stories, filters, and conversations in one warm feed.", showBack: false };
}
