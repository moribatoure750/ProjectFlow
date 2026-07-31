-- Lot 18 — Checklist des tâches (table `task_checklists`).
--
-- Fichier documentaire : à exécuter manuellement dans le SQL Editor de
-- Supabase (ce repo n'a pas de CLI/migrations Supabase configurée),
-- même pattern que supabase/comments.sql et supabase/attachments.sql.
--
-- Portée de ce lot : une checklist n'existe que pour les tâches
-- (page `/tasks/[id]`), jamais pour les projets ni les réunions —
-- contrairement à `attachments`/`comments`/`activity_logs`, ce modèle
-- n'est donc pas polymorphe : une seule FK `task_id`, pas
-- d'`entity_type`.
--
-- Idempotence : comme pour les migrations précédentes, l'étape 1
-- (CREATE TABLE + index) N'EST PAS réexécutable (à lancer une seule
-- fois), l'étape 2 (policies RLS) EST réexécutable (chaque
-- `CREATE POLICY` est précédée d'un `DROP POLICY IF EXISTS`).
--
-- Voir aussi supabase/activity_logs.sql, Étape 4, pour l'extension de
-- la liste blanche `activity_logs_action_check` avec les 5 nouvelles
-- actions émises par services/checklist.service.ts
-- (checklist_item_created/completed/uncompleted/updated/deleted) — à
-- exécuter séparément, pas redéfini ici.

-- ============================================================
-- Étape 1 — Table `task_checklists`
-- ============================================================
-- Une ligne = un élément de checklist. `position` porte l'ordre
-- d'affichage (ascendant), géré exclusivement par
-- `moveChecklistItem()` (boutons Monter/Descendre côté UI) — aucun
-- drag & drop, aucune dépendance externe de tri.
--
-- `on delete cascade` sur `task_id` : la checklist d'une tâche
-- disparaît avec elle, cohérent avec le reste du modèle de données
-- (attachments, comments) qui ne survit pas non plus à la suppression
-- de son entité porteuse (à la différence, volontaire, de
-- `activity_logs`).

create table public.task_checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Empêche une chaîne vide ET une chaîne composée uniquement
  -- d'espaces — même pattern que
  -- `comments_content_not_blank_check`/`attachments_file_name_not_blank_check`.
  constraint task_checklists_content_not_blank_check
    check (length(trim(content)) > 0)
);

-- Index demandés par le Lot 18 :
--  - (task_id)          : chargement de la checklist d'une tâche précise
--                          (usage principal de `getChecklistItems()`).
--  - (user_id)           : filtrage RLS + requêtes globales.
--  - (task_id, position) : tri par position, déjà l'ordre utilisé par
--                          services/checklist.service.ts.
create index task_checklists_task_id_idx on public.task_checklists(task_id);
create index task_checklists_user_id_idx on public.task_checklists(user_id);
create index task_checklists_task_position_idx on public.task_checklists(task_id, position);

-- ============================================================
-- Étape 2 — RLS de la table `task_checklists`
-- ============================================================
-- SELECT/INSERT/UPDATE/DELETE, toutes restreintes au propriétaire —
-- même schéma que `comments` (Lot 17A) : un élément de checklist
-- appartient à son créateur, qui peut le modifier ou le supprimer,
-- jamais un autre utilisateur.
--
-- INSERT vérifie en plus que la tâche référencée (`task_id`)
-- appartient bien à l'utilisateur courant — même principe que
-- `attachments_insert_own` (supabase/attachments.sql) : sans cette
-- vérification, un client contournant le service TypeScript pourrait
-- insérer un élément de checklist sur une tâche appartenant à un AUTRE
-- utilisateur tout en indiquant son propre `user_id`.

alter table public.task_checklists enable row level security;

drop policy if exists "task_checklists_select_own" on public.task_checklists;
create policy "task_checklists_select_own"
  on public.task_checklists for select
  using (user_id = auth.uid());

drop policy if exists "task_checklists_insert_own" on public.task_checklists;
create policy "task_checklists_insert_own"
  on public.task_checklists
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "task_checklists_update_own" on public.task_checklists;
create policy "task_checklists_update_own"
  on public.task_checklists for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "task_checklists_delete_own" on public.task_checklists;
create policy "task_checklists_delete_own"
  on public.task_checklists for delete
  using (user_id = auth.uid());

-- ============================================================
-- Vérification finale
-- ============================================================
-- Doit afficher rowsecurity = true pour task_checklists.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'task_checklists';

-- Doit afficher exactement 4 lignes (select, insert, update, delete).
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'task_checklists'
order by cmd;
