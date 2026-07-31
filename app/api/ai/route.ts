import { NextResponse, type NextRequest } from "next/server";

import { AiNotConfiguredError, callAi } from "@/lib/ai/client";
import {
  buildMeetingSummaryPrompt,
  buildProjectSummaryPrompt,
  buildTaskChecklistPrompt,
} from "@/lib/ai/prompts";
import {
  parseMeetingSummaryResponse,
  parseProjectSummaryResponse,
  parseTaskChecklistResponse,
} from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";
import type { AiAction } from "@/types/ai";

/**
 * Lot 19 — IA utile : unique route serveur exposant les 3 actions IA
 * autorisées (`generate_task_checklist`/`summarize_project`/
 * `summarize_meeting`). Aucun chatbot, aucune mémoire conversationnelle
 * : chaque requête est indépendante et sans état.
 *
 * Sécurité :
 *  - `AI_API_KEY`/`AI_MODEL`/`AI_BASE_URL` ne sont lus que côté serveur
 *    (lib/ai/client.ts), jamais transmis au client.
 *  - L'utilisateur doit être authentifié (`supabase.auth.getUser()`).
 *  - L'appartenance de l'entité ciblée (`entityId`) est vérifiée par un
 *    filtre explicite `eq("user_id", userId)` avant tout appel IA —
 *    même principe que `assertOwnsTask()`
 *    (services/checklist.service.ts) : jamais une confiance aveugle
 *    dans la seule RLS.
 *  - Aucune écriture en base ici : ni sur les tables métier, ni sur
 *    `activity_logs` — les résultats IA sont toujours temporaires côté
 *    client (voir consigne du Lot 19).
 */

const VALID_ACTIONS: readonly AiAction[] = [
  "generate_task_checklist",
  "summarize_project",
  "summarize_meeting",
];

function isValidAction(value: unknown): value is AiAction {
  return typeof value === "string" && (VALID_ACTIONS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { action, entityId } = body as Record<string, unknown>;

  if (!isValidAction(action)) {
    return NextResponse.json({ error: "Action IA inconnue." }, { status: 400 });
  }
  if (typeof entityId !== "string" || entityId.trim().length === 0) {
    return NextResponse.json({ error: "Identifiant d'entité manquant." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  const userId = userData.user.id;

  try {
    if (action === "generate_task_checklist") {
      const { data: task, error } = await supabase
        .from("tasks")
        .select("id, title, description")
        .eq("id", entityId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: "Impossible de vérifier la tâche." }, { status: 500 });
      }
      if (!task) {
        return NextResponse.json(
          { error: "Tâche introuvable ou non autorisée." },
          { status: 404 }
        );
      }

      const prompt = buildTaskChecklistPrompt(task.title, task.description ?? "");
      const raw = await callAi(prompt);
      const result = parseTaskChecklistResponse(raw);
      return NextResponse.json(result);
    }

    if (action === "summarize_project") {
      const { data: project, error } = await supabase
        .from("projects")
        .select("id, title, description, deadline, status")
        .eq("id", entityId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: "Impossible de vérifier le projet." }, { status: 500 });
      }
      if (!project) {
        return NextResponse.json(
          { error: "Projet introuvable ou non autorisé." },
          { status: 404 }
        );
      }

      const [tasksRes, meetingsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("title, status, priority, due_date")
          .eq("project_id", entityId)
          .eq("user_id", userId),
        supabase
          .from("meetings")
          .select("title, status, starts_at")
          .eq("project_id", entityId)
          .eq("user_id", userId),
      ]);

      const prompt = buildProjectSummaryPrompt(
        project,
        tasksRes.data ?? [],
        meetingsRes.data ?? []
      );
      const raw = await callAi(prompt);
      const result = parseProjectSummaryResponse(raw);
      return NextResponse.json(result);
    }

    // action === "summarize_meeting"
    const { data: meeting, error } = await supabase
      .from("meetings")
      .select("id, title, description, location, starts_at, ends_at, status")
      .eq("id", entityId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Impossible de vérifier la réunion." }, { status: 500 });
    }
    if (!meeting) {
      return NextResponse.json(
        { error: "Réunion introuvable ou non autorisée." },
        { status: 404 }
      );
    }

    const prompt = buildMeetingSummaryPrompt(meeting);
    const raw = await callAi(prompt);
    const result = parseMeetingSummaryResponse(raw);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message =
      err instanceof Error ? err.message : "Erreur inattendue lors de la génération IA.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
