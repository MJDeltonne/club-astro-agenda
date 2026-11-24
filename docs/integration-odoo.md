# Intégrer l’agenda dans Odoo

L’agenda occupe la largeur disponible jusqu’à 72 rem. Le fond général laisse apparaître le fond étoilé de la page hôte. Les panneaux du calendrier, des filtres et des dialogues ont des fonds opaques.

## Transparence de l’iframe

Le satellite utilise `color-scheme: normal` à la racine et ne déclare aucune balise `meta color-scheme`. Les fonds de `html`, `body` et `main` sont transparents. Les panneaux et les modales conservent leurs fonds sombres. Un navigateur peut peindre un fond opaque si le schéma de l’élément iframe diffère de celui de la racine embarquée, même si les styles calculés indiquent un fond transparent. [CSS Color Adjustment, section 2.4](https://drafts.csswg.org/css-color-adjust-1/#color-scheme-effect)

Si Odoo impose un schéma à l’iframe, appliquer `color-scheme: normal; background: transparent` directement à l’élément iframe, comme dans l’exemple ci-dessous. Une iframe forcée en `dark` a donné un fond blanc avec le satellite en `normal` dans le test Chromium. Si un fond reste visible avec les deux schémas à `normal`, inspecter les fonds et les pseudo-éléments des conteneurs Odoo.

Le test de rendu Chromium sur une page synthétique a reproduit le gris `#121212` avec la racine `light dark` et une iframe neutre. Avec `normal` des deux côtés, le fond hôte est visible et le panneau du calendrier garde son fond `#12171F`. Confirmer le résultat sur la page Odoo intégrée après déploiement.

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
  style="display:block; width:100%; height:900px; border:0; color-scheme:normal; background:transparent">
</iframe>
```

L’autorisation de presse-papiers sert au bouton Copier. En cas de refus, le champ iCal reste sélectionnable. Si Odoo applique un bac à sable, vérifier les scripts, les liens externes, les dialogues et l’impression dans le bloc de test. Aucun échange avec le document parent n’est requis.

## Contrôles avant intégration

- À 320, 390, 768 et 1280 px, vérifier les quatre vues et les commandes sans défilement horizontal. Tester les jours chargés, le lien « +N de plus » et le panneau des événements supplémentaires.
- Au clavier, parcourir filtres, navigation et événements. Vérifier le focus visible, la fermeture des dialogues par croix, clic extérieur et Échap, puis le retour à l’élément d’ouverture.
- Dans l’iframe, contrôler le contraste sur le fond étoilé, le défilement tactile, les descriptions longues, le presse-papiers et l’impression sur plusieurs pages.
