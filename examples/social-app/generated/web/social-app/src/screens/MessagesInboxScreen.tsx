import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { ConversationCard } from "../components/cards";
import { EmptyState, ErrorState, ScreenScaffold, SkeletonList, TextField } from "../components/ui";
import { selectConversations, useAppStore } from "../state/store";
import { useSimulatedLoading, useUiScenario } from "../lib/utils";

export function MessagesInboxScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const scenario = useUiScenario();
  const [searchQuery, setSearchQuery] = useState("");
  const deferred = useDeferredValue(searchQuery);
  const loading = useSimulatedLoading(`messages-${deferred}`, scenario);
  const state = useAppStore();
  const items = scenario === "empty" ? [] : selectConversations(state, deferred);

  return (
    <ScreenScaffold title="Messages" subtitle="Conversation search, unread indicators, and direct routes into chat threads.">
      <TextField
        label={t("messages.search_placeholder")}
        value={searchQuery}
        onValueChange={setSearchQuery}
        placeholder={t("messages.search_placeholder")}
      />

      {scenario === "error" ? (
        <ErrorState title="Inbox unavailable" description="The inbox query is in an error state. Remove `?ui=error` to restore it." />
      ) : loading ? (
        <SkeletonList count={5} />
      ) : items.length === 0 ? (
        <EmptyState title="No conversations" description={t("messages.empty_inbox")} />
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            item.participant ? (
              <ConversationCard
                key={item.conversation.id}
                user={item.participant}
                excerpt={item.lastMessage?.body ?? "No messages yet"}
                unreadCount={item.unreadCount}
                timestamp={item.lastMessage?.createdAt}
                onOpen={() => navigate(`/chat/${item.conversation.id}`)}
              />
            ) : null,
          )}
        </div>
      )}
    </ScreenScaffold>
  );
}
