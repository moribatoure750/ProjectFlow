-- Lot 17A — Commentaires (infrastructure uniquement).
-- Lot 17B — Branchement vers le journal d'activité (voir
-- services/comments.service.ts, qui appelle désormais `logActivity()`
-- avec les actions comment_created/comment_updated/comment_deleted —
-- voir supabase/activity_logs.sql, Étape 3, pour l'extension de la
-- liste blanche correspondante).
--
-- Fichier documentaire : à exécuter manuellement dans le SQL Editor de
-- Supabase (ce repo n'a pas de CLI/migrations Supabase configurée),
-- même pattern que supabase/attachments.sql et supabase/activity_logs.sql.
--
-- Portée de ce lot : table `comments` + RLS uniquement. Aucune
-- journalisation n'est déclenchée par SQL/trigger ici : le branchement
-- vers `activity_logs` se fait entièrement côté application, dans
-- services/comments.service.ts (`logActivity`), pas dans ce fichier.
--
-- Idempotence : comme pour les migrations précédentes, l'étape 1
-- (CREATE TABLE + index) N'EST PAS réexécutable (à lancer une seule
-- fois), l'étape 2 (policies RLS) EST réexécutable (chaque
-- `CREATE POLICY` est précédée d'un `DROP POLICY IF EXISTS`).

-- ============================================================
-- Étape 1 — Table `comments`
-- ============================================================
-- Modèle volontairement simple (comme `activity_logs`, pas de FK
-- polymorphe comme `attachments`) : `entity_type` + `entity_id`
-- suffisent, sans contrainte d'intégrité référentielle vers
-- projects/tasks/meetings. Un commentaire reste donc consultable même
-- si l'entité source a été supprimée depuis — même choix que pour le
-- journal d'activité.
--
-- `updated_at`/`edited_at` sont deux colonnes distinctes :
--  - `updated_at` est mise à jour à CHAQUE modification (y compris
--    d'éventuels futurs champs autres que `content`) ;
--  - `edited_at` n'est renseignée que lors d'une édition du contenu
--    par l'utilisateur, et sert de seule condition d'affichage du
--    badge "Modifié" côté UI (voir components/comments/CommentItem.tsx).
--    Les deux sont mises à jour ensemble par
--    `services/comments.service.ts` (`updateComment`), pas de trigger
--    SQL : ce lot reste volontairement simple.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,

  constraint comments_entity_type_check
    check (entity_type in ('project', 'task', 'meeting')),

  -- Empêche une chaîne vide ET une chaîne composée uniquement
  -- d'espaces (une chaîne vide n'est pas null, donc `not null` seul
  -- ne suffit pas) — même pattern que
  -- `attachments_file_name_not_blank_check` (supabase/attachments.sql).
  constraint comments_content_not_blank_check
    check (length(trim(content)) > 0)
);

-- Index demandés par le Lot 17A :
--  - (user_id)                     : filtrage RLS + requêtes globales.
--  - (entity_type, entity_id)       : chargement des commentaires d'une
--                                      entité précise (usage principal
--                                      de `getComments()`).
--  - (created_at desc)              : tri chronologique inverse, déjà
--                                      l'ordre utilisé par
--                                      services/comments.service.ts.
create index comments_user_id_idx on public.comments(user_id);
create index comments_entity_idx on public.comments(entity_type, entity_id);
create index comments_created_at_idx on public.comments(created_at desc);

-- ============================================================
-- Étape 2 — RLS de la table `comments`
-- ============================================================
-- SELECT/INSERT/UPDATE/DELETE, toutes restreintes au propriétaire —
-- à la différence de `activity_logs` (immuable, pas d'UPDATE/DELETE)
-- mais comme `attachments` : un commentaire appartient à son auteur,
-- qui peut le modifier ou le supprimer, jamais un autre utilisateur.
--
-- Pas de vérification d'appartenance de l'entité référencée (même
-- choix que `activity_logs_insert_own`, supabase/activity_logs.sql) :
-- ce lot ne l'exige pas explicitement, et `entity_id` n'a pas de FK
-- vers projects/tasks/meetings (voir Étape 1).

alter table public.comments enable row level security;

drop policy if exists "comments_select_own" on public.comments;
create policy "comments_select_own"
  on public.comments for select
  using (user_id = auth.uid());

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments for insert
  with check (user_id = auth.uid());

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own"
  on public.comments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
  on public.comments for delete
  using (user_id = auth.uid());

-- ============================================================
-- Vérification finale
-- ============================================================
-- Doit afficher rowsecurity = true pour comments.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'comments';

-- Doit afficher exactement 4 lignes (select, insert, update, delete).
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'comments'
order by cmd;
