import { useState } from "react";
import { t } from "../i18n";
import { useAppStore } from "../store";
import type { Priority, ProjectDraft, TaskDraft } from "../types";
import { Field, Avatar } from "./Common";
import { priorityLabel } from "../i18n";

export function TaskModal(props: {
  modal: { mode: "create" } | { mode: "edit"; taskId: string };
  onClose: () => void;
}) {
  const preferences = useAppStore((state) => state.preferences);
  const projects = useAppStore((state) => state.projects);
  const tasks = useAppStore((state) => state.tasks);
  const createTask = useAppStore((state) => state.createTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const editTaskId = props.modal.mode === "edit" ? props.modal.taskId : undefined;
  const editingTask = editTaskId ? tasks.find((task) => task.id === editTaskId) : undefined;

  const [draft, setDraft] = useState<TaskDraft>(
    editingTask
      ? {
          title: editingTask.title,
          description: editingTask.description ?? "",
          projectId: editingTask.projectId ?? "",
          priority: editingTask.priority,
          dueDate: editingTask.dueDate ?? "",
          tags: editingTask.tags.join(", "),
          assignToSelf: Boolean(editingTask.assignee)
        }
      : {
          title: "",
          description: "",
          projectId: "",
          priority: preferences.defaultPriority,
          dueDate: "",
          tags: "",
          assignToSelf: true
        }
  );

  return (
    <dialog open className="modal">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{props.modal.mode === "edit" ? t("edit_task.title") : t("create_task.title")}</h3>
          <button className="ghost-button" onClick={props.onClose}>{t("common.cancel")}</button>
        </div>
        <div className="modal-content">
          <Field label={t("create_task.field_title")}>
            <input value={draft.title} placeholder={t("create_task.field_title_placeholder")} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </Field>
          <Field label={t("create_task.field_description")}>
            <textarea rows={4} value={draft.description} placeholder={t("create_task.field_description_placeholder")} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </Field>
          <div className="two-up">
            <Field label={t("create_task.field_project")}>
              <select value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}>
                <option value="">{t("create_task.field_project_placeholder")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t("create_task.field_priority")}>
              <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>
                <option value="low">{priorityLabel("low")}</option>
                <option value="medium">{priorityLabel("medium")}</option>
                <option value="high">{priorityLabel("high")}</option>
                <option value="urgent">{priorityLabel("urgent")}</option>
              </select>
            </Field>
          </div>
          <div className="two-up">
            <Field label={t("create_task.field_due_date")}>
              <input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} />
            </Field>
            <Field label={t("create_task.field_tags")}>
              <input value={draft.tags} placeholder={t("create_task.field_tags_placeholder")} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} />
            </Field>
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={draft.assignToSelf} onChange={(event) => setDraft({ ...draft, assignToSelf: event.target.checked })} />
            <span>{t("create_task.field_assign_to_me")}</span>
          </label>
        </div>
        <div className="action-row">
          <button className="secondary-button" onClick={props.onClose}>{t("common.cancel")}</button>
          <button
            className="primary-button"
            disabled={draft.title.trim().length < 3}
            onClick={() => {
              if (props.modal.mode === "edit" && editingTask) updateTask(editingTask.id, draft);
              else createTask(draft);
              props.onClose();
            }}
          >
            {props.modal.mode === "edit" ? t("edit_task.save") : t("create_task.save")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function ProjectModal(props: { onClose: () => void }) {
  const createProject = useAppStore((state) => state.createProject);
  const [draft, setDraft] = useState<ProjectDraft>({ name: "", color: "#5B4FE8", icon: "folder" });

  return (
    <dialog open className="modal">
      <div className="modal-card compact">
        <div className="modal-header">
          <h3>{t("projects.dialog_title")}</h3>
          <button className="ghost-button" onClick={props.onClose}>{t("common.cancel")}</button>
        </div>
        <div className="modal-content">
          <Field label={t("projects.field_name")}>
            <input value={draft.name} placeholder={t("projects.field_name_placeholder")} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <div className="two-up">
            <Field label={t("projects.field_color")}>
              <input value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
            </Field>
            <Field label={t("projects.field_icon")}>
              <select value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value })}>
                {["folder", "briefcase", "rocket", "star", "heart", "lightbulb"].map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div className="action-row">
          <button className="secondary-button" onClick={props.onClose}>{t("common.cancel")}</button>
          <button
            className="primary-button"
            onClick={() => {
              if (!draft.name.trim()) return;
              createProject(draft);
              props.onClose();
            }}
          >
            {t("common.create")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function AssignModal(props: { taskId: string; onClose: () => void }) {
  const users = useAppStore((state) => state.users);
  const assignTask = useAppStore((state) => state.assignTask);
  const [query, setQuery] = useState("");
  const visibleUsers = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <dialog open className="modal">
      <div className="modal-card compact">
        <div className="modal-header">
          <h3>{t("task_detail.assign_to")}</h3>
          <button className="ghost-button" onClick={props.onClose}>{t("common.cancel")}</button>
        </div>
        <div className="modal-content">
          <Field label={t("task_detail.search_people")}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("task_detail.search_people_placeholder")} />
          </Field>
        </div>
        <div className="card-stack">
          {visibleUsers.map((user) => (
            <button
              key={user.id}
              className="profile-card"
              onClick={() => {
                assignTask(props.taskId, user.id);
                props.onClose();
              }}
            >
              <Avatar name={user.name} />
              <div>
                <strong>{user.name}</strong>
                <p>{user.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
