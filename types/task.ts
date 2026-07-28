export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  project_id: string;
  user_id: string;
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

/**
 * Champs modifiables via la page de détail `/tasks/[id]` (Lot 14A) :
 * tout sauf `status`, qui reste géré séparément par `updateTaskStatus`
 * (menu d'actions rapide, déjà utilisé par app/tasks/page.tsx).
 */
export type TaskUpdate = {
  project_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: TaskPriority;
};

