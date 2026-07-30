-- Lot 16A — Journal d'activité (infrastructure uniquement).
-- Étendu au Lot 17B pour le branchement des commentaires (actions
-- comment_created/comment_updated/comment_deleted).
--
-- Fichier documentaire : à exécuter manuellement dans le SQL Editor de
-- Supabase (ce repo n'a pas de CLI/migrations Supabase configurée),
-- même pattern que supabase/attachments.sql, supabase/meetings.sql et
-- supabase/rls_policies.sql.
--
-- Portée de ce lot : table `activity_logs` + RLS uniquement.
-- AUCUNE journalisation automatique n'est déclenchée par ce lot — voir
-- services/activity.service.ts (`createActivity`) : la fonction existe
-- mais n'est appelée par aucun autre service (ProjectService,
-- TaskService, MeetingService, AttachmentService...). Le Lot 16B se
-- chargera de brancher ces appels.
--
-- Idempotence : comme pour supabase/attachments.sql, l'étape 1 (CREATE
-- TABLE + index) N'EST PAS réexécutable (à lancer une seule fois),
-- l'étape 2 (policies RLS) EST réexécutable (chaque `CREATE POLICY`
-- est précédée d'un `DROP POLICY IF EXISTS`). L'étape 3 (Lot 17B, DROP
-- + ADD CONSTRAINT) EST également réexécutable.

-- ============================================================
-- Étape 1 — Table `activity_logs`
-- ============================================================
-- Modèle volontairement simple (pas de FK polymorphe comme
-- `attachments`) : `entity_type` + `entity_id` suffisent, sans
-- contrainte d'intégrité référentielle vers projects/tasks/meetings.
-- Une activité reste donc consultable même si l'entité source a été
-- supprimée depuis (contrairement aux pièces jointes, qui sont
-- supprimées en cascade avec leur entité) — comportement voulu pour un
-- journal d'activité, qui doit pouvoir survivre à la suppression de
-- l'élément qu'il décrit.
--
-- `metadata` (jsonb) porte les détails spécifiques à chaque action
-- (ex. ancien/nouveau statut, nom du fichier ajouté...) sans avoir à
-- faire évoluer le schéma à chaque nouveau type d'événement — même
-- esprit que la colonne `metadata` d'autres tables jsonb de ce projet.
--
-- NOTE (Lot 17B) : la liste blanche ci-dessous correspond à l'état du
-- Lot 16A au moment de la création de la table. Sur une base déjà
-- créée, exécuter uniquement l'Étape 3 ci-dessous pour l'étendre —
-- ne PAS relancer ce `create table`.

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint activity_logs_entity_type_check
    check (entity_type in ('project', 'task', 'meeting')),

  -- Liste blanche des actions connues au moment de ce lot. Le Lot 16B
  -- devra étendre cette contrainte (DROP + ADD) s'il introduit de
  -- nouvelles valeurs d'action — voir la même remarque sur
  -- `ActivityAction` dans types/activity.ts.
  constraint activity_logs_action_check
    check (action in (
      'created',
      'updated',
      'deleted',
      'status_changed',
      'comment_added',
      'attachment_added',
      'attachment_removed'
    ))
);

-- Index demandés par le Lot 16A :
--  - (user_id)                    : filtrage RLS + requêtes globales.
--  - (entity_type, entity_id)      : chargement du journal d'une entité
--                                     précise (usage principal de
--                                     `getActivities()`).
--  - (created_at desc)             : tri chronologique inverse, déjà
--                                     l'ordre utilisé par
--                                     services/activity.service.ts.
create index activity_logs_user_id_idx on public.activity_logs(user_id);
create index activity_logs_entity_idx on public.activity_logs(entity_type, entity_id);
create index activity_logs_created_at_idx on public.activity_logs(created_at desc);

-- ============================================================
-- Étape 2 — RLS de la table `activity_logs`
-- ============================================================
-- SELECT/INSERT uniquement — pas d'UPDATE, pas de DELETE : un journal
-- d'activité n'est jamais modifié ni supprimé par l'utilisateur final
-- (voir consigne du Lot 16A). Même absence volontaire de policy
-- UPDATE que pour `attachments` (supabase/attachments.sql), mais ici
-- aucune policy DELETE non plus : contrairement aux pièces jointes,
-- rien ne doit jamais effacer une ligne `activity_logs`.
--
-- Pas de vérification d'appartenance de l'entité référencée (à la
-- différence de `attachments_insert_own`, supabase/attachments.sql) :
-- ce lot ne l'exige pas explicitement, et `entity_id` n'a pas de FK
-- vers projects/tasks/meetings (voir Étape 1). Cette vérification
-- pourra être ajoutée dans un lot ultérieur si nécessaire, en
-- s'inspirant de `assertOwnsEntity()`
-- (services/attachments.service.ts).

alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs_select_own" on public.activity_logs;
create policy "activity_logs_select_own"
  on public.activity_logs for select
  using (user_id = auth.uid());

drop policy if exists "activity_logs_insert_own" on public.activity_logs;
create policy "activity_logs_insert_own"
  on public.activity_logs for insert
  with check (user_id = auth.uid());

-- ============================================================
-- Étape 3 (Lot 17B) — Extension de la liste blanche des actions
-- ============================================================
-- Ajoute comment_created/comment_updated/comment_deleted, émises par
-- services/comments.service.ts via `logActivity()` (voir
-- types/activity.ts pour l'union `ActivityAction` correspondante).
-- Réexécutable : DROP puis ADD de la contrainte. `comment_added`
-- (Lot 16A) reste dans la liste blanche pour ne jamais invalider une
-- ligne existante, même si plus aucun service ne l'émet depuis ce
-- lot.

alter table public.activity_logs drop constraint if exists activity_logs_action_check;
alter table public.activity_logs add constraint activity_logs_action_check
  check (action in (
    'created',
    'updated',
    'deleted',
    'status_changed',
    'comment_added',
    'comment_created',
    'comment_updated',
    'comment_deleted',
    'attachment_added',
    'attachment_removed'
  ));

-- ============================================================
-- Vérification finale
-- ============================================================
-- Doit afficher rowsecurity = true pour activity_logs.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'activity_logs';

-- Doit afficher exactement 2 lignes (select, insert).
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'activity_logs'
order by cmd;
