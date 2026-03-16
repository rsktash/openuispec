import { useMemo, useState, startTransition } from "react";
import { useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { selectFeed, selectStories, selectUserById, useAppStore } from "../state/store";
import { CreatorCard, PostCard, StoryCard } from "../components/cards";
import { ActionButton, EmptyState, ErrorState, ScreenScaffold, SectionTitle, SkeletonList } from "../components/ui";
import { useSimulatedLoading, useUiScenario } from "../lib/utils";

export function HomeFeedScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const scenario = useUiScenario();
  const [activeFilter, setActiveFilter] = useState<"all" | "following" | "popular">("all");
  const [searchQuery] = useState("");
  const state = useAppStore();
  const stories = selectStories(state);
  const feed = selectFeed(state, activeFilter, searchQuery);
  const loading = useSimulatedLoading(`home-${activeFilter}`, scenario);

  const visibleFeed = useMemo(() => (scenario === "empty" ? [] : feed), [feed, scenario]);

  return (
    <ScreenScaffold title={t("nav.home")} subtitle="Stories, chip-based feed filters, and expressive card actions.">
      <section className="space-y-4">
        <SectionTitle>Stories</SectionTitle>
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-2">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              name={story.author?.displayName ?? "Story"}
              image={story.previewUrl}
              to={`/posts/${story.id}`}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Feed Filter</SectionTitle>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {[
            { value: "all" as const, label: t("home.filter_all") },
            { value: "following" as const, label: t("home.filter_following") },
            { value: "popular" as const, label: t("home.filter_popular") },
          ].map((option) => (
            <ActionButton
              key={option.value}
              variant="chip"
              selected={activeFilter === option.value}
              onClick={() => startTransition(() => setActiveFilter(option.value))}
            >
              {option.label}
            </ActionButton>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle
          action={
            <ActionButton variant="primary" icon="create_post" onClick={() => navigate("/create")}>
              {t("nav.create")}
            </ActionButton>
          }
        >
          Feed
        </SectionTitle>

        {scenario === "error" ? (
          <ErrorState title="Feed unavailable" description="The mock feed request failed. Remove `?ui=error` to restore the normal state." />
        ) : loading ? (
          <SkeletonList count={5} tall />
        ) : visibleFeed.length === 0 ? (
          <EmptyState title="Feed is empty" description={t("home.empty_feed")} />
        ) : (
          <div className="space-y-4">
            {visibleFeed.map((post) => {
              const author = selectUserById(state, post.authorId);
              if (!author) {
                return null;
              }

              return (
                <div key={post.id} className="rounded-card border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4 shadow-sm">
                  <PostCard
                    post={post}
                    author={author}
                    onOpen={() => navigate(`/posts/${post.id}`)}
                    onAuthor={() => navigate(`/u/${author.id}`)}
                    onLike={() => state.toggleLike(post.id)}
                    onSave={() => state.toggleSave(post.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 xl:hidden">
        <SectionTitle>Suggested Creators</SectionTitle>
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-1">
          {state.users
            .filter((user) => user.id !== state.currentUserId)
            .slice(0, 3)
            .map((user) => (
              <CreatorCard key={user.id} user={user} to={`/u/${user.id}`} />
            ))}
        </div>
      </section>
    </ScreenScaffold>
  );
}
