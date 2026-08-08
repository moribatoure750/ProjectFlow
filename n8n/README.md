# Automatisations n8n — ProjectFlow (adapté n8n Cloud)

Ce dossier contient trois workflows n8n **importables**, ajoutant un canal
e-mail complémentaire aux notifications internes de ProjectFlow. Cette
version est adaptée pour **n8n Cloud** : elle n'utilise **aucune variable
d'environnement** (`$env.*`), qui n'est généralement pas configurable par
les utilisateurs sur une instance n8n Cloud standard.

> **Important — périmètre de ce lot**
> Ces workflows ne remplacent ni ne modifient rien du système de
> notifications interne existant (`NotificationBell`, la page
> `/notifications`, `useNotifications`, `notifications.service.ts`, les
> alertes internes). Ils ajoutent uniquement des e-mails envoyés depuis une
> instance n8n externe. Aucun fichier applicatif ProjectFlow n'a été modifié
> pour ce lot.
>
> **Ces workflows n'ont pas été exécutés ni testés dans une instance n8n
> réelle** (aucune instance n8n n'était disponible pendant leur rédaction),
> à l'exception du workflow `weekly-progress-report.json` dont
> l'architecture a été revue après un test réel en n8n Cloud (voir section
> 13 et 15 — l'ancienne version appelait Supabase depuis un nœud Code via
> `this.helpers.httpRequestWithAuthentication`, fonction **non supportée**
> dans le nœud Code de n8n Cloud). Les workflows `new-task-email.json` et
> `deadline-reminder-email.json` fonctionnent déjà en production sur une
> instance n8n Cloud réelle et **ne doivent pas être modifiés** sans
> nouvelle validation. Tout nouveau nœud ajouté doit être testé manuellement
> avant activation.

---

## 1. Fichiers de ce dossier

| Fichier | Rôle |
|---|---|
| `new-task-email.json` | Envoie un e-mail de confirmation à la création d'une tâche (déclenché par un Database Webhook Supabase sur `INSERT` de `public.tasks`). |
| `deadline-reminder-email.json` | Chaque jour à 08:00 (America/Toronto), envoie un e-mail récapitulatif par utilisateur listant les tâches en retard / dues aujourd'hui / dues demain. |
| `weekly-progress-report.json` | Chaque lundi à 08:00 (America/Toronto), envoie un rapport hebdomadaire déterministe (sans IA) par utilisateur : projets actifs, tâches créées/terminées/restantes/en retard, échéances et réunions de la semaine, progression par projet. |

Aucun secret, aucune clé API et aucun identifiant réel n'est présent dans
ces fichiers JSON. Tous les accès à Supabase passent par une **Credential
n8n de type Custom Auth** (créée manuellement après import), et l'envoi
SMTP/Gmail passe par une **Credential SMTP n8n** (également créée après
import). Les seules valeurs présentes en clair dans les fichiers sont des
**valeurs de configuration non secrètes** (URL Supabase publique, URL de
l'application, adresse d'expédition), regroupées dans un nœud
**Configuration ProjectFlow** au format placeholder (`YOUR_PROJECT_REF`,
`YOUR_PROJECTFLOW_URL`, `notifications@example.com`).

---

## 2. Vue d'ensemble de l'adaptation n8n Cloud

Par rapport à une version basée sur des variables d'environnement, chaque
workflow contient désormais :

1. **Un nœud "Configuration ProjectFlow"** (type *Edit Fields / Set*),
   placé juste après le déclencheur (Webhook ou Schedule). Il définit
   uniquement 3 valeurs **non secrètes** :
   - `SUPABASE_URL` (ex. `https://YOUR_PROJECT_REF.supabase.co`)
   - `APP_BASE_URL` (ex. `https://YOUR_PROJECTFLOW_URL`)
   - `SMTP_FROM_EMAIL` (ex. `notifications@example.com`)

   Tous les autres nœuds lisent ces valeurs via
   `{{$node["Configuration ProjectFlow"].json.SUPABASE_URL}}` (etc.), et
   plus jamais via `$env`.

