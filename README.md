# Club Astro Agenda

Agenda public du Club Astronomie MJC Douai. Application web statique en lecture seule, indépendante des autres modules, avec les vues mois, semaine, jour et À venir en français.

## Lancer en local

Depuis la racine du dépôt, avec Python 3 installé :

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Ouvrir [l’agenda local](http://127.0.0.1:8000/). Le serveur sert uniquement les fichiers statiques en développement. Une connexion Internet est nécessaire pour charger FullCalendar et Luxon depuis jsDelivr.

Quand l’identifiant et la clé sont tous deux vides dans `js/config.js`, la page signale le mode démonstration et affiche des événements fictifs dans le mois courant. Un seul champ renseigné signale une configuration incomplète. Avec les deux champs renseignés, un échec Google est affiché à l’utilisateur avec un bouton de nouvelle tentative.

## Configurer Google Calendar

1. Utiliser un agenda Google public dont les autorisations publiques donnent accès aux détails des événements. Copier son identifiant depuis les paramètres d’intégration de l’agenda.
2. Dans le projet Google Cloud retenu, activer Google Calendar API v3 et utiliser une clé API dédiée au navigateur. Dans les restrictions de la clé, sélectionner **Sites Web** et autoriser uniquement les référents des hébergements utilisés. Limiter la clé à **Google Calendar API**. Pour un essai local autorisé, ajouter le référent correspondant à l’origine réellement utilisée, par exemple `http://127.0.0.1:8000/*`.
3. Renseigner `calendarId` et `apiKey` dans `js/config.js`. La clé est visible dans le navigateur. Dans l’intégration iframe prévue, le référent envoyé à Google correspond en principe à l’origine du document qui héberge l’agenda, par exemple l’hôte GitHub Pages, et doit être vérifié dans le navigateur.

[Restrictions de clés API dans Google Cloud](https://cloud.google.com/api-keys/docs/add-restrictions-api-keys) · [Configuration d’un agenda Google public pour FullCalendar](https://legacy.fullcalendar.io/v6/google-calendar)

## Publication sur GitHub Pages

L’URL publique est [l’agenda du Club Astro](https://mjdeltonne.github.io/club-astro-agenda/). Pour rétablir la publication depuis la racine si nécessaire, dans **Settings → Pages**, choisir **Deploy from a branch**, puis **main** et **/(root)**. Le fichier `.nojekyll` permet de servir les fichiers statiques directement. Après le déploiement, ouvrir l’URL publique et vérifier que les événements réels s’affichent. [Guide GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

La configuration publiée est visible dans le navigateur. Utiliser uniquement l’identifiant de l’agenda public et une clé navigateur dédiée, restreinte à Google Calendar API et aux seules origines autorisées. Pour GitHub Pages, autoriser `https://mjdeltonne.github.io/*` dans les restrictions de sites Web. Les origines locales servent aux essais. Le [guide Odoo](docs/integration-odoo.md) contient le code iframe à reprendre après vérification de la publication.

## Consulter l’agenda

L’affichage initial est le mois sur ordinateur et la liste À venir sur smartphone. La liste présente 30 jours à partir de la date active. Le bouton Aujourd’hui ramène cette date au jour courant. Les filtres de catégories s’appliquent aux données déjà chargées. L’impression produit une liste chronologique de la période visible avec les filtres actifs. S’abonner ouvre le lien Google Calendar et donne accès à l’adresse iCal publique.

## Tests

Avec Node.js 22 ou plus récent, sans installation de dépendances :

```sh
node --test
```

Les tests simulent les réponses API et vérifient notamment les occurrences déplacées, les annulations, les dates de journée entière, la pagination, les erreurs et le rendu textuel des données Google.

Les tests de l’étape B simulent FullCalendar et le DOM pour contrôler les réglages des vues, les filtres, la modale et la navigation rapide. En navigateur réel, vérifier à largeur d’ordinateur et de smartphone les quatre vues, le focus et les trois modes de fermeture du dialogue, l’abonnement Google, le copier iCal et l’aperçu d’impression sur plusieurs pages. Le style imprimé utilise une liste dédiée pour éviter le découpage de la grille.

Pour les dimensions et le défilement de l’iframe, voir le [guide d’intégration Odoo](docs/integration-odoo.md).

Voir [l’architecture et les limites de l’étape A](docs/architecture.md) et le [protocole de validation de l’agenda réel](docs/validation-agenda-reel.md).