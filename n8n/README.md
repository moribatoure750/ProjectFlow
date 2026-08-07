# Automatisations n8n — ProjectFlow

Ce dossier contient trois workflows n8n **importables**, ajoutant un canal
e-mail complémentaire aux notifications internes de ProjectFlow.

> **Important — périmètre de ce lot**
> Ces workflows ne remplacent ni ne modifient rien du système de
> notifications interne existant (`NotificationBell`, la page
> `/notifications`, `useNotifications`, `notifications.service.ts`, les
> alertes internes). Ils ajoutent uniquement des e-mails envoyés depuis une
> instance n8n externe. Aucun fichier applicatif ProjectFlow n'a été modifié
> pour ce lot.
>
> **Ces workflows n'ont pas été exécutés ni testés dans une instance n8n
> réelle** (aucune instance n8n n'était disponible pendant leur rédaction).
> Ils doivent être importés et testés manuellement avant d'être considérés
> comme fonctionnels. Ne pas les activer en production sans validation
> préalable.

---

## 1. Fichiers de ce dossier

| Fichier | Rôle |
|---|---|
| `new-task-email.json` | Envoie un e-mail de confirmation à la création d'une tâche (déclenché par un Database Webhook Supabase sur `INSERT` de `public.tasks`). |
| `deadline-reminder-email.json` | Chaque jour à 08:00 (America/Toronto), envoie un e-mail récapitulatif par utilisateur listant les tâches en retard / dues aujourd'hui / dues demain. |
| `weekly-progress-report.json` | Chaque lundi à 08:00 (America/Toronto), envoie un rapport hebdomadaire déterministe (sans IA) par utilisateur : projets actifs, tâches créées/terminées/restantes/en retard, échéances et réunions de la semaine, progression par projet. |

Aucun secret, aucune clé API et aucun identifiant réel n'est présent dans
ces fichiers JSON. Tous les accès à Supabase et au SMTP passent par des
**Credentials n8n** (configurées après import, jamais committées) ou des
**variables d'environnement de l'instance n8n** (`$env.XXX`).

---

## 2. Importer les workflows dans n8n

1. Ouvrir votre instance n8n (interface web).
2. Menu **Workflows** → **Import from File** (ou **... > Import from URL/File**
   selon la version).
3. Sélectionner un des trois fichiers JSON de ce dossier.
4. Répéter pour les trois fichiers.
5. Chaque workflow est importé **désactivé** (`"active": false`) : c'est
   volontaire, voir section 7 (Activer les workflows).

---

## 3. Credentials nécessaires

### a) Variables d'environnement de l'instance n8n

Ces valeurs ne doivent **jamais** être ajoutées à `.env.local` (fichier
côté navigateur de l'application Next.js) ni committées dans Git. Elles se
configurent uniquement sur le serveur/l'instance n8n (fichier `.env` de
n8n, variables d'environnement du conteneur/service, ou équivalent selon
votre hébergement n8n) :

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase, ex. `https://xxxxx.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé **service_role** Supabase (bypass RLS + accès à l'API admin Auth). **Secret critique** — jamais dans un fichier committé, jamais côté navigateur. |
| `APP_BASE_URL` | URL publique de l'application ProjectFlow (ex. `https://projectflow.exemple.com`), utilisée uniquement pour générer des liens cliquables dans les e-mails. Optionnelle : si absente, les liens sont simplement omis. |
| `SMTP_FROM_EMAIL` | Adresse d'expédition des e-mails (ex. `notifications@projectflow.app`). Optionnelle, une valeur par défaut est utilisée sinon. |

Timezone : **America/Toronto**, déjà définie dans les paramètres
(`settings.timezone`) de `deadline-reminder-email.json` et
`weekly-progress-report.json`. Vérifiez après import que
**Workflow → Settings → Timezone** affiche bien `America/Toronto` (certaines
versions de n8n ignorent le champ JSON et utilisent le fuseau par défaut de
l'instance si non confirmé manuellement dans l'UI).

### b) Credential Supabase (appels HTTP)

Les nœuds HTTP Request de ces workflows utilisent directement les headers
`apikey` / `Authorization: Bearer` avec `$env.SUPABASE_SERVICE_ROLE_KEY` —
il n'y a donc pas de "credential Supabase" dédiée à créer dans n8n pour
ces workflows : seule la variable d'environnement ci-dessus est nécessaire.

Si vous préférez centraliser la clé dans une Credential n8n plutôt qu'une
variable d'environnement (recommandé si plusieurs personnes gèrent
l'instance), créez une **Header Auth Credential** :
1. **Credentials** → **New** → **Header Auth**.
2. Nom du header : `Authorization`, valeur : `Bearer <SERVICE_ROLE_KEY>`.
3. Remplacez dans chaque nœud HTTP Request l'en-tête codé en dur par cette
   credential (onglet **Authentication** du nœud).

### c) Credential SMTP ou Gmail (envoi d'e-mails)

Chaque workflow contient un nœud **Send Email** (`n8n-nodes-base.emailSend`)
avec un placeholder :
```json
"credentials": {
  "smtp": {
    "id": "REPLACE_WITH_SMTP_CREDENTIAL_ID",
    "name": "SMTP ProjectFlow (à configurer)"
  }
}
```

Pour le configurer :
1. **Credentials** → **New** → **SMTP** (ou **Gmail** si vous utilisez
   l'API Gmail — dans ce cas remplacez le nœud `Send Email` par un nœud
   `Gmail` équivalent).
2. Renseignez host/port/utilisateur/mot de passe (ou App Password Gmail).
3. Ouvrez chaque nœud "Envoyer l'e-mail..." dans les trois workflows et
   sélectionnez la credential nouvellement créée dans le champ
   **Credential for Send Email**.

Aucun mot de passe SMTP ni token Gmail ne doit être écrit dans les fichiers
JSON de ce dossier.

---

## 4. Connecter le Database Webhook Supabase (Workflow 1 uniquement)

1. Dans n8n, ouvrir `new-task-email.json` importé, activer temporairement
   le nœud **Webhook Supabase (INSERT tasks)** pour obtenir son URL de
   production (bouton **Listen for Test Event** en mode test, ou activer le
   workflow pour obtenir l'URL de production définitive).
2. Copier l'URL affichée (ex.
   `https://<votre-instance-n8n>/webhook/projectflow-new-task`).
3. Dans le **Dashboard Supabase** du projet → **Database** →
   **Webhooks** → **Create a new hook**.
4. Configuration :
   - **Table** : `tasks` (schéma `public`).
   - **Events** : `Insert` uniquement.
   - **Type** : `HTTP Request`.
   - **Method** : `POST`.
   - **URL** : l'URL copiée à l'étape 2.
   - **Headers** : aucun secret nécessaire (le nœud `IF` du workflow vérifie
     déjà `type=INSERT` et `table=tasks` côté n8n).
5. Enregistrer. Le payload envoyé par Supabase suit le format standard
   `{ type, table, record, old_record, schema }`, déjà attendu par le nœud
   **Vérifier payload INSERT tasks**.

---

## 5. Remplacer les placeholders de credentials

Après import, pour **chacun des trois workflows** :
1. Ouvrir le workflow dans l'éditeur n8n.
2. Ouvrir chaque nœud contenant une note "à configurer" (visible dans
   l'encadré de note du nœud) : `Envoyer l'e-mail...` / `Envoyer le
   rapport...`.
3. Sélectionner la credential SMTP/Gmail créée en section 3.c.
4. Sauvegarder le workflow (`Ctrl+S` ou bouton **Save**).

Aucun autre placeholder n'est présent : les accès Supabase passent par les
variables d'environnement de l'instance (section 3.a), pas par des
credentials à remplacer dans le JSON.

---

## 6. Tester chaque workflow manuellement

### Workflow 1 — Nouvelle tâche
- Dans l'éditeur, cliquer sur **Execute Workflow** (ou **Listen for Test
  Event** sur le nœud Webhook, puis créer une tâche réelle dans
  ProjectFlow, ou envoyer une requête `curl`/Postman simulant le payload
  Supabase `INSERT` vers l'URL de test).
- Vérifier dans **Executions** que chaque nœud s'exécute sans erreur et
  qu'un e-mail arrive à l'adresse de test.

### Workflow 2 — Rappel d'échéance
- Cliquer sur **Execute Workflow** directement (le Schedule Trigger peut
  être déclenché manuellement en mode édition dans n8n).
- Vérifier qu'au moins un utilisateur test avec des tâches en retard/dues
  reçoit un e-mail unique récapitulatif (et non un e-mail par tâche).

### Workflow 3 — Rapport hebdomadaire
- Cliquer sur **Execute Workflow** directement.
- Vérifier dans l'onglet **Executions** que le nœud Code renvoie bien un
  item par utilisateur ayant un e-mail, et que le contenu du rapport
  correspond aux données réelles du projet Supabase de test.

Dans les trois cas, consultez l'onglet **Executions** de n8n pour inspecter
les données item par item à chaque étape (utile pour déboguer un payload ou
une valeur d'environnement manquante).

---

## 7. Activer les workflows

Une fois les tests manuels validés :
1. Ouvrir le workflow.
2. Activer le bouton **Active** en haut à droite de l'éditeur.
3. Pour le Workflow 1, s'assurer que le Database Webhook Supabase (section
   4) pointe vers l'URL de **production** du webhook (et non l'URL de
   test), sans quoi l'URL change à chaque nouvelle session de test.

---

## 8. Vérifier l'historique d'exécution

- Menu **Executions** (barre latérale n8n) : liste toutes les exécutions,
  succès et échecs, avec horodatage.
- Cliquer sur une exécution pour voir le détail item par item de chaque
  nœud (payload reçu, réponse Supabase, contenu de l'e-mail généré).
- Filtrer par workflow pour isoler les exécutions du rappel quotidien ou du
  rapport hebdomadaire.

---

## 9. Désactiver les e-mails sans affecter les notifications internes

Ces workflows sont **totalement indépendants** de ProjectFlow — les
désactiver n'a aucun impact sur `NotificationBell`, la page
`/notifications`, `useNotifications` ou `notifications.service.ts`.

Pour couper le canal e-mail :
- **Option simple** : désactiver le bouton **Active** de chacun des trois
  workflows dans n8n (aucune suppression nécessaire).
- **Option ciblée** : désactiver uniquement un workflow (ex. garder le
  rappel quotidien mais couper le rapport hebdomadaire).
- **Option radicale** : supprimer le Database Webhook côté Supabase
  (Dashboard → Database → Webhooks) pour couper uniquement le Workflow 1
  sans toucher à n8n.

Dans tous les cas, l'application ProjectFlow elle-même n'a aucune
dépendance vers n8n : elle continue de fonctionner normalement, avec ses
notifications internes intactes.

---

## 10. Schéma des workflows

### Workflow 1 — Nouvelle tâche
```
Webhook Supabase (INSERT tasks)
  → Vérifier payload INSERT tasks (IF)
      ├─ [valide] → Extraire la tâche (Set)
      │              → Récupérer le projet (HTTP GET /rest/v1/projects)
      │              → Récupérer l'utilisateur Auth (HTTP GET /auth/v1/admin/users/:id)
      │              → Email disponible ? (IF)
      │                  ├─ [oui] → Construire l'e-mail (Code) → Envoyer l'e-mail de confirmation (Send Email)
      │                  └─ [non] → Aucun e-mail (NoOp)
      └─ [invalide] → Payload ignoré (NoOp)
```

### Workflow 2 — Rappel d'échéance
```
Tous les jours à 08:00 (Schedule, America/Toronto)
  → Récupérer les tâches non terminées (HTTP GET /rest/v1/tasks, status != done)
  → Regrouper par utilisateur (Code : retard / aujourd'hui / demain, par user_id)
  → Récupérer l'e-mail Auth (HTTP GET /auth/v1/admin/users/:id, un appel par utilisateur groupé)
  → Email disponible ? (IF)
      ├─ [oui] → Construire l'e-mail récapitulatif (Code) → Envoyer l'e-mail récapitulatif (Send Email)
      └─ [non] → Aucun e-mail (NoOp)
```
Un seul e-mail par utilisateur (jamais un e-mail par tâche).

### Workflow 3 — Rapport hebdomadaire
```
Chaque lundi à 08:00 (Schedule, America/Toronto)
  → Construire les rapports par utilisateur (Code : boucle sur tous les
    utilisateurs Auth, requêtes projects/tasks/meetings par utilisateur,
    calculs déterministes, un item JSON par utilisateur avec le HTML final)
  → Envoyer le rapport hebdomadaire (Send Email, un envoi par item/utilisateur)
```
Aucun appel à OpenRouter ou à un autre service d'IA dans ce workflow.

---

## 11. Étapes manuelles restantes

**Dans Supabase :**
- Créer le Database Webhook sur `public.tasks` / `INSERT` (section 4).
- Récupérer la clé `service_role` (Dashboard → Project Settings → API) et
  la configurer **uniquement** comme variable d'environnement de
  l'instance n8n — jamais dans ce repo.

**Dans n8n :**
- Importer les 3 fichiers JSON (section 2).
- Configurer `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`
  (optionnel), `SMTP_FROM_EMAIL` (optionnel) comme variables d'environnement
  de l'instance (section 3.a).
- Créer la credential SMTP/Gmail et la brancher sur les 3 nœuds d'envoi
  (section 3.c et 5).
- Confirmer manuellement le fuseau horaire `America/Toronto` dans les
  paramètres de chaque workflow planifié (section 3.a).
- Tester manuellement chaque workflow (section 6) avant activation.
- Activer les workflows (section 7).

---

## 12. Limites connues de cette première version

- **Pagination Supabase Auth admin** : `weekly-progress-report.json`
  n'appelle qu'une seule page de `/auth/v1/admin/users` (comportement par
  défaut de l'API, généralement 50 utilisateurs). Au-delà, il faudra ajouter
  une pagination (paramètre `page`) — non implémentée dans ce lot.
- **Définition de "semaine"** : pour le rapport hebdomadaire, "tâches
  créées" couvre les 7 jours précédant l'exécution (semaine écoulée), et
  "échéances/réunions de la semaine" couvre les 7 jours suivant
  l'exécution (semaine à venir). C'est une convention documentée ici, pas
  une règle métier validée par le produit.
- **Coût des appels** : `weekly-progress-report.json` effectue 3 requêtes
  REST Supabase par utilisateur + 1 requête Auth admin globale. Sur une
  base d'utilisateurs importante, cela peut représenter un nombre notable
  d'appels HTTP à chaque exécution hebdomadaire.
- **Isolation des erreurs par utilisateur (pas de retry/backoff)** : les
  nœuds qui traitent plusieurs utilisateurs dans une même exécution
  (`Récupérer l'e-mail Auth` et `Envoyer l'e-mail récapitulatif` dans
  `deadline-reminder-email.json` ; `Envoyer le rapport hebdomadaire` dans
  `weekly-progress-report.json` ; la boucle par utilisateur dans le nœud
  Code de `weekly-progress-report.json`) sont conçus pour qu'une erreur sur
  **un** utilisateur (`continueOnFail: true`, ou `try/catch` + `continue`
  dans le Code) n'empêche pas le traitement des **autres** utilisateurs.
  Il n'y a en revanche **aucun retry/backoff automatique** : un utilisateur
  dont le traitement échoue ne recevra simplement pas d'e-mail pour cette
  exécution (visible dans l'onglet **Executions**), sans nouvelle tentative
  automatique (sauf si vous activez la politique de retry par défaut de
  n8n dans les Settings du workflow).

- **Non testé en conditions réelles** : ces workflows n'ont été ni
  importés ni exécutés dans une instance n8n au moment de leur rédaction.
  Une validation manuelle complète (sections 6 et 7) est requise avant
  toute mise en production.
