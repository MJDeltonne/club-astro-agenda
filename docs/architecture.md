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

## Couleurs et classification

Les catégories sont une convention du club. Les sept teintes ont été comparées à la palette d’événements de Google. Le rose du club identifie les événements non classés. [Référence Google Colors](https://developers.google.com/workspace/calendar/api/v3/reference/colors)

| colorId | Catégorie | Fond |
| --- | --- | --- |
| 1 | Sorties d’observation | `#A4BDFC` |
| 2 | Conférences et ateliers | `#7AE7BF` |
| 3 | Phénomènes astronomiques | `#DBADFF` |
| 4 | Séances du club | `#FF887C` |
| 5 | Manifestations publiques | `#FBD75B` |
| 7 | Voyages et visites | `#46D6DB` |
| 8 | Administration | `#E1E1E1` |
| Hors convention ou titre sans correspondance | Non classés | `#EF108B` |

`js/event-categories.js` détermine la catégorie utilisée par les vues, les filtres et l’impression. Une couleur Google reconnue prévaut. Une couleur explicite hors convention place l’événement dans « Non classés ». L’analyse du titre intervient uniquement en l’absence de couleur individuelle. Elle ignore la casse et les accents, et traite les apostrophes, espaces et signes de ponctuation comme séparateurs.

Les règles reconnaissent d’abord les activités du club. En cas de conflit, l’ordre est Administration, Séances du club, Manifestations publiques, Sorties d’observation, Conférences et ateliers, puis Voyages et visites. Une conférence sur les éclipses reste ainsi une conférence. Les phénomènes sont reconnus ensuite par leurs expressions, par les maxima d’essaims répertoriés ou par certaines formulations de rapprochement entre astres. Un titre ambigu sans règle reste « Non classés ». Compléter les expressions et leurs cas de test dans le dépôt au fil de la recette.

Le classement est calculé dans le satellite, à partir des événements lus. Le mois conserve l’heure et le titre, et rend le nom de catégorie disponible aux lecteurs d’écran. Le nom reste visible dans la liste À venir et dans le détail des événements classés.

## Limites à valider

- Un essai réel exige la clé restreinte et l’identifiant de l’agenda public. Vérifier les détails effectivement publics, les restrictions de référent, les quotas, les exceptions déplacées et les journées entières autour des changements d’heure. Pour les événements en journée entière, Google se sert du fuseau propre à l’agenda pour déterminer quels événements entrent dans une plage de recherche. Un agenda configuré en `Europe/Paris` évite un décalage de cette sélection aux limites de période. [Gestion des fuseaux par Google](https://developers.google.com/workspace/calendar/api/concepts/events-calendars#time_zones)
- Confirmer l’affichage et la navigation dans l’iframe Odoo et sur l’origine GitHub Pages lors de l’intégration. Les scripts CDN doivent être accessibles aux visiteurs.
- Le mode démonstration contient des exemples pour le mois courant. La navigation peut donc afficher des mois vides.