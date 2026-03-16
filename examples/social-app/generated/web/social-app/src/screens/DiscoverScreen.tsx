import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { CreatorCard, TrendRow } from "../components/cards";
import { ActionButton, ErrorState, ScreenScaffold, SectionTitle, SkeletonList, TextField } from "../components/ui";
import { useSimulatedLoading, useUiScenario } from "../lib/utils";
import { selectDiscoverCreators, useAppStore } from "../state/store";

export function DiscoverScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const scenario = useUiScenario();
  const loading = useSimulatedLoading("discover", scenario);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const state = useAppStore();
  const creators = scenario === "empty" ? [] : selectDiscoverCreators(state);
  const trends = scenario === "empty" ? [] : state.trends;
  const tags = scenario === "empty" ? [] : state.tags;

  return (
    <ScreenScaffold title={t("nav.discover")} subtitle="Search, trending topics, tags, and suggested creators.">
      <TextField
        label={t("discover.search_placeholder")}
        value={searchQuery}
        onValueChange={setSearchQuery}
        placeholder={t("discover.search_placeholder")}
        trailingAction={
          <ActionButton
            variant="primary"
            icon="search"
            onClick={() => navigate(`/search?query=${encodeURIComponent(deferredQuery || searchQuery)}&tab=posts`)}
          >
            Search
          </ActionButton>
        }
      />

      {scenario === "error" ? (
        <ErrorState title="Discover unavailable" description="The discover request failed. Remove `?ui=error` to return to the normal dataset." />
      ) : loading ? (
        <SkeletonList count={4} tall />
      ) : (
        <>
          <section className="space-y-4">
            <SectionTitle>{t("discover.trending")}</SectionTitle>
            <div className="space-y-3">
              {trends.map((trend) => (
                <TrendRow
                  key={trend.id}
                  title={trend.label}
                  subtitle={`${trend.postCount.toLocaleString()} posts`}
                  onClick={() => navigate(`/search?query=${encodeURIComponent(trend.label)}&tab=posts`)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle>{t("discover.popular_tags")}</SectionTitle>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {tags.map((tag) => (
                <ActionButton
                  key={tag.id}
                  variant="chip"
                  onClick={() => navigate(`/search?query=${encodeURIComponent(`#${tag.name}`)}&tab=posts`)}
                >
                  #{tag.name}
                </ActionButton>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle>{t("discover.suggested_creators")}</SectionTitle>
            <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-2">
              {creators.map((creator) => (
                <CreatorCard key={creator.id} user={creator} to={`/u/${creator.id}`} />
              ))}
            </div>
          </section>
        </>
      )}
    </ScreenScaffold>
  );
}
