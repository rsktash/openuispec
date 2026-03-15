import { Navigate, useNavigate, useParams } from "react-router-dom";
import { t, statusLabel, priorityLabel, interpolate } from "../i18n";
import { useAppStore } from "../store";
import { formatDate } from "../utils";
import { DetailRow, StatCard } from "../components/Common";
import type { SizeClass } from "../types";

export function TaskDetailRoute(props: {
  sizeClass: SizeClass;
  onEditTask: (taskId: string) => void;
  onAssignTask: (taskId: string) => void;
}) {
  const params = useParams();
  if (!params.taskId) return <Navigate to="/tasks" replace />;
  if (props.sizeClass === "expanded") return <Navigate to="/tasks" replace />;
  return <TaskDetailPanel taskId={params.taskId} onEditTask={props.onEditTask} onAssignTask={props.onAssignTask} />;
}

export function TaskDetailPanel(props: {
  taskId: string;
  onEditTask: (taskId: string) => void;
  onAssignTask: (taskId: string) => void;
}) {
  const task = useAppStore((state) => state.tasks.find((item) => item.id === props.taskId));
  const projects = useAppStore((state) => state.projects);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const navigate = useNavigate();

  if (!task) {
    return (
      <div className="detail-card">
        <h2>Task missing</h2>
        <p>The selected task could not be found.</p>
      </div>
    );
  }

  const project = projects.find((item) => item.id === task.projectId);

  return (
    <article className="detail-card">
      <div className="detail-hero">
        <div>
          <p className="eyebrow">{statusLabel(task.status)}</p>
          <h2>{task.title}</h2>
        </div>
        <span className={`badge badge-${task.status}`}>{statusLabel(task.status)}</span>
      </div>

      <div className="stat-grid">
        <StatCard label={t("task_detail.status")} value={statusLabel(task.status)} />
        <StatCard label={t("task_detail.priority")} value={priorityLabel(task.priority)} />
        <StatCard label={t("task_detail.due")} value={task.dueDate ? formatDate(task.dueDate) : t("task_detail.unassigned")} />
      </div>

      {task.description ? (
        <section className="detail-section">
          <p className="section-tag">{t("task_detail.description")}</p>
          <p>{task.description}</p>
        </section>
      ) : null}

      {task.attachment ? (
        <section className="detail-section">
          <p className="section-tag">Media</p>
          <div className="media-player">
            <strong>{task.attachment.title}</strong>
            {task.attachment.mediaType === "video" ? (
              <video controls preload="metadata" src={task.attachment.source} />
            ) : (
              <audio controls preload="metadata" src={task.attachment.source} />
            )}
          </div>
        </section>
      ) : null}

      <section className="detail-section">
        <p className="section-tag">{t("task_detail.details")}</p>
        <DetailRow label={t("task_detail.project")} value={project?.name ?? "-"} action={() => project && navigate(`/projects/${project.id}`)} />
        <DetailRow label={t("task_detail.assignee")} value={task.assignee?.name ?? t("task_detail.unassigned")} action={() => props.onAssignTask(task.id)} />
        <DetailRow label={t("task_detail.tags")} value={task.tags.join(", ") || "-"} />
        <DetailRow label={t("task_detail.created")} value={formatDate(task.createdAt)} />
      </section>

      <div className="action-row">
        <button className="primary-button" onClick={() => props.onEditTask(task.id)}>{t("task_detail.edit")}</button>
        <button className="secondary-button" onClick={() => toggleTask(task.id)}>
          {task.status === "done" ? t("task_detail.reopen") : t("task_detail.complete")}
        </button>
        <button
          className="danger-button"
          onClick={() => {
            if (window.confirm(interpolate(t("task_detail.delete_message"), { title: task.title }))) {
              deleteTask(task.id);
              navigate("/tasks");
            }
          }}
        >
          {t("task_detail.delete")}
        </button>
      </div>
    </article>
  );
}
