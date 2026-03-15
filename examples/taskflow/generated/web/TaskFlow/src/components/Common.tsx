import type { ReactNode } from "react";
import { useAppStore } from "../store";
import type { Project, Task } from "../types";
import { initials, relativeDate } from "../utils";

export function SwitchRow(props: {
  label: string;
  helper?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <div>
        <strong>{props.label}</strong>
        {props.helper ? <small>{props.helper}</small> : null}
      </div>
      <input type="checkbox" checked={props.value} onChange={(event) => props.onChange(event.target.checked)} />
    </label>
  );
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="field-block">
      <span className="field-label">{props.label}</span>
      {props.children}
    </label>
  );
}

export function DetailRow(props: { label: string; value: string; action?: () => void }) {
  const content = (
    <>
      <strong>{props.label}</strong>
      <span>{props.value}</span>
    </>
  );
  return props.action ? (
    <button className="detail-row" onClick={props.action}>
      {content}
    </button>
  ) : (
    <div className="detail-row">{content}</div>
  );
}

export function StatCard(props: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

export function TaskRow(props: {
  task: Task;
  project?: Project;
  selected: boolean;
  onSelect: () => void;
}) {
  const toggleTask = useAppStore((state) => state.toggleTask);
  return (
    <button className={props.selected ? "task-row selected" : "task-row"} onClick={props.onSelect}>
      <label className="check-shell" onClick={(event) => event.stopPropagation()}>
        <input type="checkbox" checked={props.task.status === "done"} onChange={() => toggleTask(props.task.id)} />
      </label>
      <div className="task-copy">
        <strong>{props.task.title}</strong>
        <p>
          {props.project?.name ?? "Inbox"} · {props.task.dueDate ? relativeDate(props.task.dueDate) : "No due date"}
        </p>
      </div>
      <span className={`badge badge-${props.task.priority}`}>{props.task.priority.toUpperCase()}</span>
    </button>
  );
}

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return <div className={large ? "avatar large" : "avatar"}>{initials(name)}</div>;
}
