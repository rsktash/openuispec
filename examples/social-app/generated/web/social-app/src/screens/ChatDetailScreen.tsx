import { useState } from "react";
import { useParams } from "react-router";
import { useI18n } from "../i18n";
import { MessageBubble } from "../components/cards";
import { EmptyState, ErrorState, ScreenScaffold, SkeletonList, TextField, ActionButton } from "../components/ui";
import { selectConversationById, selectMessagesByConversation, selectUserById, useAppStore } from "../state/store";
import { useSimulatedLoading, useUiScenario } from "../lib/utils";

export function ChatDetailScreen() {
  const { t } = useI18n();
  const { conversationId = "" } = useParams();
  const scenario = useUiScenario();
  const loading = useSimulatedLoading(`chat-${conversationId}`, scenario);
  const [messageText, setMessageText] = useState("");
  const state = useAppStore();
  const conversation = scenario === "empty" ? undefined : selectConversationById(state, conversationId);
  const messages = scenario === "empty" ? [] : selectMessagesByConversation(state, conversationId);

  if (scenario === "error") {
    return (
      <ScreenScaffold title="Conversation">
        <ErrorState title="Thread unavailable" description="The thread request failed. Remove `?ui=error` to restore it." />
      </ScreenScaffold>
    );
  }

  if (loading) {
    return (
      <ScreenScaffold title="Conversation">
        <SkeletonList count={5} />
      </ScreenScaffold>
    );
  }

  if (!conversation) {
    return (
      <ScreenScaffold title="Conversation">
        <EmptyState title="No thread found" description="This conversation is not available in the local mock store." />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Conversation" subtitle="Alternating message bubble geometry and inline send action.">
      {messages.length === 0 ? (
        <EmptyState title="No messages yet" description={t("chat.empty_thread")} />
      ) : (
        <div className="space-y-2">
          {messages.map((message) => {
            const author = selectUserById(state, message.senderId);
            if (!author) {
              return null;
            }
            return (
              <MessageBubble
                key={message.id}
                message={message}
                author={author}
                isMine={message.senderId === state.currentUserId}
              />
            );
          })}
        </div>
      )}

      <TextField
        label={t("chat.message_placeholder")}
        value={messageText}
        multiline
        onValueChange={setMessageText}
        placeholder={t("chat.message_placeholder")}
        trailingAction={
          <ActionButton
            variant="primary"
            icon="send"
            onClick={() => {
              if (!messageText.trim()) {
                return;
              }
              state.sendMessage(conversationId, messageText.trim());
              setMessageText("");
            }}
          >
            Send
          </ActionButton>
        }
      />
    </ScreenScaffold>
  );
}
