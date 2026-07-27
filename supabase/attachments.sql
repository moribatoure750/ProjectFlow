-- Lot 13A — Pièces jointes privées (architecture, modèle de données,
-- Storage, sécurité).
--
-- Fichier documentaire : à exécuter manuellement dans le SQL Editor de
-- Supabase (ce repo n'a pas de CLI/migrations Supabase configurée),
-- même pattern que supabase/meetings.sql, supabase/user_id_migration.sql
-- et supabase/rls_policies.sql.
--
-- Portée de ce lot : table `attachments`, bucket Storage privé
-- `attachments`, RLS table + Storage. AUCUNE UI ne consomme encore ce
-- schéma (Lot 13B). Ne pas exécuter avant relecture complète.
--
-- Idempotence — IMPORTANT (précision après revue) :
--   - Étape 1 (CREATE TABLE + contraintes + index) N'EST PAS
--     réexécutable : à lancer une seule fois. Une deuxième exécution
--     échouera ("relation already exists"), ce qui est volontaire :
--     on ne masque jamais un schéma potentiellement incomplet derrière
--     un `CREATE TABLE IF NOT EXISTS`.
--   - Étape 2 (upsert du bucket Storage) EST idempotente
--     (`on conflict (id) do update`).
--   - Étapes 3 et 4 (policies RLS table + Storage) SONT réexécutables :
--     chaque `CREATE POLICY` est précédée d'un `DROP POLICY IF EXISTS`
--     correspondant (même pattern que le Lot 8A).

-- ============================================================
-- Étape 1 — Table `attachments`
-- ============================================================
-- Modèle "polymorphe" via 3 FK nullables plutôt qu'un entity_id
-- générique : chaque colonne conserve une vraie intégrité référentielle
-- (on delete cascade) vers sa table cible. `entity_type` est dénormalisé
-- pour permettre un filtrage direct sans avoir à tester les 3 FK côté
-- application, mais reste garanti cohérent avec la FK réellement
-- remplie par `attachments_entity_type_match_check` ci-dessous.
--
-- Schémas qualifiés explicitement (public./auth./storage.) pour ne pas
-- dépendre implicitement du search_path.

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  meeting_id uuid references public.meetings(id) on delete cascade,
  entity_type text not null,
  -- Chemin complet dans le bucket Storage `attachments`. Jamais basé
  -- sur le nom original du fichier (voir Étape 2) : `unique` empêche
  -- toute collision d'insertion en cas de génération d'UUID dupliqué
  -- (extrêmement improbable, mais sans coût à interdire explicitement).
  storage_path text not null unique,
  -- Nom original choisi par l'utilisateur, affiché dans l'UI (Lot 13B)
  -- mais jamais utilisé comme chemin Storage.
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),

  constraint attachments_entity_type_check
    check (entity_type in ('project', 'task', 'meeting')),

  -- Exactement une des 3 FK doit être renseignée : une pièce jointe
  -- appartient à une seule entité, jamais zéro, jamais plusieurs.
  constraint attachments_single_entity_check check (
    (case when project_id is not null then 1 else 0 end) +
    (case when task_id    is not null then 1 else 0 end) +
    (case when meeting_id is not null then 1 else 0 end) = 1
  ),

  -- `entity_type` doit correspondre à la FK réellement remplie —
  -- empêche par exemple entity_type = 'task' avec seulement project_id
  -- renseigné.
  constraint attachments_entity_type_match_check check (
    (entity_type = 'project' and project_id is not null) or
    (entity_type = 'task'    and task_id    is not null) or
    (entity_type = 'meeting' and meeting_id is not null)
  ),

  -- 10 Mo — doit rester cohérent avec MAX_ATTACHMENT_SIZE_BYTES
  -- (types/attachment.ts) et avec la config `file_size_limit` du
  -- bucket (Étape 2). Trois lignes de défense indépendantes.
  constraint attachments_size_check
    check (size_bytes > 0 and size_bytes <= 10485760),

  -- Défense en profondeur : la table elle-même refuse tout MIME hors
  -- liste, en plus de la validation cliente
  -- (ALLOWED_ATTACHMENT_MIME_TYPES, types/attachment.ts) et de la
  -- config `allowed_mime_types` du bucket (Étape 2). Les 3 listes
  -- doivent rester rigoureusement identiques (voir revue Lot 13A).
  constraint attachments_mime_type_check check (
    mime_type in (
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    )
  ),

  -- Empêche les chaînes vides/blanches, qui contourneraient l'intention
  -- de `not null` (une chaîne vide n'est pas null).
  constraint attachments_file_name_not_blank_check
    check (length(trim(file_name)) > 0),
  constraint attachments_storage_path_not_blank_check
    check (length(trim(storage_path)) > 0)
);

