export type MeetingStatus = "planned" | "completed" | "cancelled";

export interface Meeting {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  location: string | null;
  meeting_url: string | null;
  starts_at: string;
  ends_at: string;
  status: MeetingStatus;
  created_at: string;
}

/**
 * Résultat de la requête jointe utilisée dans app/meetings/page.tsx
 * (select("*, projects(title)")), identique au pattern de TaskWithProject.
 */
export interface MeetingWithProject extends Meeting {
  projects: { title: string } | null;
}

export type NewMeeting = {
  project_id: string;
  title: string;
  description: string;
  location: string;
  meeting_url: string;
  starts_at: string;
  ends_at: string;
  status: MeetingStatus;
};

export type MeetingUpdate = {
  project_id: string;
  title: string;
  description: string;
  location: string;
  meeting_url: string;
  starts_at: string;
  ends_at: string;
};
