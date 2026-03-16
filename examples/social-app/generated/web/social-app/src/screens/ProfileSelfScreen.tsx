import { useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { PostCard, ProfileHero } from "../components/cards";
import { ActionButton, EmptyState, ScreenScaffold, SectionTitle, SkeletonList } from "../components/ui";
import { selectCurrentUser, selectProfilePosts, selectUserById, useAppStore } from "../state/store";
import { useSimulatedLoading, useUiScenario } from "../lib/utils";

export function ProfileSelfScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const scenario = useUiScenario();
  const loading = useSimulatedLoading("profile-self", scenario);
  const state = useAppStore();
  const user = selectCurrentUser(state);
  const posts = scenario === "empty" ? [] : selectProfilePosts(state, user.id);

  return (
    <ScreenScaffold title={t("nav.profile")} subtitle="Your own profile with edit action and authored posts.">
      {loading ? (
        <SkeletonList count={2} tall />
      ) : (
        <ProfileHero
          user={user}
          action={
            <ActionButton variant="secondary" icon="edit" onClick={() => navigate("/profile/edit")}>
              {t("profile.edit_button")}
            </ActionButton>
          }
        />
      )}

      <section className="space-y-4">
        <SectionTitle>{t("profile.posts_header")}</SectionTitle>
        {loading ? (
          <SkeletonList count={3} />
        ) : posts.length === 0 ? (
          <EmptyState title="No posts yet" description={t("profile.no_posts_self")} />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="rounded-card border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4 shadow-sm">
                <PostCard
                  post={post}
                  author={selectUserById(state, post.authorId) ?? user}
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