create index attachments_project_id_idx on public.attachments(project_id);
create index attachments_task_id_idx on public.attachments(task_id);
create index attachments_meeting_id_idx on public.attachments(meeting_id);
create index attachments_user_id_idx on public.attachments(user_id);

-- ============================================================
-- Étape 2 — Bucket Storage privé `attachments`
-- ============================================================
-- `public = false` : aucun fichier n'est jamais accessible par une URL
-- publique, uniquement via des URLs signées à courte durée de vie
-- (générées à la demande par `getSignedAttachmentUrl()`, jamais
-- persistées).
--
-- Chemin des objets : {user_id}/{entity_type}/{entity_id}/{uuid}.{ext}
-- ex. 7ff9.../task/3af2.../8b1c9e2f-....pdf
-- Le nom ORIGINAL du fichier n'apparaît jamais dans le chemin (évite
-- collisions, caractères spéciaux/URL-unsafe, fuite du nom réel dans
-- les logs Storage) — seule l'extension canonique dérivée du MIME
-- validé est reprise (voir ATTACHMENT_EXTENSION_BY_MIME,
-- types/attachment.ts) ; le nom complet reste uniquement dans la
-- colonne `file_name`.
--
-- `file_size_limit` et `allowed_mime_types` dupliquent volontairement
-- MAX_ATTACHMENT_SIZE_BYTES / ALLOWED_ATTACHMENT_MIME_TYPES
-- (types/attachment.ts) et `attachments_mime_type_check` (Étape 1)
-- comme lignes de défense supplémentaires côté Storage, indépendantes
-- d'un client potentiellement contourné. La référence à tenir à jour
-- en premier reste la constante TypeScript.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- Étape 3 — RLS de la table `attachments`
-- ============================================================
-- SELECT/INSERT/DELETE uniquement — pas d'UPDATE : les métadonnées
-- d'une pièce jointe ne sont pas modifiables dans ce lot (cohérent
-- avec l'absence de versionnage). Un futur `replaceAttachment()`
-- (voir services/attachments.service.ts) passera par un delete+insert,
-- pas par un update.

alter table public.attachments enable row level security;

drop policy if exists "attachments_select_own" on public.attachments;
create policy "attachments_select_own"
  on public.attachments for select
  using (user_id = auth.uid());

