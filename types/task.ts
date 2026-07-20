export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
}

/**
 * Résultat de la requête jointe utilisée dans app/tasks/page.tsx
 * (select("*, projects(title)")).
 */
export interface TaskWithProject extends Task {
  projects: { title: string } | null;
}

export type NewTask = {
  project_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
};
