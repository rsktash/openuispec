import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAppStore } from "./store";
import { BottomNav, SidebarNav } from "./components/Nav";
import { HomeScreen } from "./screens/HomeScreen";
import { TaskDetailRoute } from "./screens/TaskDetail";
import { ProjectsScreen, ProjectDetailRoute } from "./screens/ProjectsScreen";
import { CalendarScreen, ProfileScreen, SettingsScreen } from "./screens/SettingsScreens";
import type { SizeClass } from "./types";

export function AppShell(props: {
  sizeClass: SizeClass;
  sidebarVisible: boolean;
  onCreateTask: () => void;
  onCreateProject: () => void;
  onEditTask: (taskId: string) => void;
  onAssignTask: (taskId: string) => void;
}) {
  const location = useLocation();
  const user = useAppStore((state) => state.user);

  return (
    <div className={`shell-layout size-${props.sizeClass}`}>
      {props.sizeClass !== "compact" && (props.sizeClass === "expanded" || props.sidebarVisible) ? (
        <SidebarNav currentPath={location.pathname} />
      ) : null}
      <main className="screen-shell">
        <Routes>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route
            path="/tasks"
            element={
              <HomeScreen
                sizeClass={props.sizeClass}
                onCreateTask={props.onCreateTask}
                onEditTask={props.onEditTask}
                onAssignTask={props.onAssignTask}
              />
            }
          />
          <Route
            path="/tasks/:taskId"
            element={<TaskDetailRoute sizeClass={props.sizeClass} onEditTask={props.onEditTask} onAssignTask={props.onAssignTask} />}
          />
          <Route path="/projects" element={<ProjectsScreen onCreateProject={props.onCreateProject} />} />
          <Route path="/projects/:projectId" element={<ProjectDetailRoute />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Routes>
      </main>
      {props.sizeClass === "compact" ? <BottomNav currentPath={location.pathname} /> : null}
      <div className="floating-user-chip">{user.firstName}</div>
    </div>
  );
}
