# Club Astro Agenda

Agenda public du Club Astronomie MJC Douai. L’étape A fournit une application web statique en lecture seule, indépendante des autres modules, avec une vue mensuelle en français.

## Lancer en local

Depuis la racine du dépôt, avec Python 3 installé :

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Ouvrir [l’agenda local](http://127.0.0.1:8000/). Le serveur sert uniquement les fichiers statiques en développement. Une connexion Internet est nécessaire pour charger FullCalendar et Luxon depuis jsDelivr.

Tant que l’identifiant ou la clé manque dans `js/config.js`, la page signale le mode démonstration et affiche des événements fictifs dans le mois courant. Avec les deux champs renseignés, un échec Google est affiché à l’utilisateur avec un bouton de nouvelle tentative.

## Configurer Google Calendar

1. Utiliser un agenda Google public dont les autorisations publiques donnent accès aux détails des événements. Copier son identifiant depuis les paramètres d’intégration de l’agenda.
2. Dans le projet Google Cloud retenu, activer Google Calendar API v3 et utiliser une clé API dédiée au navigateur. Dans les restrictions de la clé, sélectionner **Sites Web** et autoriser uniquement les référents des hébergements utilisés. Limiter la clé à **Google Calendar API**. Pour un essai local autorisé, ajouter le référent correspondant à l’origine réellement utilisée, par exemple `http://127.0.0.1:8000/*`.
3. Renseigner `calendarId` et `apiKey` dans `js/config.js`. La clé est visible dans le navigateur. Dans l’intégration iframe prévue, le référent envoyé à Google correspond en principe à l’origine du document qui héberge l’agenda, par exemple l’hôte GitHub Pages, et doit être vérifié dans le navigateur.

[Restrictions de clés API dans Google Cloud](https://cloud.google.com/api-keys/docs/add-restrictions-api-keys) · [Configuration d’un agenda Google public pour FullCalendar](https://legacy.fullcalendar.io/v6/google-calendar)

## Tests

Avec Node.js 22 ou plus récent, sans installation de dépendances :

```sh
node --test
```

Les tests simulent les réponses API et vérifient notamment les occurrences déplacées, les annulations, les dates de journée entière, la pagination, les erreurs et le rendu textuel des données Google.

Voir [l’architecture et les limites de l’étape A](docs/architecture.md).