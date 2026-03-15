import { startTransition, useDeferredValue, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { t, filterLabel, greeting, taskCountLabel } from "../i18n";
import { useAppStore } from "../store";
import { buildCounts, matchesFilter, matchesQuery } from "../utils";
import { TaskRow } from "../components/Common";
import { TaskDetailPanel } from "./TaskDetail";
import type { Filter, SizeClass } from "../types";

export function HomeScreen(props: {
  sizeClass: SizeClass;
  onCreateTask: () => void;
  onEditTask: (taskId: string) => void;
  onAssignTask: (taskId: string) => void;
}) {
  const tasks = useAppStore((state) => state.tasks);
  const projects = useAppStore((state) => state.projects);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const activeFilter = useAppStore((state) => state.activeFilter);
  const selectedTaskId = useAppStore((state) => state.selectedTaskId);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setActiveFilter = useAppStore((state) => state.setActiveFilter);
  const setSelectedTaskId = useAppStore((state) => state.setSelectedTaskId);
  const user = useAppStore((state) => state.user);
  const deferredQuery = useDeferredValue(searchQuery);
  const navigate = useNavigate();

  const visibleTasks = tasks.filter((task) => matchesFilter(task, activeFilter) && matchesQuery(task, projects, deferredQuery));
  const selectedTask =
    visibleTasks.find((task) => task.id === selectedTaskId) ??
    tasks.find((task) => task.id === selectedTaskId) ??
    visibleTasks[0];
  const counts = buildCounts(tasks);

  useEffect(() => {
    if (props.sizeClass === "expanded" && selectedTask?.id) {
      setSelectedTaskId(selectedTask.id);
      navigate("/tasks", { replace: true });
    }
  }, [props.sizeClass, selectedTask?.id, navigate, setSelectedTaskId]);

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">TaskFlow</p>
          <h1>{greeting(user.firstName)}</h1>
          <p className="screen-subtitle">{taskCountLabel(counts.today)}</p>
        </div>
        {props.sizeClass !== "compact" ? (
          <button className="primary-button" onClick={props.onCreateTask}>{t("home.new_task")}</button>
        ) : null}
      </header>

      <div className="search-panel">
        <label className="field-label" htmlFor="task-search">{t("home.search_label")}</label>
        <input
          id="task-search"
          value={searchQuery}
          onChange={(event) => startTransition(() => setSearchQuery(event.target.value))}
          placeholder={t("home.search_placeholder")}
        />
      </div>

      <div className="chip-row">
        {(["all", "today", "upcoming", "done"] as Filter[]).map((filter) => (
          <button
            key={filter}
            className={filter === activeFilter ? "chip active" : "chip"}
            onClick={() => setActiveFilter(filter)}
          >
            {filterLabel(filter)} ({counts[filter]})
          </button>
        ))}
      </div>

      <div className={props.sizeClass === "expanded" ? "home-grid expanded" : "home-grid"}>
        <div className="card-stack">
          {visibleTasks.length === 0 ? (
            <div className="empty-card">
              <h3>{t("home.empty_title")}</h3>
              <p>{t("home.empty_body")}</p>
            </div>
          ) : (
            visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                project={projects.find((project) => project.id === task.projectId)}
                selected={task.id === selectedTask?.id}
                onSelect={() => {
                  setSelectedTaskId(task.id);
                  if (props.sizeClass === "expanded") navigate("/tasks", { replace: true });
                  else navigate(`/tasks/${task.id}`);
                }}
              />
            ))
          )}
        </div>

        {props.sizeClass === "expanded" && selectedTask ? (
          <TaskDetailPanel taskId={selectedTask.id} onEditTask={props.onEditTask} onAssignTask={props.onAssignTask} />
        ) : null}
      </div>

      {props.sizeClass === "compact" ? (
        <button className="fab-button" onClick={props.onCreateTask}>{t("home.new_task")}</button>
      ) : null}
    </section>
  );
}
