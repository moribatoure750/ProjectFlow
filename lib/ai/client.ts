/**
 * Lot 19 — IA utile : client HTTP serveur uniquement vers un fournisseur
 * compatible OpenAI (`POST {AI_BASE_URL}/chat/completions`).
 *
 * Ce module n'est jamais importé depuis un composant client : seule
 * `app/api/ai/route.ts` l'utilise. La clé API (`AI_API_KEY`) n'est donc
 * jamais incluse dans le bundle envoyé au navigateur (elle n'est pas
 * préfixée `NEXT_PUBLIC_`, contrairement à
 * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
 *
 * Variables d'environnement attendues :
 *  - `AI_API_KEY`  : clé secrète du fournisseur.
 *  - `AI_MODEL`    : identifiant du modèle à utiliser.
 *  - `AI_BASE_URL` : URL de base de l'API (compatible OpenAI), sans le
 *                    suffixe `/chat/completions`.
 *
 * Si l'une de ces variables est absente, `callAi()` lève
 * `AiNotConfiguredError` — l'application reste fonctionnelle sans
 * configuration IA : voir `app/api/ai/route.ts`, qui traduit cette
 * exception en réponse HTTP 503 plutôt qu'un crash serveur.
 */

export class AiNotConfiguredError extends Error {
  constructor() {
    super("La génération IA n'est pas configurée sur ce serveur.");
    this.name = "AiNotConfiguredError";
  }
}

export interface AiPrompt {
  system: string;
  user: string;
}

/**
 * Retire un éventuel bloc de code Markdown (```json ... ```) autour de
 * la réponse — certains modèles enveloppent leur JSON malgré la
 * consigne explicite du prompt de ne renvoyer que du JSON brut.
 */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

/**
 * Appelle le fournisseur IA configuré avec un couple de messages
 * système/utilisateur, et renvoie le contenu texte brut de la réponse
 * (jamais parsé ici — voir `lib/ai/schemas.ts` pour la validation et le
 * parsing JSON, propres à chaque action).
 */
export async function callAi(prompt: AiPrompt): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  const baseUrl = process.env.AI_BASE_URL;

  if (!apiKey || !model || !baseUrl) {
    throw new AiNotConfiguredError();
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: 0.4,
      }),
    });
  } catch {
    throw new Error("Impossible de contacter le service IA.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Le service IA a répondu avec une erreur (${response.status}).${
        detail ? ` ${detail.slice(0, 200)}` : ""
      }`
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  const content = (
    payload as { choices?: { message?: { content?: unknown } }[] } | null
  )?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Le service IA a renvoyé une réponse vide ou invalide.");
  }

  return stripCodeFence(content);
}
