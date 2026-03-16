import { useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { NotificationCard } from "../components/cards";
import { EmptyState, ErrorState, ScreenScaffold, SkeletonList } from "../components/ui";
import { selectNotifications, useAppStore } from "../state/store";
import { useSimulatedLoading, useUiScenario } from "../lib/utils";

export function NotificationsScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const scenario = useUiScenario();
  const loading = useSimulatedLoading("notifications", scenario);
  const state = useAppStore();
  const notifications = scenario === "empty" ? [] : selectNotifications(state);

  return (
    <ScreenScaffold title={t("nav.notifications")} subtitle="Mark-as-read interactions wired to the local mock state.">
      {scenario === "error" ? (
        <ErrorState title="Notifications unavailable" description="The notifications request failed. Remove `?ui=error` to recover." />
      ) : loading ? (
        <SkeletonList count={6} />
      ) : notifications.length === 0 ? (
        <EmptyState title="Nothing new" description={t("notifications.empty")} />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              actor={item.actor}
              onOpen={() => {
                state.markNotificationRead(item.id);
                navigate(item.postId ? `/posts/${item.postId}` : "/profile");
              }}
            />
          ))}
        </div>
      )}
    </ScreenScaffold>
  );
}
