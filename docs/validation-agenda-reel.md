# Étape A.1 — Validation de l’agenda réel

1. Dans Google Calendar, ouvrir les paramètres de l’agenda concerné. Vérifier que l’accès public permet de voir les détails, puis copier l’identifiant depuis **Intégrer l’agenda**.
2. Dans le projet Google Cloud `club-astro-agenda`, choisir une clé navigateur avec la restriction d’application **Sites Web** et la restriction d’API **Google Calendar API**.
3. Autoriser `http://127.0.0.1:8000/*` pour un test local à cette adresse. `localhost` et `127.0.0.1` sont des hôtes distincts. Pour GitHub Pages, autoriser `https://mjdeltonne.github.io/*` si cette origine est celle retenue, ou l’origine du domaine personnalisé effectivement utilisé. Avec la politique `strict-origin-when-cross-origin`, une requête vers Google transmet normalement l’origine seule, sans le chemin `/club-astro-agenda/`. Éviter une restriction reposant sur ce chemin. [Restrictions des clés Google](https://docs.cloud.google.com/docs/authentication/api-keys)
4. Renseigner les deux champs dans la copie locale de `js/config.js`. Garder cette modification locale pendant la validation. Ouvrir ensuite l’agenda via le serveur décrit dans le README et vérifier un événement connu, ses horaires, ses détails publics et sa couleur.

## Diagnostic de lecture seule

Depuis la racine, avec Node.js 22 ou plus récent :

```sh
node tools/verifier-google.mjs
node tools/verifier-google.mjs https://mjdeltonne.github.io
```

Le diagnostic envoie le référent indiqué à Google et exécute `Events.list` sur les 31 jours précédents et suivants, ainsi que `Colors.get`. Il affiche le nombre d’événements reçus et compare les fonds Google aux couleurs configurées, sans afficher la clé, l’identifiant ou les détails des événements. Une réponse vide valide l’accès à l’API sur la période, sans démontrer la récupération d’un événement. L’essai avec un référent explicite vérifie la réponse de Google à cette valeur. Le navigateur et l’iframe restent nécessaires pour vérifier le référent réellement envoyé après hébergement.

La palette `Colors.event` valide les identifiants et les teintes. Le sens métier de chaque catégorie reste défini par le club et se vérifie sur des événements dont la catégorie est connue. [Endpoint Colors.get](https://developers.google.com/workspace/calendar/api/v3/reference/colors/get)

## Erreurs vérifiées automatiquement

Les tests simulent une clé invalide, une origine refusée, un agenda inaccessible et les refus de quota HTTP 403 et 429. En mode réel, ces erreurs restent visibles avec une possibilité de réessayer et la démonstration reste masquée. Une configuration partielle affiche un diagnostic. Les deux champs vides activent la démonstration signalée. Les tests simulent les quotas sans solliciter l’API réelle. [Erreurs Google Calendar](https://developers.google.com/workspace/calendar/api/guides/errors)

## Résultats de la connexion

Validation du 24 novembre 2026, en lecture seule depuis Node avec référents explicites.

| Référent | Events.list | Colors.get |
| --- | --- | --- |
| `https://mjdeltonne.github.io/` | HTTP 200, 15 événements entre le 24 octobre et le 25 décembre 2026 (UTC), dont 15 titres, 5 lieux et 11 descriptions | HTTP 200, teintes conformes pour les six identifiants 1, 2, 4, 5, 7 et 8 |
| `http://127.0.0.1:8000/` | HTTP 200 au contrôle final, 15 événements | HTTP 200 au contrôle final, six teintes conformes |

Les 15 événements reçus étaient dépourvus de `colorId`. Ils utilisent donc tous la couleur par défaut `#EF108B`. La correspondance des teintes a été confirmée par Google. L’application des catégories à des événements réels reste à contrôler sur des événements portant une couleur individuelle.

Le premier essai local a renvoyé HTTP 403 sur les deux endpoints, avec les raisons `forbidden` et `ACCESS_DENIED`. Le contrôle final a réussi pour les deux référents. La cause du refus initial reste inconnue. Le référent envoyé par un navigateur sur le futur hébergement et dans Odoo reste à vérifier.

`node --test` : 8 tests réussis. Le quota, la clé invalide et l’agenda inaccessible ont été vérifiés par simulation. Le refus local a été observé sur l’API réelle.