-- INSERT — renforcée après revue de sécurité (Lot 13A) : vérifie non
-- seulement `user_id = auth.uid()`, mais aussi que l'entité référencée
-- appartient réellement à l'utilisateur courant, et que le
-- `storage_path` correspond bien au préfixe attendu
-- (user_id/entity_type/entity_id/...). Sans cela, un client
-- contournant le service TypeScript pourrait insérer une ligne
-- `attachments` pointant vers l'entité d'un AUTRE utilisateur tout en
-- indiquant son propre `user_id` — les contraintes
-- `attachments_single_entity_check` / `attachments_entity_type_match_check`
-- (Étape 1) garantissent la cohérence interne de la ligne, mais pas
-- l'appartenance de l'entité référencée : c'est le rôle de cette
-- policy, en complément de ces contraintes (pas en remplacement).
drop policy if exists "attachments_insert_own" on public.attachments;
create policy "attachments_insert_own"
  on public.attachments
  for insert
  with check (
    user_id = auth.uid()

    and storage_path = trim(storage_path)

    and (
      (
        entity_type = 'project'
        and project_id is not null
        and exists (
          select 1
          from public.projects p
          where p.id = project_id
            and p.user_id = auth.uid()
        )
        and storage_path like (
          auth.uid()::text
          || '/project/'
          || project_id::text
          || '/%'
        )
      )

      or

      (
        entity_type = 'task'
        and task_id is not null
        and exists (
          select 1
          from public.tasks t
          where t.id = task_id
            and t.user_id = auth.uid()
        )
        and storage_path like (
          auth.uid()::text
          || '/task/'
          || task_id::text
          || '/%'
        )
      )

      or

      (
        entity_type = 'meeting'
        and meeting_id is not null
        and exists (
          select 1
          from public.meetings m
          where m.id = meeting_id
            and m.user_id = auth.uid()
        )
        and storage_path like (
          auth.uid()::text
          || '/meeting/'
          || meeting_id::text
          || '/%'
        )
      )
    )
  );

drop policy if exists "attachments_delete_own" on public.attachments;
create policy "attachments_delete_own"
  on public.attachments for delete
  using (user_id = auth.uid());

-- ============================================================
-- Étape 4 — RLS de `storage.objects` pour le bucket `attachments`
-- ============================================================
-- Basées sur le premier segment du chemin (`storage.foldername(name)[1]`),
-- qui est toujours le `user_id` de l'uploader (voir Étape 2). Pas de
-- policy UPDATE : un objet Storage n'est jamais écrasé, uniquement
-- supprimé puis re-uploadé (même logique que la table ci-dessus).

drop policy if exists "attachments_storage_select_own" on storage.objects;
create policy "attachments_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "attachments_storage_insert_own" on storage.objects;
create policy "attachments_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "attachments_storage_delete_own" on storage.objects;
create policy "attachments_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Note — Suppression et fichiers orphelins (assumé dans ce lot)
-- ============================================================
-- Ordre applicatif choisi dans services/attachments.service.ts :
--   1. suppression de la ligne `attachments` (DB)
--   2. suppression de l'objet Storage correspondant
-- Si l'étape 2 échoue après un succès de l'étape 1, un fichier Storage
-- orphelin (sans ligne DB associée) peut subsister. Ce cas est assumé
-- dans ce lot : `deleteAttachment()` retourne une erreur explicite en
-- cas d'échec de l'étape 2, mais aucun nettoyage automatique n'est
-- déclenché.
--
-- Par ailleurs, la suppression d'un projet/tâche/réunion supprime en
-- cascade (SQL) les lignes `attachments` associées, mais PAS les
-- fichiers Storage correspondants — même limite assumée.
--
-- Un futur lot pourra ajouter :
--   - une requête de détection des fichiers Storage orphelins
--     (objets sans ligne `attachments` correspondante) ;
--   - un nettoyage automatique (Edge Function ou job planifié) ;
--   - une exécution périodique (cron Supabase / pg_cron).
-- Aucune de ces briques n'est implémentée ici.

-- ============================================================
-- Vérification finale
-- ============================================================
-- Doit afficher rowsecurity = true pour attachments.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'attachments';

-- Filtre précis : les 3 policies de public.attachments, plus
-- uniquement les policies Storage propres à ce bucket (préfixées
-- "attachments_storage_") — évite d'afficher des policies Storage
-- d'autres buckets sans rapport.
select schemaname, tablename, policyname, cmd
from pg_policies
where
  (schemaname = 'public' and tablename = 'attachments')
  or (
    schemaname = 'storage'
    and tablename = 'objects'
    and policyname like 'attachments_storage_%'
  )
order by schemaname, tablename, cmd;

-- Doit afficher la ligne du bucket attachments avec public = false.
select id, name, public, file_size_limit
from storage.buckets
where id = 'attachments';
