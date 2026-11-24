# Architecture de l’étape A

- `index.html` et `css/agenda.css` définissent l’interface minimale.
- `js/config.js` centralise l’agenda, la clé et les réglages d’affichage.
- `js/calendar-api.js` interroge Google Calendar API v3 et transforme les événements.
- `js/agenda.js` initialise FullCalendar et gère la démonstration, le chargement, les erreurs et l’affichage des détails.
- `tests/` utilise le lanceur intégré à Node.js. La structure demandée est conservée.

## Dépendances et source des événements

FullCalendar Standard 6.1.20, sa localisation française et son plugin Luxon 3 sont chargés depuis jsDelivr à des versions fixes. Luxon 3.7.2 calcule les décalages de `Europe/Paris`, y compris lors des changements d’heure. [Documentation FullCalendar sur les fuseaux](https://legacy.fullcalendar.io/v6/timeZone)

Dans le connecteur Google Calendar de FullCalendar 6.1.20, `gcalItemToRawEventDef` écarte `colorId` et la lecture traite une seule page. L’application utilise directement `events.list` avec les bornes de la grille visible, `singleEvents=true`, `showDeleted=false`, le fuseau de Paris et un masque de champs. Google développe les séries et applique leurs exceptions. L’application suit `nextPageToken`, écarte aussi les annulations côté client et conserve la date de fin exclusive des événements en journée entière. [Code du connecteur](https://cdn.jsdelivr.net/npm/@fullcalendar/google-calendar@6.1.20/index.global.js) · [Référence Google Events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)

Les titres, lieux et descriptions sont injectés avec `textContent`. Les balises éventuellement présentes dans les descriptions sont visibles sous forme de texte. La page ne demande ni participants, ni pièces jointes, ni liens vers la fiche Google.

## Couleurs

Les catégories sont une convention du club. La documentation Google associe `Events.colorId` à la palette `Colors.event`. Les noms métier sont définis dans ce dépôt. Les teintes configurées sont figées pour l’étape A. La référence statique de Google décrit la structure de la palette. La vérification directe des valeurs via `colors.get` a reçu une réponse HTTP 403 sans clé et reste à faire avec la clé autorisée. Une couleur absente ou hors convention conserve le rose du club. [Référence Google Colors](https://developers.google.com/workspace/calendar/api/v3/reference/colors) · [Référence Google Events](https://developers.google.com/workspace/calendar/api/v3/reference/events)

| colorId | Catégorie | Fond |
| --- | --- | --- |
| 4 | Séances du club | `#FF887C` |
| 1 | Sorties d’observation | `#A4BDFC` |
| 5 | Manifestations publiques | `#FBD75B` |
| 2 | Conférences et ateliers | `#7AE7BF` |
| 7 | Voyages et visites | `#46D6DB` |
| 8 | Administration | `#E1E1E1` |
| Absent ou non référencé | Couleur du club | `#EF108B` |

## Limites à valider

- Un essai réel exige la clé restreinte et l’identifiant de l’agenda public. Vérifier les détails effectivement publics, les restrictions de référent, les quotas, les exceptions déplacées et les journées entières autour des changements d’heure. Pour les événements en journée entière, Google se sert du fuseau propre à l’agenda pour déterminer quels événements entrent dans une plage de recherche. Un agenda configuré en `Europe/Paris` évite un décalage de cette sélection aux limites de période. [Gestion des fuseaux par Google](https://developers.google.com/workspace/calendar/api/concepts/events-calendars#time_zones)
- Confirmer l’affichage et la navigation dans l’iframe Odoo et sur l’origine GitHub Pages lors de l’intégration. Les scripts CDN doivent être accessibles aux visiteurs.
- Le mode démonstration contient des exemples pour le mois courant. La navigation peut donc afficher des mois vides.