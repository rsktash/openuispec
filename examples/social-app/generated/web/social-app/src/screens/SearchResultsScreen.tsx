import { useEffect, useState, startTransition } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useI18n } from "../i18n";
import { ActionButton, EmptyState, ErrorState, ScreenScaffold, SkeletonList, TextField } from "../components/ui";
import { selectSearchResults, useAppStore } from "../state/store";
import { useSimulatedLoading, useUiScenario } from "../lib/utils";

export function SearchResultsScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const scenario = useUiScenario();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const [activeTab, setActiveTab] = useState<"posts" | "people" | "tags">(
    (searchParams.get("tab") as "posts" | "people" | "tags") ?? "posts",
  );
  const loading = useSimulatedLoading(`search-${query}-${activeTab}`, scenario);
  const state = useAppStore();
  const results = selectSearchResults(state, query, activeTab);

  useEffect(() => {
    setQuery(searchParams.get("query") ?? "");
    setActiveTab(((searchParams.get("tab") as "posts" | "people" | "tags") ?? "posts"));
  }, [searchParams]);

  const visibleResults = scenario === "empty" ? [] : results;

  return (
    <ScreenScaffold title="Search Results" subtitle={`Querying "${query}" across ${activeTab}.`}>
      <TextField
        label={t("search.placeholder")}
        value={query}
        onValueChange={setQuery}
        placeholder={t("search.placeholder")}
        trailingAction={
          <ActionButton
            variant="primary"
            icon="search"
            onClick={() => setSearchParams({ query, tab: activeTab })}
          >
            Search
          </ActionButton>
        }
      />

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {[
          { value: "posts" as const, label: t("search.tab_posts") },
          { value: "people" as const, label: t("search.tab_people") },
          { value: "tags" as const, label: t("search.tab_tags") },
        ].map((tab) => (
          <ActionButton
            key={tab.value}
            variant="chip"
            selected={activeTab === tab.value}
            onClick={() => {
              startTransition(() => setActiveTab(tab.value));
              setSearchParams({ query, tab: tab.value });
            }}
          >
            {tab.label}
          </ActionButton>
        ))}
      </div>

      {scenario === "error" ? (
        <ErrorState title="Search failed" description="The search request is in an error state. Remove `?ui=error` to see results." />
      ) : loading ? (
        <SkeletonList count={5} />
      ) : visibleResults.length === 0 ? (
        <EmptyState title="No results" description={t("search.no_results")} />
      ) : (
        <div className="space-y-3">
          {visibleResults.map((result) => (
            <button
              key={`${result.kind}-${result.id}`}
              type="button"
              onClick={() => {
                if (result.kind === "people") {
                  navigate(`/u/${result.id}`);
                  return;
                }
                navigate(`/posts/${result.id}`);
              }}
              className="w-full rounded-card border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4 text-left shadow-sm transition hover:-translate-y-0.5"
            >
              <p className="font-semibold text-[var(--color-text-primary)]">{result.title}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{result.subtitle}</p>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-text-secondary)]">{result.body}</p>
            </button>
          ))}
        </div>
      )}
    </ScreenScaffold>
  );
}
