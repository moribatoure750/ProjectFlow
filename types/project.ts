export type ProjectStatus = "active" | "completed" | "archived";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string;
  status: ProjectStatus;
  created_at: string;
}


export type NewProject = {
  title: string;
  description: string;
  deadline: string;
  status: ProjectStatus;
};

export type ProjectUpdate = {
  title: string;
  description: string;
  deadline: string;
};
