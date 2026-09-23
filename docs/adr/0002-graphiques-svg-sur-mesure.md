# Graphiques sur mesure avec react-native-svg

Statut : accepté (choix délégué à l'implémentation par le porteur de produit, #20 / #28).

## Contexte

Le Bilan annuel a besoin de trois visualisations (`CONTEXT.md` §5.10) : répartition des dépenses par catégorie, évolution du solde, budget prévu vs réalisé. La charte (`DESIGN.md`, `CONTEXT.md` §10) est sobre et plate : cartes sans ombre, barres en pilule 8px, palette désaturée sans rouge, Inter partout, chiffres tabulaires. Le choix de librairie avait été différé à l'implémentation, avec pour consigne de trancher « en fonction du design ».

## Décision

- **`react-native-svg` seul** (paquet maintenu dans le SDK Expo), avec des composants de graphique écrits pour NoMie dans `src/components/charts/`.
- Les graphiques à barres restent en simples `View` (même dessin que `ProgressBar`) ; le SVG ne sert qu'aux tracés (courbe de solde).
- Les calculs (répartition, échelle, tracé) vivent dans `chartGeometry.ts`, fonctions pures testées sans rendu ; les composants sont testés sur les props reçues, sans snapshot visuel.

## Options écartées

- **`react-native-gifted-charts`** : moins de code, mais un style par défaut (dégradés, animations, axes, tooltips) à neutraliser prop par prop pour tenir la charte, et une dépendance tierce de plus (`expo-linear-gradient`).
- **`victory-native`** : repose sur Skia, Reanimated et Gesture Handler, soit trois modules natifs lourds pour trois graphiques simples, et un rendu Skia difficile à exercer sous Jest.

## Conséquences

- Chaque nouveau type de graphique est à écrire, mais ils restent peu nombreux et fixés par `CONTEXT.md`.
- Pas d'interactions riches (zoom, info-bulle au toucher) sans les coder : hors périmètre (#20, « Personnalisation des graphiques »).
