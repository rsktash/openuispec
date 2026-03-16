import { useNavigate, useParams } from "react-router";
import { useI18n } from "../i18n";
import { PostCard, ProfileHero } from "../components/cards";
import { ActionButton, EmptyState, ErrorState, ScreenScaffold, SectionTitle, SkeletonList } from "../components/ui";
import { selectProfilePosts, selectUserById, useAppStore } from "../state/store";
import { useSimulatedLoading, useUiScenario } from "../lib/utils";

export function ProfileUserScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const scenario = useUiScenario();
  const loading = useSimulatedLoading(`profile-${userId}`, scenario);
  const state = useAppStore();
  const user = scenario === "empty" ? undefined : selectUserById(state, userId);
  const posts = scenario === "empty" ? [] : selectProfilePosts(state, userId);

  if (scenario === "error") {
    return (
      <ScreenScaffold title="Profile">
        <ErrorState title="Profile unavailable" description="The profile request failed. Remove `?ui=error` to restore it." />
      </ScreenScaffold>
    );
  }

  if (loading) {
    return (
      <ScreenScaffold title="Profile">
        <SkeletonList count={3} tall />
      </ScreenScaffold>
    );
  }

  if (!user) {
    return (
      <ScreenScaffold title="Profile">
        <EmptyState title="Profile missing" description="The requested user does not exist in the local dataset." />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title={user.displayName} subtitle={`@${user.handle}`}>
      <ProfileHero
        user={user}
        action={
          <ActionButton variant="primary" onClick={() => state.followUser(user.id)}>
            {t("profile.follow_button")}
          </ActionButton>
        }
      />

      <section className="space-y-4">
        <SectionTitle>{t("profile.posts_header")}</SectionTitle>
        {posts.length === 0 ? (
          <EmptyState title="No posts yet" description={t("profile.no_posts_user")} />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="rounded-card border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4 shadow-sm">
                <PostCard
                  post={post}
                  author={user}
                  onOpen={() => navigate(`/posts/${post.id}`)}
                  onAuthor={() => navigate(`/u/${user.id}`)}
                  onLike={() => state.toggleLike(post.id)}
                  onSave={() => state.toggleSave(post.id)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </ScreenScaffold>
  );
}
