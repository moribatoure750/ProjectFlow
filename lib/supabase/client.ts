import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase navigateur (Client Components).
 *
 * Utilisé par tous les services existants (`projects.service.ts`,
 * `tasks.service.ts`, `meetings.service.ts`) ainsi que par le futur
 * `auth.service.ts`. Remplace l'ancien `lib/supabase.ts` (client
 * `supabase-js` brut, session stockée en `localStorage`).
 *
 * `@supabase/ssr` synchronise automatiquement la session avec les cookies
 * du navigateur, ce qui permet au serveur (Server Components, `proxy.ts`)
 * de lire la même session via `lib/supabase/server.ts`.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
