import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase serveur (Server Components / Server Actions / Route
 * Handlers).
 *
 * Doit être instancié à la demande (une nouvelle instance par requête,
 * jamais un singleton exporté) car il est lié aux cookies de la requête
 * courante via `next/headers`.
 *
 * Le bloc `try/catch` autour de `setAll` est le pattern officiel
 * `@supabase/ssr` : un Server Component ne peut pas écrire de cookies
 * (uniquement les lire) — l'écriture réelle du cookie de session
 * rafraîchi est déléguée à `proxy.ts`, qui s'exécute avant le rendu.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : ignoré sans risque car
            // `proxy.ts` rafraîchit déjà la session à chaque requête.
          }
        },
      },
    }
  );
}
