import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { AssignModal, ProjectModal, TaskModal } from "./components/Modals";
import { useResolvedTheme, useWindowWidth } from "./hooks";
import { useAppStore } from "./store";

export default function App() {
  const [taskModal, setTaskModal] = useState<{ mode: "create" } | { mode: "edit"; taskId: string } | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [assignModalTaskId, setAssignModalTaskId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const width = useWindowWidth();
  const sizeClass = width <= 600 ? "compact" : width <= 1024 ? "regular" : "expanded";
  const theme = useResolvedTheme(useAppStore((state) => state.preferences.theme));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        setTaskModal({ mode: "create" });
      }
      if (key === "k") {
        event.preventDefault();
        document.getElementById("task-search")?.focus();
      }
      if (key === "b") {
        event.preventDefault();
        setSidebarVisible((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-frame">
      <AppShell
        sizeClass={sizeClass}
        sidebarVisible={sidebarVisible}
        onCreateTask={() => setTaskModal({ mode: "create" })}
        onCreateProject={() => setProjectModalOpen(true)}
        onEditTask={(taskId) => setTaskModal({ mode: "edit", taskId })}
        onAssignTask={(taskId) => setAssignModalTaskId(taskId)}
      />

      {taskModal ? <TaskModal modal={taskModal} onClose={() => setTaskModal(null)} /> : null}
      {projectModalOpen ? <ProjectModal onClose={() => setProjectModalOpen(false)} /> : null}
      {assignModalTaskId ? <AssignModal taskId={assignModalTaskId} onClose={() => setAssignModalTaskId(null)} /> : null}
    </div>
  );
}
