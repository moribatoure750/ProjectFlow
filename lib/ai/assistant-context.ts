import type { createClient } from "@/lib/supabase/server";

/**
 * Assistant ProjectFlow — récupération du contexte serveur envoyé à
 * l'IA conversationnelle (`app/api/ai/assistant/route.ts`).
 *
 * Même principe de sécurité que `app/api/ai/route.ts` (Lot 19) : chaque
 * requête est explicitement filtrée par `.eq("user_id", userId)`,
 * jamais une confiance aveugle dans la seule RLS — aucune donnée d'un
 * autre utilisateur ne peut donc atteindre le prompt envoyé au
 * fournisseur IA.
 */

export interface AssistantProjectSummary {
  id: string;
  title: string;
  status: string;
  deadline: string;
}

export interface AssistantTaskSummary {
  title: string;
  status: string;
  priority: string;
  due_date: string;
  projectId: string | null;
  projectTitle: string | null;
}

export interface AssistantMeetingSummary {
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  projectId: string | null;
  projectTitle: string | null;
}

export interface AssistantContext {
  projects: AssistantProjectSummary[];
  tasks: AssistantTaskSummary[];
  meetings: AssistantMeetingSummary[];
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface ProjectRow {
  id: string;
  title: string;
  status: string;
  deadline: string;
}

interface TaskRow {
  title: string;
  status: string;
  priority: string;
  due_date: string;
  project_id: string;
  projects: { title: string } | null;
}

interface MeetingRow {
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  project_id: string;
  projects: { title: string } | null;
}

/**
 * Récupère un instantané compact des projets/tâches/réunions de
 * l'utilisateur courant — sert uniquement à construire le prompt de
 * l'assistant (voir `lib/ai/assistant-prompts.ts`), jamais renvoyé
 * brut au client, jamais stocké.
 */
export async function fetchAssistantContext(
  supabase: SupabaseServerClient,
  userId: string
): Promise<AssistantContext> {
  const [projectsRes, tasksRes, meetingsRes] = await Promise.all([
    supabase.from("projects").select("id, title, status, deadline").eq("user_id", userId),
    supabase
      .from("tasks")
      .select("title, status, priority, due_date, project_id, projects(title)")
      .eq("user_id", userId),
    supabase
      .from("meetings")
      .select("title, status, starts_at, ends_at, project_id, projects(title)")
      .eq("user_id", userId),
  ]);

  const projects: AssistantProjectSummary[] = ((projectsRes.data as ProjectRow[]) ?? []).map(
    (p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      deadline: p.deadline,
    })
  );

  const tasks: AssistantTaskSummary[] = ((tasksRes.data as unknown as TaskRow[]) ?? []).map((t) => ({

    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    projectId: t.project_id ?? null,
    projectTitle: t.projects?.title ?? null,
  }));

  const meetings: AssistantMeetingSummary[] = ((meetingsRes.data as unknown as MeetingRow[]) ?? []).map(

    (m) => ({
      title: m.title,
      status: m.status,
      starts_at: m.starts_at,
      ends_at: m.ends_at,
      projectId: m.project_id ?? null,
      projectTitle: m.projects?.title ?? null,
    })
  );

  return { projects, tasks, meetings };
}
