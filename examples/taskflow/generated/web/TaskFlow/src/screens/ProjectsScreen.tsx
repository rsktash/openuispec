import { useNavigate, useParams, Navigate } from "react-router-dom";
import { t, projectTaskCountLabel } from "../i18n";
import { useAppStore } from "../store";
import { TaskRow } from "../components/Common";

export function ProjectsScreen(props: { onCreateProject: () => void }) {
  const projects = useAppStore((state) => state.projects);
  const navigate = useNavigate();

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">{t("nav.projects")}</p>
          <h1>{t("projects.title")}</h1>
        </div>
        <button className="secondary-button" onClick={props.onCreateProject}>{t("projects.new_project")}</button>
      </header>

      {projects.length === 0 ? (
        <div className="empty-card">
          <h3>{t("projects.empty_title")}</h3>
          <p>{t("projects.empty_body")}</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <button key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
              <span className="project-chip" style={{ backgroundColor: `${project.color}22`, color: project.color }}>
                {project.icon.toUpperCase().slice(0, 2)}
              </span>
              <h3>{project.name}</h3>
              <p>{projectTaskCountLabel(project.taskCount)}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function ProjectDetailRoute() {
  const params = useParams();
  const project = useAppStore((state) => state.projects.find((item) => item.id === params.projectId));
  const tasks = useAppStore((state) => state.tasks.filter((task) => task.projectId === params.projectId));
  const navigate = useNavigate();

  if (!project) return <Navigate to="/projects" replace />;

  return (
    <section className="screen">
      <div className="detail-card">
        <div className="detail-hero">
          <div>
            <p className="eyebrow">{t("task_detail.project")}</p>
            <h2>{project.name}</h2>
          </div>
          <span className="badge badge-neutral">{projectTaskCountLabel(tasks.length)}</span>
        </div>

        <div className="card-stack">
          {tasks.length ? (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                project={project}
                selected={false}
                onSelect={() => navigate(`/tasks/${task.id}`)}
              />
            ))
          ) : (
            <div className="empty-card">
              <h3>{t("project_detail.empty_title")}</h3>
              <p>{t("project_detail.empty_body")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
