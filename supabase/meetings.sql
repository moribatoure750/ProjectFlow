-- Module Réunions — schéma de la table `meetings`.
--
-- Fichier documentaire : à exécuter manuellement dans le SQL Editor de
-- Supabase (ce repo n'a pas de CLI/migrations Supabase configurée).
-- Cohérent avec les tables `projects` et `tasks` déjà existantes.

create table meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  location text,
  meeting_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  constraint meetings_status_check check (status in ('planned', 'completed', 'cancelled')),
  constraint meetings_time_range_check check (ends_at > starts_at)
);

create index meetings_project_id_idx on meetings(project_id);
create index meetings_starts_at_idx on meetings(starts_at);
