import { NextResponse, type NextRequest } from "next/server";

import { fetchAssistantContext } from "@/lib/ai/assistant-context";
import { buildAssistantSystemPrompt, buildAssistantUserPrompt } from "@/lib/ai/assistant-prompts";
import { AiNotConfiguredError, callAi } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import type { AssistantMessage } from "@/types/assistant";

/**
 * Assistant ProjectFlow — route serveur dédiée à l'assistant
 * conversationnel (bouton flottant, voir `components/assistant/`).
 * Distincte de `app/api/ai/route.ts` (Lot 19, 3 actions "one-shot")
 * pour ne pas mélanger deux contrats de requête/réponse différents :
 * ici la réponse est un texte conversationnel libre, pas un JSON
 * structuré.
 *
 * Sécurité (même principe que `app/api/ai/route.ts`) :
 *  - `AI_API_KEY`/`AI_MODEL`/`AI_BASE_URL` ne sont lus que côté serveur
 *    (`lib/ai/client.ts`), jamais transmis au client.
 *  - L'utilisateur doit être authentifié (`supabase.auth.getUser()`).
 *  - Le contexte envoyé au modèle (`fetchAssistantContext`) est
 *    toujours filtré par `.eq("user_id", userId)` : aucune donnée d'un
 *    autre utilisateur ne peut y figurer, même si la RLS était mal
 *    configurée.
 *  - Message vide/absent refusé avant tout appel IA.
 *  - Aucune erreur technique (message d'exception brut, détail
 *    fournisseur) n'est jamais renvoyée au client : uniquement des
 *    messages génériques prêts à afficher.
 *  - Aucune écriture en base, aucune mémoire serveur : l'historique de
 *    conversation transite uniquement via le corps de la requête,
 *    fourni par le client (voir `hooks/useAssistant.ts`).
 */

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CONTENT_LENGTH = 2000;

/** Valide/nettoie l'historique fourni par le client : tout élément qui
 *  ne correspond pas exactement au contrat attendu est simplement
 *  ignoré (jamais une erreur 400 pour un historique légèrement
 *  corrompu côté client — seul le nouveau message est bloquant). */
function sanitizeHistory(value: unknown): AssistantMessage[] {
  if (!Array.isArray(value)) return [];

  const cleaned: AssistantMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (
      (role === "user" || role === "assistant") &&
      typeof content === "string" &&
      content.trim().length > 0
    ) {
      cleaned.push({ role, content: content.trim().slice(0, MAX_HISTORY_CONTENT_LENGTH) });
    }
  }

  return cleaned.slice(-MAX_HISTORY_MESSAGES);
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

  const { message, history } = body as Record<string, unknown>;

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
  }

  const trimmedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);
  const safeHistory = sanitizeHistory(history);

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  const userId = userData.user.id;

  try {
    const context = await fetchAssistantContext(supabase, userId);
    const prompt = {
      system: buildAssistantSystemPrompt(),
      user: buildAssistantUserPrompt(context, safeHistory, trimmedMessage),
    };

    const reply = await callAi(prompt);
    const trimmedReply = reply.trim();

    if (!trimmedReply) {
      return NextResponse.json(
        { error: "L'assistant n'a pas pu répondre. Réessayez." },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply: trimmedReply });
  } catch (err) {
    // Aucune fuite de détail technique (message d'exception, réponse
    // brute du fournisseur…) vers le client — voir consigne de
    // sécurité en tête de fichier.
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json(
        { error: "L'assistant n'est pas disponible pour le moment." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "L'assistant n'a pas pu répondre. Réessayez." },
      { status: 502 }
    );
  }
}
