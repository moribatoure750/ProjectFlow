import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/next-path";

/**
 * Route Handler de callback pour la confirmation d'email Supabase
 * (Lot 5). Volontairement placée hors du groupe `(auth)` : le layout
 * `(auth)` redirige toute session déjà active vers `/`, ce qui
 * interférerait avec le traitement du `code` avant même l'échange.
 *
 * Exclue de `proxy.ts` (voir la garde en tête de `proxy()`) pour ne
 * jamais être redirigée vers `/login` avant de pouvoir traiter le
 * `code` — un visiteur qui clique sur le lien reçu par email n'a
 * jamais de session au moment d'arriver ici.
 *
 * Flux :
 *  1. Lire `code` (et `next`) dans l'URL de la requête.
 *  2. `code` absent → erreur immédiate, sans appeler Supabase.
 *  3. `exchangeCodeForSession(code)` : échange le code contre une
 *     session, et écrit les cookies `sb-...-auth-token` sur la
 *     réponse (fonctionne ici car un Route Handler peut écrire des
 *     cookies via `next/headers::cookies()`, contrairement à un
 *     Server Component — voir `lib/supabase/server.ts`).
 *  4. Succès → redirection vers `next` (validé par
 *     `sanitizeNextPath`, défaut `/`).
 *  5. Échec (code absent, invalide, expiré, déjà utilisé, ou toute
 *     autre erreur Supabase) → redirection vers
 *     `/login?error=confirmation_failed`, sans jamais exposer le
 *     message technique Supabase dans l'URL ou l'UI.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  const failureUrl = new URL("/login", requestUrl.origin);
  failureUrl.searchParams.set("error", "confirmation_failed");

  if (!code) {
    return NextResponse.redirect(failureUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(failureUrl);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
