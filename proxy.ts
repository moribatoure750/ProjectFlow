import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/proxy";
import { isSafeInternalPath } from "@/lib/next-path";

/**
 * Proxy Next.js 16 (remplace `middleware.ts`, déprécié depuis la v16.0.0 —
 * voir `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
 *
 * Rôle :
 *  1. Rafraîchir le cookie de session Supabase à chaque requête (via
 *     `lib/supabase/proxy.ts::createClient`, pattern officiel `@supabase/ssr`).
 *  2. Valider la session avec `getClaims()` — jamais `getSession()` seul,
 *     qui ne fait que désérialiser le cookie local sans le revalider
 *     cryptographiquement (voir doc `GoTrueClient.getClaims`).
 *  3. Rediriger : route privée sans session → `/login?next=...` ;
 *     route auth avec session → `/`.
 *
 * Cette redirection est une première ligne rapide ; les layouts serveur
 * `(app)` et `(auth)` refont la même vérification en "defense in depth"
 * (voir `lib/supabase/session.ts`), au cas où le proxy serait contourné,
 * mal configuré, ou non exécuté selon la plateforme de déploiement.
 *
 * Exception : `/auth/callback` (Lot 5, voir `app/auth/callback/route.ts`)
 * est exclue de toute logique d'authentification ci-dessous. Un
 * visiteur qui clique sur le lien de confirmation d'email n'a jamais de
 * session au moment d'arriver ici — le rediriger vers `/login` avant que
 * la route ne puisse échanger son `code` casserait tout le flux.
 */

const AUTH_PATHS = ["/login", "/register"];
const AUTH_CALLBACK_PATH = "/auth/callback";

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.includes(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === AUTH_CALLBACK_PATH) {
    return NextResponse.next();
  }

  const { supabase, response } = createClient(request);

  const { data, error } = await supabase.auth.getClaims();
  const hasSession = !error && data !== null;

  if (!hasSession && !isAuthPath(pathname)) {
    const target = pathname + search;
    const loginUrl = new URL("/login", request.url);
    if (isSafeInternalPath(target) && target !== "/") {
      loginUrl.searchParams.set("next", target);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Exécute le proxy sur toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico, et fichiers publics avec extension (svg, png, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