2. **Une Credential Custom Auth "Supabase Service Role"**, utilisée par
   tous les nœuds qui appellent l'API Supabase (REST `/rest/v1/...` et
   Auth Admin `/auth/v1/admin/...`). Cette Credential envoie automatiquement
   l'en-tête requis (`apikey`) sans que la clé secrète Supabase
   (format `sb_secret_...`) n'apparaisse jamais dans un nœud Set, un
   Header codé en dur, ou une expression enregistrée dans le JSON du
   workflow.

   > **Important — nouveau format de clé Supabase :** ce projet utilise la
   > nouvelle **Secret key** Supabase (`sb_secret_...`), et non l'ancienne
   > clé JWT `service_role`. Selon la documentation Supabase actuelle, une
   > clé `sb_secret_...` doit être envoyée **uniquement** dans l'en-tête
   > `apikey`. Elle ne doit **jamais** être envoyée comme
   > `Authorization: Bearer sb_secret_...`.

   > **Important — nœuds Code n8n Cloud :** dans le nœud **Code**, les
   > fonctions `this.helpers.httpRequest` et
   > `this.helpers.httpRequestWithAuthentication` ne sont **pas supportées**
   > sur n8n Cloud (erreur *"The function ... is not supported in the Code
   > Node"*). Tous les appels Supabase de ce dossier passent donc
   > exclusivement par des nœuds **HTTP Request** standards, jamais par du
   > code exécuté dans un nœud Code. Les nœuds Code de ce dossier ne font
   > que des calculs sur des données déjà récupérées par des nœuds HTTP
   > Request (aucun `fetch()`, aucun `axios`, aucun `require()` non plus).

3. **Une Credential SMTP/Gmail**, inchangée par rapport à la version
   précédente, à créer et associer manuellement après import.

---

## 3. Importer les workflows dans n8n Cloud

1. Ouvrir votre instance n8n Cloud.
2. Menu **Workflows** → **Import from File** (ou **... > Import from
   URL/File** selon la version).
3. Sélectionner un des trois fichiers JSON de ce dossier.
4. Répéter pour les trois fichiers.
5. Chaque workflow est importé **désactivé** (`"active": false`) : c'est
   volontaire, voir section 8 (Activer les workflows).

> Si `new-task-email.json` et `deadline-reminder-email.json` sont déjà
> importés et actifs en production, **ne pas les réimporter** : seul
> `weekly-progress-report.json` a été modifié dans ce lot (voir section 13).

---

## 4. Configurer le nœud "Configuration ProjectFlow" (dans chaque workflow)

Ce nœud existe dans les **3 workflows**. Après import, pour **chacun des
trois workflows** :

1. Ouvrir le workflow, double-cliquer sur le nœud **Configuration
   ProjectFlow** (juste après le déclencheur Webhook/Schedule).
2. Remplacer les 3 valeurs par défaut :
   - `SUPABASE_URL` → l'URL réelle de votre projet Supabase (Dashboard
     Supabase → Project Settings → API → *Project URL*), par exemple
     `https://abcd1234.supabase.co`.
   - `APP_BASE_URL` → l'URL publique de votre application ProjectFlow
     (ex. `https://projectflow.exemple.com`). Optionnel : si laissé vide ou
     avec le placeholder, les liens cliquables dans les e-mails sont
     simplement omis (aucune erreur).
   - `SMTP_FROM_EMAIL` → l'adresse d'expédition des e-mails (ex.
     `notifications@projectflow.app`).
3. Sauvegarder le nœud, puis sauvegarder le workflow (`Ctrl+S` ou bouton
   **Save**).

Aucune de ces 3 valeurs n'est un secret : elles peuvent être commises dans
Git sans risque (URL publique du projet Supabase, URL publique de
l'application, adresse d'expédition). **Ne jamais** ajouter la Secret key
Supabase (`sb_secret_...`) dans ce nœud.

---

## 5. Créer la Credential Supabase (Custom Auth) et l'associer aux nœuds

### a) Créer la Credential

