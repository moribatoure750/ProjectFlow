-- Lot 7 — Préparation du modèle multi-utilisateur.
--
-- Fichier documentaire : à exécuter manuellement dans le SQL Editor de
-- Supabase (ce repo n'a pas de CLI/migrations Supabase configurée),
-- même pattern que supabase/meetings.sql.
--
-- Portée : ajoute `user_id` aux tables `projects`, `tasks`, `meetings`,
-- backfill sur le compte existant, puis contraintes NOT NULL + FK +
-- index. AUCUNE Row Level Security n'est activée ici (Lot 8).
--
-- ⚠️ Avant d'exécuter l'étape 2, remplacer <USER_ID> par l'UUID réel du
-- compte existant (visible via : select id, email from auth.users;).
-- Cet UUID n'apparaît QUE dans ce script SQL, jamais dans le code
-- TypeScript de l'application.

-- ============================================================
-- Étape 0 — Vérification préalable (à exécuter et lire avant tout)
-- ============================================================
-- Doit renvoyer exactement 1 ligne : le compte propriétaire de toutes
-- les données existantes.
select id, email from auth.users;

-- ============================================================
-- Étape 1 — Ajout de user_id (nullable pour l'instant)
-- ============================================================
alter table projects add column user_id uuid;
alter table tasks add column user_id uuid;
alter table meetings add column user_id uuid;

-- ============================================================
-- Étape 2 — Backfill sur le compte existant
-- ============================================================
-- Remplacer <USER_ID> par l'UUID obtenu à l'étape 0.
update projects set user_id = '7ff94cfc-57ec-49bb-9068-76b624e7f73e' where user_id is null;
update tasks set user_id = '7ff94cfc-57ec-49bb-9068-76b624e7f73e' where user_id is null;
update meetings set user_id = '7ff94cfc-57ec-49bb-9068-76b624e7f73e' where user_id is null;

-- ============================================================
-- Étape 3 — Vérification : aucune ligne ne doit rester orpheline
-- ============================================================
-- Chacune des 3 requêtes suivantes doit renvoyer 0.
select count(*) from projects where user_id is null;
select count(*) from tasks where user_id is null;
select count(*) from meetings where user_id is null;

-- ============================================================
-- Étape 4 — Contrainte NOT NULL
-- ============================================================
alter table projects alter column user_id set not null;
alter table tasks alter column user_id set not null;
alter table meetings alter column user_id set not null;

-- ============================================================
-- Étape 5 — Clé étrangère vers auth.users, suppression en cascade
-- ============================================================
alter table projects
  add constraint projects_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table tasks
  add constraint tasks_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table meetings
  add constraint meetings_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- ============================================================
-- Étape 6 — Index (chaque service filtrera désormais par user_id)
-- ============================================================
create index projects_user_id_idx on projects(user_id);
create index tasks_user_id_idx on tasks(user_id);
create index meetings_user_id_idx on meetings(user_id);
