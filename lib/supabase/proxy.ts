import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Client Supabase utilisé uniquement dans `proxy.ts` (racine du projet).
 *
 * Rôle : rafraîchir le cookie de session à chaque requête (le token
 * d'accès Supabase expire régulièrement ; sans ce rafraîchissement,
 * l'utilisateur serait déconnecté prématurément côté serveur même si son
 * refresh token est toujours valide) et exposer une réponse
 * (`NextResponse`) sur laquelle `proxy.ts` peut lire l'utilisateur courant
 * puis, si besoin, rediriger.
 *
 * Pattern officiel `@supabase/ssr` pour Proxy/Middleware Next.js : les
 * cookies doivent être répercutés à la fois sur `request` (pour que la
 * suite de la requête voie la session à jour) et sur `response` (pour que
 * le navigateur reçoive le cookie rafraîchi).
 */
export function createClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, response };
}