1. Dans n8n Cloud : **Credentials** → **Add Credential** → rechercher
   **"Custom Auth"** (ou "HTTP Custom Auth" / "Generic Credential Type >
   Custom Auth" selon la version).
2. Nommer la Credential **`Supabase Service Role`** (ou un nom similaire —
   le nom exact n'a pas d'importance, seul le fait de la sélectionner sur
   chaque nœud compte).
3. Dans le champ JSON de la Credential, saisir :
   ```json
   {
     "headers": {
       "apikey": "COLLER_ICI_LA_SUPABASE_SECRET_KEY"
     }
   }
   ```
   en remplaçant le placeholder par la vraie **Secret key** Supabase
   (format `sb_secret_...`, Dashboard Supabase → Project Settings → API
   Keys → *Secret keys*).

   > **Ne jamais** ajouter d'en-tête `Authorization: Bearer sb_secret_...`.
   > Avec le nouveau format de clé Supabase (`sb_secret_...`), seul
   > l'en-tête `apikey` est requis et attendu par l'API Supabase. Envoyer
   > la Secret key dans un en-tête `Authorization` n'est ni nécessaire ni
   > conforme à la documentation Supabase actuelle.
4. **Sauvegarder.** La clé est alors stockée uniquement dans le coffre de
   Credentials chiffré de n8n — elle n'apparaît **jamais** dans l'export
   JSON d'un workflow, ni dans Git.

> Pourquoi "Custom Auth" et pas "Header Auth" ? Les deux permettent de
> définir l'en-tête `apikey` unique requis par Supabase. Nous conservons
> ici "Custom Auth" par cohérence avec le reste du projet et pour pouvoir
> ajouter facilement un en-tête supplémentaire à l'avenir si nécessaire.

### b) Associer la Credential aux nœuds HTTP Request Supabase

Après avoir créé la Credential, ouvrir **chaque nœud** listé dans le
tableau de la section 7 (colonne "Credential Supabase requise"), puis :

1. Ouvrir le nœud (double-clic).
2. Dans le champ **Credential to connect with** (sous *Authentication >
   Generic Credential Type > Custom Auth*), sélectionner
   **`Supabase Service Role`**.
3. Sauvegarder le nœud.

Répéter pour tous les nœuds concernés dans les 3 workflows (voir tableau
section 7).

### c) `weekly-progress-report.json` — un utilisateur à la fois, uniquement des nœuds HTTP Request, jamais de Code

Dans `weekly-progress-report.json`, **tous** les appels Supabase sont
effectués par des nœuds **HTTP Request** dédiés, jamais par du code exécuté
dans un nœud Code (voir encart en section 2, point 2). Le workflow traite
les utilisateurs **un par un**, via une boucle **Split In Batches** (taille
de lot = 1, nœud **"Boucle : un utilisateur à la fois"**) : à aucun moment
les nœuds HTTP suivants ne reçoivent le tableau complet des utilisateurs —
ils ne voient jamais que l'utilisateur courant de la boucle :

- **Récupérer les utilisateurs Auth** (`GET /auth/v1/admin/users`) — un
  seul appel global, avant la boucle.
- **Récupérer les projets de l'utilisateur** (`GET /rest/v1/projects`) —
  un appel, pour l'utilisateur courant de la boucle.
- **Récupérer les tâches de l'utilisateur** (`GET /rest/v1/tasks`) — un
  appel, pour l'utilisateur courant de la boucle.
- **Récupérer les réunions de l'utilisateur** (`GET /rest/v1/meetings`) —
  un appel, pour l'utilisateur courant de la boucle.

Après chacun des 3 appels ci-dessus, un nœud **Aggregate** ("Regrouper les
projets" / "Regrouper les tâches" / "Regrouper les réunions") regroupe la
réponse (0, 1 ou plusieurs lignes) en un seul item contenant un tableau —
toujours pour ce même utilisateur, jamais de corrélation entre plusieurs
utilisateurs.

Ces 4 nœuds HTTP Request doivent **chacun** avoir la Credential
**`Supabase Service Role`** sélectionnée individuellement après import (les
credentials ne sont **jamais** exportées dans le JSON, y compris quand un
workflow a déjà fonctionné en n8n Cloud — après un import, il faut toujours
ressélectionner la Credential sur chaque nœud, voir section 7).

Le nœud **Code** final, **"Construire le rapport hebdomadaire"**, est
configuré en mode **"Run Once for Each Item"** : à chaque exécution il ne
reçoit qu'**un seul item**, celui du **même** utilisateur que celui traité
par la boucle à ce moment-là (assemblé juste avant par le nœud **"Assembler
les données de l'utilisateur"**, qui relit l'id/l'email directement sur le
nœud de boucle via `$('Boucle : un utilisateur à la fois').item`, jamais
via `itemMatching()` ni un index numérique). Ce nœud Code ne fait **aucun**
appel réseau et se limite au calcul, au regroupement et à la génération du
HTML/subject **pour cet unique utilisateur**. Aucune Credential n'est
nécessaire sur ce nœud.

Un utilisateur entre dans la boucle → un e-mail (ou aucun, si l'utilisateur
n'a pas d'adresse exploitable) sort côté "Envoyer le rapport hebdomadaire"
/ "Aucun rapport" → le workflow revient sur le nœud de boucle pour passer à
l'utilisateur suivant, jusqu'à épuisement de la liste.


---

## 6. Créer la Credential SMTP ou Gmail (envoi d'e-mails)

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
1. **Credentials** → **Add Credential** → **SMTP** (ou **Gmail** si vous
   utilisez l'API Gmail — dans ce cas remplacez le nœud `Send Email` par un
   nœud `Gmail` équivalent).
2. Renseignez host/port/utilisateur/mot de passe (ou App Password Gmail).
3. **Sauvegarder.**
4. Ouvrez chaque nœud "Envoyer l'e-mail..." / "Envoyer le rapport..." listé
   dans le tableau de la section 7 (colonne "Credential SMTP requise") et
   sélectionnez la Credential nouvellement créée dans le champ
   **Credential for Send Email**.

Aucun mot de passe SMTP ni token Gmail ne doit être écrit dans les fichiers
JSON de ce dossier.

---

## 7. Tableau récapitulatif — nœuds à configurer par workflow

| Workflow | Nœud | Credential Supabase (Custom Auth) | Credential SMTP/Gmail | Modification du nœud "Configuration ProjectFlow" |
|---|---|---|---|---|
| `new-task-email.json` | Configuration ProjectFlow | — | — | ✅ Oui (SUPABASE_URL, APP_BASE_URL, SMTP_FROM_EMAIL) |
| `new-task-email.json` | Récupérer le projet | ✅ Oui | — | — |
| `new-task-email.json` | Récupérer l'utilisateur Auth | ✅ Oui | — | — |
| `new-task-email.json` | Envoyer l'e-mail de confirmation | — | ✅ Oui | — |
| `deadline-reminder-email.json` | Configuration ProjectFlow | — | — | ✅ Oui |
| `deadline-reminder-email.json` | Récupérer les tâches non terminées | ✅ Oui | — | — |
| `deadline-reminder-email.json` | Récupérer l'e-mail Auth | ✅ Oui | — | — |
| `deadline-reminder-email.json` | Envoyer l'e-mail récapitulatif | — | ✅ Oui | — |
| `weekly-progress-report.json` | Configuration ProjectFlow | — | — | ✅ Oui |
| `weekly-progress-report.json` | **Récupérer les utilisateurs Auth** (nouveau nœud HTTP) | ✅ Oui (à ressélectionner) | — | — |
| `weekly-progress-report.json` | **Extraire les utilisateurs** (Item Lists / Split Out) | — | — | — |
| `weekly-progress-report.json` | **Boucle : un utilisateur à la fois** (Split In Batches, taille 1) | — | — | — |
| `weekly-progress-report.json` | **Récupérer les projets de l'utilisateur** (nouveau nœud HTTP, un seul utilisateur à la fois) | ✅ Oui (à ressélectionner) | — | — |
| `weekly-progress-report.json` | **Regrouper les projets** (Aggregate) | — | — | — |
| `weekly-progress-report.json` | **Récupérer les tâches de l'utilisateur** (nouveau nœud HTTP, un seul utilisateur à la fois) | ✅ Oui (à ressélectionner) | — | — |
| `weekly-progress-report.json` | **Regrouper les tâches** (Aggregate) | — | — | — |
| `weekly-progress-report.json` | **Récupérer les réunions de l'utilisateur** (nouveau nœud HTTP, un seul utilisateur à la fois) | ✅ Oui (à ressélectionner) | — | — |
| `weekly-progress-report.json` | **Regrouper les réunions** (Aggregate) | — | — | — |
| `weekly-progress-report.json` | **Assembler les données de l'utilisateur** (Set) | — | — | — |
| `weekly-progress-report.json` | Construire le rapport hebdomadaire (Code, "Run Once for Each Item", calculs uniquement pour cet utilisateur) | — (aucun appel HTTP dans ce nœud) | — | — |
| `weekly-progress-report.json` | Envoyer le rapport hebdomadaire | — | ✅ Oui (à ressélectionner) | — |

Tous les autres nœuds (IF, NoOp, Set d'extraction, Code de calcul pur) ne
nécessitent **aucune** Credential ni configuration manuelle.

> **Nœuds en gras ci-dessus** = nouveaux nœuds introduits dans
> `weekly-progress-report.json` par la refonte décrite en section 13/15
> (remplacement de l'ancien appel `httpRequestWithAuthentication` dans le
> nœud Code par une boucle **Split In Batches** traitant les utilisateurs
> un par un, combinée à des nœuds HTTP Request standards). **Après
> import**, la Credential Custom Auth `Supabase Service Role` et la
> Credential SMTP doivent être **ressélectionnées manuellement sur chacun
> de ces nœuds**, même si le workflow précédent fonctionnait déjà : n8n
> n'exporte jamais les credentials dans le JSON.


---

## 8. Connecter le Database Webhook Supabase (Workflow 1 uniquement)

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

## 9. Tester chaque workflow manuellement

### Workflow 1 — Nouvelle tâche
- **Déjà en production** sur une instance n8n Cloud réelle. Ne pas
  modifier ; si un nouveau test est nécessaire, cliquer sur **Execute
  Workflow** (ou **Listen for Test Event** sur le nœud Webhook, puis créer
  une tâche réelle dans ProjectFlow, ou envoyer une requête `curl`/Postman
  simulant le payload Supabase `INSERT` vers l'URL de test).
- Vérifier dans **Executions** que chaque nœud s'exécute sans erreur et
  qu'un e-mail arrive à l'adresse de test.

### Workflow 2 — Rappel d'échéance
- **Déjà en production** sur une instance n8n Cloud réelle. Ne pas
  modifier ; si un nouveau test est nécessaire, cliquer sur **Execute
  Workflow** directement (le Schedule Trigger peut être déclenché
  manuellement en mode édition dans n8n).
- Vérifier qu'au moins un utilisateur test avec des tâches en retard/dues
  reçoit un e-mail unique récapitulatif (et non un e-mail par tâche).

### Workflow 3 — Rapport hebdomadaire
- Après avoir ressélectionné les Credentials sur les 4 nœuds HTTP Request
  et sur le nœud d'envoi (voir section 7), cliquer sur **Execute Workflow**
  directement.
- Vérifier dans l'onglet **Executions** que :
  - **Récupérer les utilisateurs Auth** renvoie bien un objet contenant un
    tableau `users`.
  - **Extraire les utilisateurs** produit bien un item par utilisateur.
  - **Boucle : un utilisateur à la fois** s'exécute bien **une fois par
    utilisateur** (visible dans l'historique d'exécution : chaque passage
    dans la boucle ne traite qu'un seul item à la fois, jamais tous les
    utilisateurs en une seule fois).
  - À chaque passage de boucle, les nœuds **Récupérer les
    projets/tâches/réunions de l'utilisateur** ne reçoivent et ne
    renvoient qu'un tableau (même vide) **pour ce seul utilisateur**, et
    non une erreur.
  - **Construire le rapport hebdomadaire** est bien exécuté en mode "Run
    Once for Each Item" et produit, à chaque passage, un seul item pour
    l'utilisateur en cours, avec le contenu HTML attendu.
  - Aucun message d'erreur *"The function ... is not supported in the Code
    Node"* n'apparaît (ce message indiquerait qu'un appel HTTP a été
    réintroduit par erreur dans le nœud Code).
- Provoquer volontairement une erreur pour un seul utilisateur (ex. couper
  temporairement l'accès réseau à un moment précis, ou tester avec un
  `user_id` invalide) pour confirmer que la boucle passe bien à
  l'utilisateur suivant et que les autres utilisateurs reçoivent bien leur
  rapport malgré tout (voir `continueOnFail` sur les nœuds HTTP, et le
  `try/catch` dans le nœud Code).


Dans les trois cas, consultez l'onglet **Executions** de n8n pour inspecter
les données item par item à chaque étape (utile pour déboguer un payload,
une valeur du nœud "Configuration ProjectFlow", ou une Credential mal
associée).

---

## 10. Activer les workflows

Une fois les tests manuels validés :
1. Ouvrir le workflow.
2. Activer le bouton **Active** en haut à droite de l'éditeur.
3. Pour le Workflow 1, s'assurer que le Database Webhook Supabase (section
   8) pointe vers l'URL de **production** du webhook (et non l'URL de
   test), sans quoi l'URL change à chaque nouvelle session de test.

---

## 11. Vérifier l'historique d'exécution

- Menu **Executions** (barre latérale n8n) : liste toutes les exécutions,
  succès et échecs, avec horodatage.
- Cliquer sur une exécution pour voir le détail item par item de chaque
  nœud (payload reçu, réponse Supabase, contenu de l'e-mail généré).
- Filtrer par workflow pour isoler les exécutions du rappel quotidien ou du
  rapport hebdomadaire.

---

## 12. Désactiver les e-mails sans affecter les notifications internes

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

## 13. Schéma des workflows

### Workflow 1 — Nouvelle tâche (inchangé, en production)
```
Webhook Supabase (INSERT tasks)
  → Configuration ProjectFlow (Set : SUPABASE_URL, APP_BASE_URL, SMTP_FROM_EMAIL)
  → Vérifier payload INSERT tasks (IF)
      ├─ [valide] → Extraire la tâche (Set)
      │              → Récupérer le projet (HTTP GET /rest/v1/projects, Credential Custom Auth)
      │              → Récupérer l'utilisateur Auth (HTTP GET /auth/v1/admin/users/:id, Credential Custom Auth)
      │              → Email disponible ? (IF)
      │                  ├─ [oui] → Construire l'e-mail (Code) → Envoyer l'e-mail de confirmation (Send Email, Credential SMTP)
      │                  └─ [non] → Aucun e-mail (NoOp)
      └─ [invalide] → Payload ignoré (NoOp)
```

### Workflow 2 — Rappel d'échéance (inchangé, en production)
```
Tous les jours à 08:00 (Schedule, America/Toronto)
  → Configuration ProjectFlow (Set)
  → Récupérer les tâches non terminées (HTTP GET /rest/v1/tasks, status != done, Credential Custom Auth)
  → Regrouper par utilisateur (Code : retard / aujourd'hui / demain, par user_id)
  → Récupérer l'e-mail Auth (HTTP GET /auth/v1/admin/users/:id, Credential Custom Auth, un appel par utilisateur groupé)
  → Email disponible ? (IF)
      ├─ [oui] → Construire l'e-mail récapitulatif (Code) → Envoyer l'e-mail récapitulatif (Send Email, Credential SMTP)
      └─ [non] → Aucun e-mail (NoOp)
```
Un seul e-mail par utilisateur (jamais un e-mail par tâche).

### Workflow 3 — Rapport hebdomadaire (**refonte** : un utilisateur à la fois, plus aucun HTTP dans le Code)

> **Pourquoi cette refonte ?** Un test réel en n8n Cloud a montré que le
> nœud Code de l'ancienne version échouait avec l'erreur *"The function
> 'helpers.httpRequestWithAuthentication' is not supported in the Code
> Node"*. Cette fonction n'est pas disponible dans le nœud Code sur n8n
> Cloud. Une première refonte avait déplacé les appels Supabase vers des
> nœuds HTTP Request "à plat" (tous les utilisateurs en un seul flux, puis
> corrélation par `itemMatching()`), mais cette approche a été abandonnée :
> **le workflow ne doit plus jamais éclater tous les utilisateurs dans un
> flux global**, ni utiliser `itemMatching()`/un index pour reconstruire
> les correspondances. La nouvelle architecture ci-dessous traite les
> utilisateurs **strictement un par un**, via une boucle **Split In
> Batches** (taille de lot = 1) : un utilisateur entre dans la boucle → un
> e-mail (ou aucun) sort, avant de passer au suivant.

```
Chaque lundi à 08:00 (Schedule, America/Toronto)
  → Configuration ProjectFlow (Set)
  → Récupérer les utilisateurs Auth (HTTP GET /auth/v1/admin/users, Credential Custom Auth)
  → Extraire les utilisateurs (Item Lists / Split Out : un item par utilisateur)
  → Boucle : un utilisateur à la fois (Split In Batches, taille de lot = 1)
      ├─ [sortie "done", une fois tous les utilisateurs traités] → fin du workflow
      └─ [sortie "loop", un seul utilisateur à chaque passage]
           → Récupérer les projets de l'utilisateur (HTTP GET /rest/v1/projects?user_id=eq.:id, Credential Custom Auth, continueOnFail)
           → Regrouper les projets (Aggregate)
           → Récupérer les tâches de l'utilisateur (HTTP GET /rest/v1/tasks?user_id=eq.:id, Credential Custom Auth, continueOnFail)
           → Regrouper les tâches (Aggregate)
           → Récupérer les réunions de l'utilisateur (HTTP GET /rest/v1/meetings?user_id=eq.:id, Credential Custom Auth, continueOnFail)
           → Regrouper les réunions (Aggregate)
           → Assembler les données de l'utilisateur (Set : id, email, projects, tasks, meetings — références directes
             par nom de nœud, ex. $('Boucle : un utilisateur à la fois').item, jamais itemMatching() ni un index)
           → Construire le rapport hebdomadaire (Code, mode "Run Once for Each Item" : reçoit UN SEUL item,
             celui de cet unique utilisateur ; AUCUN appel réseau ; calculs déterministes ; une donnée
             manquante/erronée pour cet utilisateur est journalisée et le rapport est ignoré sans bloquer
             le passage à l'utilisateur suivant)
           → E-mail à envoyer ? (IF)
               ├─ [oui] → Envoyer le rapport hebdomadaire (Send Email, Credential SMTP, continueOnFail)
               │           → retour sur "Boucle : un utilisateur à la fois" (utilisateur suivant)
               └─ [non] → Aucun rapport (NoOp)
                           → retour sur "Boucle : un utilisateur à la fois" (utilisateur suivant)
```
Aucun appel à OpenRouter ou à un autre service d'IA dans ce workflow. Un
utilisateur entre dans la boucle → un e-mail sort (ou aucun, si l'adresse
est manquante ou la génération échoue) : jamais d'éclatement multi-utilisateur
dans les nœuds HTTP, jamais de corrélation par index.

**Nœuds introduits par cette refonte** (à reconfigurer après import, voir
section 7) :
- `Récupérer les utilisateurs Auth` (HTTP Request)
- `Extraire les utilisateurs` (Item Lists / Split Out — aucune Credential)
- `Boucle : un utilisateur à la fois` (Split In Batches, taille 1 — aucune Credential)
- `Récupérer les projets/tâches/réunions de l'utilisateur` (3 × HTTP Request, un seul utilisateur à la fois)
- `Regrouper les projets/tâches/réunions` (3 × Aggregate — aucune Credential)
- `Assembler les données de l'utilisateur` (Set — aucune Credential)
- `E-mail à envoyer ?` (IF — aucune Credential)
- `Aucun rapport` (NoOp — aucune Credential)

Le nœud `Construire le rapport hebdomadaire` (Code) a été entièrement
réécrit en mode **"Run Once for Each Item"** : il ne contient plus aucun
appel réseau, aucun `itemMatching()`, aucune corrélation par index —
uniquement du calcul, du regroupement et de la génération de HTML/subject
pour l'unique utilisateur reçu en entrée.

**Aucun autre workflow** (`new-task-email.json`,
`deadline-reminder-email.json`) n'a été modifié par ce lot.


---

## 14. Étapes manuelles restantes

**Dans Supabase :**
- Créer le Database Webhook sur `public.tasks` / `INSERT` (section 8) — déjà
  fait si le Workflow 1 est en production.
- Récupérer la **Secret key** (format `sb_secret_...`, Dashboard →
  Project Settings → API Keys → *Secret keys*).

**Dans n8n Cloud :**
- Importer (ou réimporter) `weekly-progress-report.json` (section 3). Ne
  pas réimporter `new-task-email.json` ni `deadline-reminder-email.json`
  s'ils sont déjà en production.
- Vérifier/ajuster le nœud **Configuration ProjectFlow** de
  `weekly-progress-report.json` avec les vraies valeurs `SUPABASE_URL` /
  `APP_BASE_URL` / `SMTP_FROM_EMAIL` (section 4).
- **Ressélectionner manuellement** la Credential Custom Auth **`Supabase
  Service Role`** sur les 4 nouveaux nœuds HTTP Request de
  `weekly-progress-report.json` : `Récupérer les utilisateurs Auth`,
  `Récupérer les projets de l'utilisateur`, `Récupérer les tâches de
  l'utilisateur`, `Récupérer les réunions de l'utilisateur` (section 5.c et
  7).
- **Ressélectionner manuellement** la Credential SMTP/Gmail sur le nœud
  `Envoyer le rapport hebdomadaire` (section 6 et 7).
- Confirmer manuellement le fuseau horaire `America/Toronto` dans les
  paramètres du workflow `weekly-progress-report.json` (Workflow →
  Settings → Timezone).
- Tester manuellement le workflow (section 9) avant activation, y compris
  le scénario d'échec isolé d'un utilisateur.
- Activer le workflow (section 10) une fois validé.

---

## 15. Limites connues de cette version

- **Pagination Supabase Auth admin** : `weekly-progress-report.json`
  n'appelle qu'une seule page de `/auth/v1/admin/users` (comportement par
  défaut de l'API, généralement 50 utilisateurs). Au-delà, il faudra ajouter
  une pagination (paramètre `page`) — non implémentée dans ce lot.
- **Définition de "semaine"** : pour le rapport hebdomadaire, "tâches
  créées" couvre les 7 jours précédant l'exécution (semaine écoulée), et
  "échéances/réunions de la semaine" couvre les 7 jours suivant
  l'exécution (semaine à venir). C'est une convention documentée ici, pas
  une règle métier validée par le produit.
- **Coût des appels et temps d'exécution** : `weekly-progress-report.json`
  effectue 3 requêtes REST Supabase par utilisateur (projets → tâches →
  réunions) + 1 requête Auth admin globale, **répétées séquentiellement à
  chaque passage de la boucle** (un utilisateur à la fois, jamais en
  parallèle). Sur une base d'utilisateurs importante, le temps d'exécution
  total croît donc linéairement avec le nombre d'utilisateurs — c'est un
  compromis délibéré au profit de l'isolation stricte par utilisateur
  (voir point suivant), pas un traitement en lot optimisé pour la vitesse.
- **Isolation des erreurs par utilisateur (pas de retry/backoff)** : à
  l'intérieur de la boucle `weekly-progress-report.json`, les 3 nœuds HTTP
  Request (`continueOnFail: true`), le nœud Code final (`try/catch`) et le
  nœud d'envoi (`continueOnFail: true`) sont conçus pour qu'une erreur sur
  **l'utilisateur en cours** ne bloque jamais le passage à l'utilisateur
  suivant dans la boucle. Dans `deadline-reminder-email.json` (workflow
  distinct, non modifié), les nœuds `Récupérer l'e-mail Auth` et `Envoyer
  l'e-mail récapitulatif` traitent plusieurs utilisateurs par exécution,
  avec la même logique d'isolation. Il n'y a en revanche **aucun
  retry/backoff automatique** dans les deux cas : un utilisateur dont le
  traitement échoue ne recevra simplement pas d'e-mail pour cette
  exécution (visible dans l'onglet **Executions**), sans nouvelle
  tentative automatique (sauf si vous activez la politique de retry par
  défaut de n8n dans les Settings du workflow).
- **Aucune corrélation par index** : `weekly-progress-report.json` ne
  contient plus aucun `itemMatching()` ni calcul d'index. Toutes les
  références entre nœuds passent par `$('Nom du nœud').item` (référence
  directe à un ancêtre dans le graphe d'exécution courant), ce qui est
  fiable précisément **parce que** la boucle ne traite jamais qu'un seul
  utilisateur à la fois — il n'y a donc jamais plusieurs utilisateurs "en
  vol" simultanément dont il faudrait reconstituer la correspondance.
- **Non testé de bout en bout après cette refonte** : la nouvelle
  architecture en boucle (Split In Batches, taille 1) de
  `weekly-progress-report.json` n'a pas encore été exécutée intégralement
  dans une instance n8n Cloud réelle au moment de la rédaction de ce
  README (seule l'ancienne version "à plat", avec le nœud Code défaillant,
  a été testée en conditions réelles). Une validation manuelle complète
  (section 9) reste requise avant toute mise en production de ce workflow.

