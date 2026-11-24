# Intégrer l’agenda dans Odoo

L’agenda occupe la largeur disponible jusqu’à 72 rem. Le fond général laisse apparaître le fond étoilé de la page hôte. Les panneaux du calendrier, des filtres et des dialogues ont des fonds opaques.

## Transparence de l’iframe

Le document de l’agenda déclare `color-scheme: light dark` à la racine pour suivre le schéma de l’élément iframe. Des schémas différents peuvent amener le navigateur à peindre un fond opaque, même avec un fond CSS transparent. Le document, le corps de page et le conteneur principal sont transparents. Les panneaux et dialogues conservent leur fond sombre. [CSS Color Adjustment, section 2.4](https://drafts.csswg.org/css-color-adjust-1/#color-scheme-effect)

Si le gris persiste, inspecter dans Odoo les styles calculés de l’iframe et de ses conteneurs. Une couleur ou une image de fond opaque sur le bloc doit être retirée de ce bloc pour laisser apparaître le fond étoilé. Vérifier également les pseudo-éléments qui pourraient le recouvrir. La correction côté Odoo reste à appliquer uniquement si la recette confirme cette origine.

## Dimensions de départ

| Largeur de l’iframe | Hauteur de départ | Vue initiale |
| --- | --- | --- |
| Jusqu’à 640 px | 780 px | À venir |
| De 641 à 1023 px | 860 px | Mois |
| À partir de 1024 px | 900 px | Mois |

Ces hauteurs servent de point de départ. Une semaine complète avec horaires ou une liste dense peut dépasser la hauteur définie. Le calendrier utilise sa hauteur naturelle et le document de l’iframe défile si nécessaire. Éviter d’ajouter un conteneur Odoo intermédiaire à hauteur contrainte avec `overflow: auto` et laisser le défilement natif de l’iframe disponible. Le parent Odoo et une iframe de hauteur fixe peuvent tous deux défiler. Les dialogues longs défilent à l’intérieur de leur fenêtre.

Exemple pour le bloc Odoo après vérification de la version publiée. Définir les hauteurs dans le CSS du parent selon la largeur du bloc.

```html
<iframe
  src="https://mjdeltonne.github.io/club-astro-agenda/"
  title="Agenda du Club Astronomie MJC Douai"
  loading="lazy"
  allow="clipboard-write"
  style="display:block; width:100%; height:900px; border:0; background:transparent">
</iframe>
```

L’autorisation de presse-papiers sert au bouton Copier. En cas de refus, le champ iCal reste sélectionnable. Si Odoo applique un bac à sable, vérifier les scripts, les liens externes, les dialogues et l’impression dans le bloc de test. Aucun échange avec le document parent n’est requis.

## Contrôles avant intégration

- À 320, 390, 768 et 1280 px, vérifier les quatre vues et les commandes sans défilement horizontal. Tester les jours chargés, le lien « +N de plus » et le panneau des événements supplémentaires.
- Au clavier, parcourir filtres, navigation et événements. Vérifier le focus visible, la fermeture des dialogues par croix, clic extérieur et Échap, puis le retour à l’élément d’ouverture.
- Dans l’iframe, contrôler le contraste sur le fond étoilé, le défilement tactile, les descriptions longues, le presse-papiers et l’impression sur plusieurs pages.
