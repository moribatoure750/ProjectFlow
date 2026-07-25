-- Lot 8A — Activation de la Row Level Security (RLS) sur projects,
-- tasks et meetings.
--
-- Fichier documentaire : à exécuter manuellement dans le SQL Editor de
-- Supabase (ce repo n'a pas de CLI/migrations Supabase configurée),
-- même pattern que supabase/meetings.sql et
-- supabase/user_id_migration.sql.
--
-- Portée : active RLS sur les 3 tables et crée une policy par
-- opération (SELECT/INSERT/UPDATE/DELETE), toutes basées sur
-- `user_id = auth.uid()`. Aucune policy ne référence la table
-- `projects` depuis `tasks`/`meetings` : chaque table porte déjà son
-- propre `user_id` (Lot 7), donc `user_id = auth.uid()` suffit sans
-- jointure.
--
-- Réexécutable : chaque `CREATE POLICY` est précédée d'un
-- `DROP POLICY IF EXISTS` correspondant, pour pouvoir relancer le
-- script pendant le développement sans erreur "policy already
-- exists".
--
-- NE PAS activer FORCE ROW LEVEL SECURITY dans ce lot.
-- `ENABLE ROW LEVEL SECURITY` (utilisé ci-dessous) applique déjà les
-- policies à tous les rôles non-propriétaires de la table, y compris
-- le rôle utilisé par l'application (`anon`/`authenticated` via la
-- clé publique Supabase) — c'est le comportement voulu ici.
-- `FORCE ROW LEVEL SECURITY` irait plus loin : il appliquerait les
-- policies même au *propriétaire* de la table (généralement un rôle
-- d'administration type `postgres`/`service_role`), ce qui casserait
-- toute opération de maintenance manuelle exécutée depuis le SQL
-- Editor avec un rôle privilégié. On le réserve à un lot ultérieur,
-- une fois les policies validées en conditions réelles.

-- ============================================================
-- projects
-- ============================================================

alter table projects enable row level security;

-- SELECT : `using` filtre les lignes visibles par une lecture — un
-- utilisateur ne voit que ses propres projets.
drop policy if exists "projects_select_own" on projects;
create policy "projects_select_own"
  on projects for select
  using (user_id = auth.uid());

-- INSERT : `with check` filtre la ligne qui est en train d'être
-- créée (il n'y a pas de ligne existante à filtrer avec `using` pour
-- un INSERT) — la ligne insérée doit porter le user_id de l'appelant.
drop policy if exists "projects_insert_own" on projects;
create policy "projects_insert_own"
  on projects for insert
  with check (user_id = auth.uid());

-- UPDATE : nécessite les deux clauses.
--  - `using`      : quelles lignes existantes peuvent être ciblées
--                    (on ne peut modifier que ses propres projets).
--  - `with check` : quelle valeur finale est autorisée après
--                    modification (on ne peut pas réattribuer un
--                    projet à un autre user_id).
drop policy if exists "projects_update_own" on projects;
create policy "projects_update_own"
  on projects for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE : `using` filtre les lignes qui peuvent être supprimées.
drop policy if exists "projects_delete_own" on projects;
create policy "projects_delete_own"
  on projects for delete
  using (user_id = auth.uid());

-- ============================================================
-- tasks
-- ============================================================

alter table tasks enable row level security;

drop policy if exists "tasks_select_own" on tasks;
create policy "tasks_select_own"
  on tasks for select
  using (user_id = auth.uid());

drop policy if exists "tasks_insert_own" on tasks;
create policy "tasks_insert_own"
  on tasks for insert
  with check (user_id = auth.uid());

drop policy if exists "tasks_update_own" on tasks;
create policy "tasks_update_own"
  on tasks for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tasks_delete_own" on tasks;
create policy "tasks_delete_own"
  on tasks for delete
  using (user_id = auth.uid());

-- ============================================================
-- meetings
-- ============================================================

alter table meetings enable row level security;

drop policy if exists "meetings_select_own" on meetings;
create policy "meetings_select_own"
  on meetings for select
  using (user_id = auth.uid());

drop policy if exists "meetings_insert_own" on meetings;
create policy "meetings_insert_own"
  on meetings for insert
  with check (user_id = auth.uid());

drop policy if exists "meetings_update_own" on meetings;
create policy "meetings_update_own"
  on meetings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "meetings_delete_own" on meetings;
create policy "meetings_delete_own"
  on meetings for delete
  using (user_id = auth.uid());

-- ============================================================
-- Vérification finale
-- ============================================================
-- Les 3 lignes doivent afficher rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where tablename in ('projects', 'tasks', 'meetings');

-- Optionnel : lister les policies créées (4 par table, 12 au total).
select tablename, policyname, cmd
from pg_policies
where tablename in ('projects', 'tasks', 'meetings')
order by tablename, cmd;
