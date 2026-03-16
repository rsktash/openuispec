import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useI18n } from "../i18n";
import { CommentCard, PostCard } from "../components/cards";
import { ActionButton, EmptyState, ErrorState, ScreenScaffold, SectionTitle, SkeletonList, TextField } from "../components/ui";
import { useSimulatedLoading, useUiScenario } from "../lib/utils";
import { selectCommentsByPost, selectPostById, selectUserById, useAppStore } from "../state/store";

export function PostDetailScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { postId = "" } = useParams();
  const scenario = useUiScenario();
  const loading = useSimulatedLoading(`post-${postId}`, scenario);
  const state = useAppStore();
  const [commentText, setCommentText] = useState("");
  const post = scenario === "empty" ? undefined : selectPostById(state, postId);
  const comments = scenario === "empty" ? [] : selectCommentsByPost(state, postId);

  if (scenario === "error") {
    return (
      <ScreenScaffold title="Post Detail">
        <ErrorState title="Post unavailable" description="The detail request failed. Remove `?ui=error` to return to the normal state." />
      </ScreenScaffold>
    );
  }

  if (loading) {
    return (
      <ScreenScaffold title="Post Detail">
        <SkeletonList count={1} tall />
      </ScreenScaffold>
    );
  }

  if (!post) {
    return (
      <ScreenScaffold title="Post Detail">
        <EmptyState title="Missing post" description="This post could not be found in the local mock data." />
      </ScreenScaffold>
    );
  }

  const author = selectUserById(state, post.authorId);
  if (!author) {
    return null;
  }

  return (
    <ScreenScaffold title="Post Detail" subtitle={`Published ${new Date(post.publishedAt).toLocaleDateString()}`}>
      <PostCard
        post={post}
        author={author}
        hero
        onAuthor={() => navigate(`/u/${author.id}`)}
        onLike={() => state.toggleLike(post.id)}
        onSave={() => state.toggleSave(post.id)}
      />

      <section className="space-y-4">
        <ActionButton variant="secondary" icon={post.liked ? "like_fill" : "like"} onClick={() => state.toggleLike(post.id)}>
          {t("post.like_action")}
        </ActionButton>
      </section>

      <section className="space-y-4">
        <SectionTitle>{t("post.comments_header")}</SectionTitle>
        {comments.length === 0 ? (
          <EmptyState title="No comments yet" description={t("post.no_comments")} />
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const commentAuthor = selectUserById(state, comment.authorId);
              if (!commentAuthor) {
                return null;
              }
              return (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  author={commentAuthor}
                  onAuthor={() => navigate(`/u/${commentAuthor.id}`)}
                />
              );
            })}
          </div>
        )}
      </section>

      <TextField
        label={t("post.comment_placeholder")}
        value={commentText}
        multiline
        onValueChange={setCommentText}
        placeholder={t("post.comment_placeholder")}
        trailingAction={
          <ActionButton
            variant="primary"
            icon="send"
            onClick={() => {
              if (!commentText.trim()) {
                return;
              }
              state.addComment(post.id, commentText.trim());
              setCommentText("");
              state.showToast(t("post.comment_sent"));
            }}
          >
            Send
          </ActionButton>
        }
      />
    </ScreenScaffold>
  );
}
