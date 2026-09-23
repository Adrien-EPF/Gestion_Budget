# Handoff : NoMie — 5 écrans principaux (Accueil, Comptes, Budgets, Récurrences, Réglages)

À placer à la racine du dépôt (renommé `NOMIE_DESIGN_HANDOFF.md` si tu préfères) : ce fichier est
auto-suffisant, un développeur qui n'était pas dans la conversation de design peut implémenter les
écrans à partir de lui seul.

## 1. Overview

NoMie est une app **mobile de gestion budgétaire personnelle**, 100 % locale (pas de compte, pas de
serveur), **Android en priorité**, portrait uniquement. Ce handoff couvre les 5 destinations de la
navigation principale et le formulaire de saisie rapide (bottom sheet).

Principe directeur, non négociable : **l'app ne doit jamais être anxiogène**. Aucun rouge/orange
saturé, aucune icône de danger, aucun point d'exclamation, aucune formulation de reproche — y
compris en dépassement de budget. Voir `CONTEXT.md` §10 et `DESIGN.md` (Do's and Don'ts).

## 2. À propos des fichiers de design

`prototype/Accueil NoMie.dc.html` est une **référence de design en HTML** : un prototype qui montre
l'apparence et le comportement attendus. **Ce n'est pas du code de production à copier.** La tâche
est de **recréer ces écrans dans l'environnement cible** avec ses patterns et sa bibliothèque de
composants. Le framework n'est pas encore tranché (cf. `CONTEXT.md` §9) : si le dépôt est vide,
choisir la stack la plus adaptée à une app Android locale-first avec portage iOS envisagé
(p. ex. Flutter, React Native + SQLite/Expo SQLite, ou Kotlin/Compose si Android seul).

Le prototype utilise React + un cadre de téléphone Android (`prototype/android-frame.jsx`) uniquement
pour le rendu : le bezel, la status bar et la barre de gestes **ne font pas partie du design**, elles
simulent l'appareil. La logique du prototype (calcul des soldes, pointage, split, etc.) est du mock :
elle documente le comportement, pas l'architecture.

## 3. Fidélité

**High-fidelity.** Couleurs, typographie, espacements, rayons et micro-copies sont définitifs et
issus du design system `DESIGN.md`. À reproduire fidèlement. Deux réserves explicites :

- **Iconographie des 27 catégories non spécifiée** — le prototype affiche un cercle
  `#F1EEE9` de 36 px avec les 2 premières lettres de la catégorie en `13px/600 #6B6B66`.
  C'est un **placeholder** : le remplacer par un set d'icônes ligne homogène (épaisseur constante),
  même gabarit 36 px, même fond.
- **Mode sombre non spécifié** — hors périmètre pour l'instant.

## 4. Design tokens

### Couleurs

| Rôle | Token | Hex |
|---|---|---|
| Accent de marque (sauge) | primary | `#4C7A6C` |
| Accent clair | primary-bright | `#5C8F7F` |
| Accent pressé | primary-deep | `#3A5F54` |
| Accent fond doux | primary-soft | `#E3ECE8` |
| Texte sur accent | on-primary | `#ffffff` |
| Fond d'écran | canvas | `#FAF8F5` |
| Cartes / lignes / champs | surface | `#ffffff` |
| Chips, zones secondaires | surface-soft | `#F1EEE9` |
| Piste de progression | surface-sunken | `#EBE7E0` |
| Séparateur 1px | hairline | `#E7E3DC` |
| Bordure bouton secondaire | hairline-strong | `#CFCAC0` |
| Texte principal | ink | `#232323` |
| Texte de contenu | body | `#3A3A3A` |
| Texte secondaire / tab inactif | mute | `#6B6B66` |
| Métadonnées, dates | ash | `#8C8C86` |
| Désactivé, placeholder | faint | `#D8D5CE` |
| Statut Pointé | status-pointe / -soft | `#4C7A6C` sur `#E3ECE8` |
| Statut Non pointé | status-non-pointe / -soft | `#C79A56` sur `#F5ECDB` |
| Statut Prévision | status-prevision / -soft | `#8B7CA6` sur `#ECE7F2` |
| Statut Flux comptable | status-flux / -soft | `#9A958C` sur `#EDEBE7` |
| Montant positif | amount-positive | `#4C7A6C` |
| Montant négatif (dépense) | amount-negative | `#8A5A46` |
| Avance | advance | `#8B7CA6` |
| Budget dans les clous | budget-ok | `#4C7A6C` |
| Budget à surveiller (y c. dépassement) | budget-watch | `#C79A56` |
| Lien | link | `#3A5F54` |

Il n'existe **aucune** couleur « danger ». Le dépassement de budget utilise `budget-watch`, jamais
une teinte plus intense ; il se lit dans le texte, pas dans la couleur.

### Typographie — Inter uniquement (400 / 500 / 600 / 700)

| Usage | Taille | Poids | Line-height | Letter-spacing |
|---|---|---|---|---|
| Solde principal (display-lg) | 34px | 700 | 1.15 | −0.3px |
| Solde d'un compte / total budget (display-md) | 28px | 600 | 1.2 | −0.2px |
| Titre d'écran (heading-lg) | 22px | 600 | 1.25 | 0 |
| Titre de section / app bar (heading-md) | 18px | 600 | 1.3 | 0 |
| Sous-titre, nom de catégorie (heading-sm) | 16px | 600 | 1.35 | 0 |
| Corps / champ (body-lg) | 16px | 400 | 1.5 | 0 |
| Défaut, libellé de transaction (body-md) | 14px | 400 | 1.45 | 0 |
| Emphase légère (body-md-medium) | 14px | 500 | 1.45 | 0 |
| Métadonnée, date, note (body-sm) | 13px | 400 | 1.4 | 0 |
| Pill, chip, tab bar (caption) | 12px | 500 | 1.35 | 0.1px |
| Bouton | 15px | 600 | 1.3 | 0 |
| Montant de ligne (amount-lg) | 20px | 700 | 1.2 | −0.1px |
| Montant secondaire (amount-sm) | 14px | 600 | 1.3 | 0 |

Tous les montants : `font-variant-numeric: tabular-nums`. Le poids 700 est réservé aux montants et
au solde. Aucune taille au-delà de 34px.

### Espacements, rayons, élévation

- Base 4px. Tokens : 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40.
- Marge d'écran : **16px** à gauche et à droite. Padding interne de carte : **20px**.
  Écart entre cartes : **12px**. Écart entre sections : **24px**.
- Rayons : 0 (app bar, tab bar, lignes de liste) · 8 (petits tags) · 12 (champ, split-row) ·
  16 (toutes les cartes) · 24 (coins hauts du bottom sheet) · 999 (boutons, pills, chips, FAB, barres).
- **Aucune ombre** sur les cartes : la profondeur vient du contraste `canvas → surface`.
  Seules exceptions : FAB `0 6px 16px rgba(58,95,84,.28)` et bottom sheet `0 -8px 28px rgba(35,35,35,.14)`.
- Cibles tactiles : boutons et FAB ≥ 48px, champ 52px, ligne de transaction 64px, ligne de réglage 56px.

### Formatage des montants

Locale `fr-FR`, 2 décimales, espace insécable avant `€` (`1 842,60 €`). Le signe négatif est le
**moins typographique `−` (U+2212)**, pas un tiret. Les recettes sont préfixées `+` dans les listes.
Mode confidentialité (voir §7) : le montant devient `•••• €`.

## 5. Chrome commun aux 5 écrans

**App bar** — hauteur 56px, fond `canvas`, padding horizontal 16px, `display:flex; align-items:center; gap:10px`.
- À gauche : logo 30×30, `border-radius:9px` (`assets/Logo.jpg`), puis le titre d'écran en heading-md
  `#232323`, letter-spacing −0.2px. Titre = `NoMie` sur Accueil, sinon le nom de l'écran
  (`Comptes`, `Budgets`, `Récurrences`, `Réglages`).
- À droite, **uniquement sur Accueil et Budgets** : sélecteur de mois — pill `surface`, bordure 1px
  `hairline`, radius 999, padding `3px 4px` ; chevrons `‹` `›` en boutons 26×26 `mute` ; libellé
  `Septembre 2026` en caption `ink`, `min-width:100px`, `text-align:center`, `white-space:nowrap`.
  Change le mois affiché partout (mois précédent/suivant, année suit).

**Tab bar** — hauteur 64px, fond `surface`, bordure haute 1px `hairline`, collée en bas, 5 onglets
de largeur égale : Accueil · Comptes · Budgets · Récurrences · Réglages. Chaque onglet :
colonne centrée, `gap:5px` — pastille d'icône 18×18 (placeholder : carré radius 5, bordure 2px) +
label caption. Actif : `primary` (+ fond de pastille `primary-soft`) ; inactif : `mute`.
À remplacer par de vraies icônes ligne.

**FAB** — 56×56, radius 999, fond `primary` (pressé `primary-deep`), glyphe `+` `on-primary` 26px,
ancré `right:16px`, 16px au-dessus de la tab bar, visible sur les 5 écrans. Ouvre le bottom sheet de
saisie. C'est le geste le plus fréquent de l'app : un tap depuis n'importe où.

## 6. Écrans

### 6.1 Accueil — tableau de bord

1. **Solde hero** (directement sur le canvas, padding `8px 16px 4px`) : libellé body-sm `ash`
   « Solde réel · tous comptes » ; montant display-lg `ink` ; ligne dessous en `gap:8px` :
   « Pointé 6 002,xx € » (body-sm `mute`), séparateur 1×12 `faint`, puis bouton pill
   `primary-soft`/`primary` caption padding `4px 10px` : « 3 à pointer » → navigue vers **Comptes**
   (ancre « À pointer »). S'il ne reste rien : « Tout est pointé ».
2. **Carrousel de comptes** — scroll horizontal, padding `16px 16px 4px`, `gap:12px`, cartes
   `flex:0 0 auto; width:168px`, fond `surface`, radius 16, padding 16 : point 8px `primary` @75 %
   + nom (14/600), montant réel amount-lg, « Pointé … » body-sm `ash`.
   *(Alternative documentée : pile verticale pleine largeur — voir DESIGN.md « Layout ».)*
3. **« Ce mois-ci »** — titre heading-md, puis carte `surface` radius 16 padding 20 en deux colonnes
   séparées par un filet vertical 1px `hairline` : Dépenses (amount-lg `amount-negative`) /
   Recettes (amount-lg `amount-positive`). Sous la carte, note body-sm `mute` :
   « Le salaire du 30 est déjà compté dans le solde réel, en Prévision. »
4. **Budgets** (aperçu) — en-tête heading-md + bouton ghost « Tout voir » (→ écran Budgets) ;
   3 cartes budget (structure en 6.3).
5. **Avances** — carte `surface` : titre heading-sm + badge `Avancé` (`advance` sur
   `status-prevision-soft`), sous-titre « 2 portions en attente de remboursement », total
   amount-lg `advance` à droite.
6. **Dernières opérations** — en-tête heading-md + hint body-sm `ash` « Tape pour pointer » ;
   conteneur `surface` radius 16 `overflow:hidden` ; lignes de 64px min, padding `13px 16px`,
   `gap:12px`, filet haut 1px `hairline`, hover `canvas` :
   icône catégorie 36px (placeholder décrit en §3) · libellé body-md-medium `ink` (ellipsis) +
   ligne meta (`status-pill` + « 11 sept. · Alimentation », ou « … · Avancé 14,25 € » si split) ·
   montant amount-lg coloré par le signe.
7. Espace bas de 116px pour ne pas passer sous le FAB / la tab bar.

Jeu de données du prototype (à reprendre pour comparer visuellement) : Carrefour Market −64,32 €
(non pointé), Salaire +2 380 € (prévision, 30 sept.), Le Comptoir −28,50 € (pointé, avance 14,25 €,
EdenRed), Essence −52,90 € (pointé), Vers Livret A −200 € (flux comptable), Abonnement mobile
−19,99 € (non pointé). Comptes : Compte courant, Livret A, EdenRed.

### 6.2 Comptes

1. Solde total (display-lg) + « Pointé … » body-sm.
2. Une **carte par compte** (`surface`, radius 16, padding 20, `gap:12px` entre elles) :
   point + nom heading-sm, nb d'opérations du mois en body-sm `ash` à droite ; puis deux colonnes
   `Réel` / `Pointé` (libellé caption `ash` + montant amount-lg, `ink` / `primary`) ;
   puis une ligne d'info body-sm `mute` (solde initial et date de création, ou nature du compte).
3. Bouton ghost « + Ajouter un compte » (48px de haut).
4. **À pointer** — même liste que l'accueil mais filtrée sur le statut Non pointé, icône sur fond
   `status-non-pointe-soft` / texte `status-non-pointe` ; tap = passe au statut Pointé et recalcule
   les soldes. Note dessous : « À faire quand ton relevé arrive, pas avant. » /
   « Tout est pointé, rien à faire de ce côté. »
5. **Archivés** — carte compacte : nom en `mute`, « Archivé · historique conservé », solde à droite.

Actions attendues par compte (non maquettées, via appui long ou détail) : renommer, archiver,
supprimer, modifier le solde initial. Nombre de comptes illimité, aucun type imposé.

### 6.3 Budgets

1. **Carte de synthèse** : deux colonnes `Dépensé` / `Prévu` en display-md (`ink` / `mute`),
   filet vertical `hairline`, puis `progress-track` 8px `surface-sunken` radius 999 avec
   remplissage `budget-ok`, puis note factuelle body-sm `mute` (« Environ deux tiers du mois
   écoulé, deux tiers du prévu utilisé. »).
2. **Une carte par budget** (`surface`, radius 16, padding 20) :
   nom heading-sm + ratio « 138 / 120 € » (14/600 `mute`) ; barre 8px avec
   `budget-ok` (`#4C7A6C`) si consommé ≤ 85 % du plafond, sinon `budget-watch` (`#C79A56`),
   largeur plafonnée à 100 % même en dépassement ; note factuelle body-sm ; puis, séparée par un
   filet haut 1px `hairline` (margin-top 14, padding-top 14), la ligne **Report du reliquat** :
   label body-md-medium + sous-texte `ash` (« Le reste du mois passé s'ajoute à ce budget » /
   « Chaque mois repart du montant prévu ») + switch à droite.
   Le report est activable **indépendamment pour chaque budget**.
3. Bouton ghost « + Ajouter un budget ».

**Switch** (commun à Budgets, Récurrences, Réglages) : piste 44×26 radius 999, padding 3,
fond `surface-sunken` au repos / `primary` actif ; pastille 20×20 blanche alignée à gauche/droite.

Micro-copies de dépassement à respecter : « Un peu plus qu'en général ce mois-ci — le reliquat
d'août couvre une partie. » Jamais « Vous avez dépassé… ».

### 6.4 Récurrences

1. Chapeau body-md `mute` : « Les règles ne créent une opération automatiquement que si tu
   l'autorises. Sinon elles restent en attente de ta validation. »
2. **Une carte par règle** : nom heading-sm + montant amount-lg coloré au signe sur la même ligne ;
   3 chips `surface-soft` radius 999 padding `6px 12px` body-sm : fréquence (« Mensuelle · le 5 »),
   compte, catégorie ; filet, puis ligne **Création automatique / Création manuelle** (label +
   sous-texte « Prochaine : 5 octobre » ou « À valider toi-même ») + switch.
   L'automatisation est un **opt-in explicite par règle**.
3. Bouton ghost « + Ajouter une règle ».
4. **Prochaines occurrences** — liste `surface` : libellé, pill `Prévision`, date `ash`, montant.
   Chaque occurrence doit être modifiable/supprimable individuellement **sans toucher à la règle**.

Règles du prototype : Loyer −780 € (mensuelle le 5, auto), Salaire +2 380 € (mensuelle le 30, auto),
Assurance auto −42,90 € (mensuelle le 12, manuelle), Cotisation club −180 € (annuelle, Livret A, manuelle).

### 6.5 Réglages

Groupes espacés de 24px. Chaque groupe : titre caption `ash` **majuscules** (letter-spacing 0.1px,
margin-bottom 10) + conteneur `surface` radius 16 `overflow:hidden` ; lignes de 56px min,
padding `14px 16px`, filet haut `hairline`, hover `canvas` : label 16/500 `ink` + sous-texte
body-sm `ash`, et à droite soit un switch, soit un chevron `›` `ash`. Note de groupe optionnelle
en body-sm `mute` sous le conteneur.

- **SÉCURITÉ** — Code PIN (switch) · Empreinte (switch). Note : « L'app se verrouille dès qu'elle
  passe en arrière-plan. » Le verrouillage PIN ou biométrie est **obligatoire dès la V1**.
- **STRUCTURE** — Comptes (« 3 actifs · 1 archivé ») · Catégories (« 27 catégories · ordre et
  couleurs ») · Avances en attente (« 2 portions · 64,50 € »).
- **NOTIFICATIONS** — Rappel de pointage (switch, « Le dimanche, en fin de journée ») · Point budget
  mensuel (switch, « Un résumé factuel le 1er du mois »). Note : « Ton détendu, jamais d'alerte :
  "Tu as dépensé un peu plus en Restaurant ce mois-ci qu'en général". »
- **DONNÉES** — Sauvegarde complète (fichier réimportable) · Export Excel/CSV (lisible hors app) ·
  Importer une sauvegarde (remplace les données de l'appareil). Note : « Tout reste sur ton
  téléphone. Une sauvegarde de temps en temps évite les mauvaises surprises. » Les deux mécanismes
  d'export restent **distincts et proposés séparément**.
- **SAISIE** — Clavier en montants arrondis (switch).
- Pied : body-sm `ash` centré « NoMie · version alpha · données stockées sur cet appareil ».

### 6.6 Bottom sheet de saisie (ouvert par le FAB)

- Scrim `rgba(35,35,35,.32)` plein écran, fade-in 160ms ease-out ; tap = fermeture.
- Feuille : fond `surface`, coins hauts radius 24, padding 24, ombre `0 -8px 28px rgba(35,35,35,.14)`,
  entrée `translateY(100%) → 0` en 220ms `cubic-bezier(.2,.8,.2,1)`. Poignée 40×4 radius 999
  `hairline` centrée.
- Titre heading-md « Nouvelle opération ».
- **Ligne de montant** : valeur 28/700 (`amount-negative` en dépense, `amount-positive` en recette)
  préfixée `−`/`+`, symbole `€` 20/600 `ash`, puis à droite un bouton pill `surface-soft` body-sm
  `link` qui bascule **Dépense / Recette**. Filet bas `hairline`.
- **Pavé numérique** : 12 touches (1-9, `,`, 0, `←`) en grille 3 colonnes, `gap:8px`, hauteur 48,
  radius 12, bordure 1px `hairline`, fond `surface` (pressé `surface-soft`), chiffre 18/600 `ink`.
  Une seule virgule autorisée, 9 caractères max.
- **Catégories** : chips scroll horizontal, radius 999 padding `8px 14px` body-sm —
  `surface-soft`/`ink` au repos, `primary`/`on-primary` sélectionnée.
- **Actions** : « Annuler » (bouton secondaire, bordure `hairline-strong`) + « Enregistrer »
  (bouton primaire `flex:1`, pressé `primary-deep`), hauteur 48, radius 999.
- Hint body-sm `ash` centré : « Tu peux répartir le montant sur plusieurs catégories après
  l'enregistrement. »
- Enregistrer crée l'opération au statut **Non pointé** sur le compte courant et la place en tête de
  la liste. L'écran complet de saisie (date opération, date banque, commentaire, compte, statut,
  **split illimité en montant ou %** avec contrôle du total en direct) reste à maquetter — utiliser
  les mêmes tokens, `split-row` = fond `surface-soft` radius 12 padding `10px 12px`.

### 6.7 Bilan annuel — visualisations

Prototype : `prototype/Bilan annuel NoMie.dc.html` (sélecteur d'états au-dessus du téléphone :
Standard · Un seul compte · Beaucoup de catégories · Solde sous zéro · Année vide ; chips
Alimentation = budget dans les clous, Restaurant = budget dépassé). Rendu à recoder en React Native
(react-native-svg ou lib de charts) — **ne pas reprendre le HTML**.

**Composition de l'écran (de haut en bas)** — chaque graphique est placé **au-dessus du tableau
qu'il résume**, dans sa propre carte `surface` radius 16 ; le tableau suit dans une seconde carte,
12px dessous.

1. En-tête 56px : « Bilan annuel » heading-md + bouton ghost « Fermer » (48px).
2. Sélecteur d'année centré : ‹ 2026 › (boutons 48×48, chiffre 22/600 tabulaire), sous-titre
   body-sm `ash` « Année en cours · réalisé jusqu'à fin septembre » / « Année complète ».
   Flèche désactivée = `faint` #D8D5CE. Bornes : première année avec des données → année en cours.
3. **Soldes en fin de mois** — graphique 2 + tableau. En premier : c'est la réponse à
   « où j'en suis sur l'année ».
4. **Dépenses par catégorie** — graphique 1 + tableau.
5. **Budgets · prévu et réalisé** — graphique 3 (sans tableau).
6. **Recettes par catégorie** — tableau seul (2 à 4 lignes : un graphique n'apporte rien).
7. **Opérations par compte** — tableau seul (variation nette mensuelle).

Titres de section : heading-sm (16/600 `ink`), margin-bottom 12, écart entre sections 24px.

**Où placer « prévu vs réalisé »** : sa place principale est l'**écran Budgets** — chaque carte
budget (§6.3) gagne un lien ghost « Voir l'année » qui ouvre un détail plein écran de la catégorie
contenant exactement le graphique 3 (sans les chips, la catégorie est déjà choisie). C'est là que la
question « est-ce que je tiens ce budget ? » se pose. Dans le Bilan annuel il sert de vue
comparative, catégorie par catégorie via les chips. Ne pas l'ajouter dans les cartes de la liste
Budgets elle-même : les barres de progression suffisent et la liste resterait légère.

#### Palette catégorielle (nouveaux tokens)

Même famille que les pastels actuels, remontée à une luminance moyenne équivalente (~L 60–68 %,
chroma bas) pour qu'aucune teinte ne domine. Attribution **par rang de montant**, pas par catégorie
fixe (les couleurs restent stables à l'intérieur d'une année affichée).

| Token | Hex | Pastel d'origine |
|---|---|---|
| chart-1 sauge | `#6F9486` | #E3ECE8 |
| chart-2 ocre | `#C2A06A` | #F5ECDB |
| chart-3 lavande | `#9A8DB4` | #ECE7F2 |
| chart-4 argile | `#C29478` | #F1DCCB |
| chart-5 bleu ardoise | `#8499B3` | #DCE7F3 |
| chart-6 eau | `#7BA8A1` | #DCEFEC |
| chart-7 rose poudré | `#C0939A` | #F3E1E3 |
| chart-8 olive | `#99A57A` | #E7ECD8 |
| chart-9 blé (réserve si N = 9) | `#C6B26F` | #F6EFD1 |
| chart-autres taupe | `#ADA69A` | #EBE7E0 |
| chart-sans-categorie | `#CFCAC0` (= hairline-strong) | — |

Comptes (graphique 2) : compte 1 `#4C7A6C` (primary), 2 `#8499B3`, 3 `#9A8DB4`, 4 `#C2A06A`,
dans l'ordre des comptes de l'utilisateur.

#### Graphique 1 — Répartition des dépenses par catégorie

- **Type** : barre empilée horizontale 100 % + liste classée (pas de camembert : illisible au-delà
  de 6 parts et difficile à comparer). Chaque ligne se déplie en mini-histogramme mensuel.
- **Dimensions** : carte padding `20px 20px 12px`. Barre empilée pleine largeur, hauteur 14px,
  radius 999, `overflow:hidden`, `gap:2px` blanc entre segments, margin `16px 0 8px`. Lignes :
  hauteur min 48px, padding horizontal 10px débordant de 10px dans le padding de carte, radius 12.
  Mini-histogramme : 12 barres `gap:4px`, hauteur zone 56px, radius `3px 3px 0 0`, ligne de base
  1px `hairline`, lettres des mois J F M… en caption 12px `ash` dessous.
- **En-tête de carte** : « Total 2026 » body-sm `ash` ; montant 28/600 `amount-negative` #8A5A46
  tabulaire ; période body-sm `mute`.
- **Ligne** : pastille 10×10 radius 3 (couleur du segment) · nom body-md-medium `ink` · % body-sm
  `ash` (« <1 % » sous 1 %) · montant amount-sm 14/600 `ink`, min-width 92 aligné à droite ·
  chevron ▾/▴ uniquement sur « Autres ». Ligne sélectionnée : fond `surface-soft` #F1EEE9.
- **Regroupement** : si plus de **N + 1** catégories ont des dépenses (N = 7 par défaut, réglable
  4–10), on garde les N premières et on regroupe le reste en « Autres (11) » en taupe. « Sans
  catégorie » est **toujours une ligne séparée, en dernier**, en #CFCAC0, même si elle est petite.
- **Micro-copies** : période « De janvier à septembre · les prévisions ne sont pas comptées. » /
  « De janvier à décembre. » ; détail « Moyenne 118,40 € par mois · le plus haut en août
  (201,30 €). » (moyenne sur les mois écoulés uniquement).
- **Tap** : sur une ligne → déplie son histogramme mensuel (une seule ouverte à la fois ; 2ᵉ tap
  referme). À l'ouverture de l'écran, la 1ʳᵉ catégorie est dépliée. Sur « Autres » → déplie la liste
  des catégories regroupées (nom 13 `mute`, % `ash`, montant 13 `mute`, lignes 36px, retrait 20px).
  La barre empilée est statique. Barre du mois le plus haut à opacité 1, autres à 0,7.
- **État vide** (aucune dépense sur l'année, mais d'autres données existent) : carte avec
  « Aucune dépense cette année. » body-md `mute` centré, padding 32/20 ; pas de barre ni de liste.

#### Graphique 2 — Évolution du solde

- **Type** : courbes (une par compte), 12 points = fin de chaque mois. Pas d'aire remplie.
- **Dimensions** : zone totale 200px ; zone de tracé `top:20px; bottom:28px` ; lettres des mois
  sur 20px en bas, 12 colonnes égales. Traits 2px, jonctions arrondies, pas de points hors sélection.
- **Axe Y** : 3 à 5 graduations « rondes » (pas choisi parmi 100 / 200 / 250 / 500 / 1 000 /
  2 000 / 2 500 / 5 000 / 10 000 €), toujours incluant 0. Lignes 1px `hairline` #E7E3DC ; libellés
  au-dessus de la ligne, à gauche, caption 12px `ash` tabulaire sans décimales (« 4 000 € »), fond
  blanc 85 % pour rester lisibles quand une courbe passe dessous.
- **Solde négatif** : la ligne 0 € passe en `hairline-strong` #CFCAC0 et la zone sous zéro reçoit un
  fond très léger #F6F3EE. La courbe **garde sa couleur** (pas de rouge) ; la lecture se fait par la
  ligne 0 et par la phrase sous le graphique.
- **Réel / Pointé** :
  - Plusieurs comptes : contrôle segmenté pleine largeur « Réel | Pointé », hauteur 48, fond
    `surface-soft`, segment actif `surface`. Une courbe par compte dans le mode choisi.
  - Un seul compte : pas de contrôle ; les deux courbes dans la couleur du compte — Réel en trait
    plein, Pointé en tirets `3 4`. Légende « — Réel  - - Pointé » body-sm `mute`.
- **Mois futurs (année en cours)** : le Réel continue jusqu'en décembre (il inclut les Prévisions)
  en même couleur à **40 % d'opacité** ; le Pointé s'arrête au mois courant. Légende : « Trait plus
  clair : prévisions d'octobre à décembre » (body-sm `ash`).
- **Légende comptes** (multi) : chips 48px de haut (pill intérieure radius 999 padding `7px 12px`,
  `surface-soft`, trait de couleur 12×3) ; hint body-sm `ash` « Touche un compte pour l'isoler. »
- **Tap** :
  - Sur une colonne du graphique ou via le stepper ‹ › (48×48) sous le graphique → sélectionne le
    mois. Le mois sélectionné est marqué par un trait vertical 1px #CFCAC0, des points 10px (fond
    blanc, bordure 2px couleur du compte) sur chaque courbe, et sa lettre en 600 `ink`.
    Par défaut : mois courant (ou décembre pour une année passée). Le stepper existe parce que les
    colonnes font ~28px de large : c'est lui qui garantit la cible de 48px.
  - Sur une chip de compte → isole ce compte (chip en `primary-soft`/`primary-deep`, autres chips
    atténuées) ; 2ᵉ tap → tous les comptes.
- **Lecture du mois** (sous le stepper, lignes 48px séparées par `hairline`) : pastille · nom du
  compte · à droite montant amount-sm (en `amount-negative` s'il est négatif) + sous-ligne body-sm
  `ash` « Pointé 1 206,20 € » ou « Rien de pointé à cette date ». Titre « Fin septembre » + pill
  `Prévision` si le mois est futur.
- **Micro-copies solde négatif** : « Le Compte courant est passé sous zéro fin août (−240,00 €),
  puis il est remonté fin septembre. » ; si une prévision passe sous zéro : « D'après les
  prévisions, il repasserait sous zéro fin octobre — une récurrence peut être décalée si besoin. »
  Jamais « découvert », « alerte », « attention ».
- **État vide** : « Aucun solde enregistré en 2024. » (même carte que ci-dessus).

#### Graphique 3 — Budget prévu vs réalisé

- **Type** : histogramme mensuel (12 colonnes) + repère horizontal du plafond par mois.
- **Dimensions** : zone 168px dont 24px pour les lettres de mois ; ligne de base 1px `hairline`.
  Barre : largeur 14px, centrée, radius `4px 4px 0 0`. Repère plafond : 22×2px, radius 1,
  `mute` #6B6B66, centré. Échelle : max(dépenses, plafonds) × 1,12. Mois sélectionné : fond de
  colonne `surface-soft`, radius `8px 8px 0 0`, lettre en 600 `ink`.
- **Couleurs** : barre `budget-ok` #4C7A6C si dépensé ≤ prévu du mois, `budget-watch` #C79A56
  sinon. **Aucune troisième couleur**, même pour un gros dépassement. Mois futurs : repère seul.
- **Report du reliquat** : si activé pour la catégorie, le plafond du mois = montant prévu + reste
  positif du mois précédent (cumulable) ; le repère monte donc visiblement. Sinon plafond constant.
- **Contrôles** : chips de catégorie budgétée en scroll horizontal (cibles 48px, pill `surface-soft`
  / active `primary` texte blanc), en haut de la carte (Bilan uniquement).
- **Légende** : ■ Dans le prévu · ■ Un peu au-dessus · — « Prévu » ou « Prévu, reliquat inclus ».
- **Résumé** (heading-sm + body-sm `mute`) :
  - dans les clous : « Dans le prévu tous les mois » / « 412,30 € non dépensés sur l'année. »
    (+ « , reportés au fil des mois. » si report) ;
  - dépassement : « Dans le prévu 6 mois sur 9 » / « 3 mois un peu au-dessus : juillet, août,
    septembre. »
- **Tap** : colonne ou stepper ‹ › → sélection du mois ; lecture sous le graphique : titre du mois
  + pill d'état (`Dans le prévu` sauge/sauge-soft, `Un peu au-dessus` #C79A56/#F5ECDB,
  `À venir` flux/flux-soft) ; « 138,00 € dépensés sur 120,00 € prévus » (14/600) ; « dont 20,00 € de
  reliquat de juillet » (body-sm `ash`, si report) ; message body-sm `mute` :
  - au-dessus : « Un peu plus que prévu ce mois-ci (+18,00 €). »
  - en dessous : « Il est resté 42,00 €. » / « Il est resté 42,00 €, reportés sur octobre. »
  - futur : « 120,00 € prévus » / « Mois pas encore commencé. »
- **États vides** : aucune catégorie budgétée → « Aucun budget suivi cette année. » + lien ghost
  « Créer un budget » (→ Budgets) ; budget sans dépense → barres absentes, repères visibles,
  résumé « Rien de dépensé ici cette année. »

#### Tableaux mois par mois (inchangés, précisions)

Carte `surface` radius 16, scroll horizontal. 1ʳᵉ colonne collante 124px (pastille 8×8 radius 3
de la couleur du graphique + libellé 13px ellipsé), colonnes 92px alignées à droite 13px tabulaire,
en-tête caption 12/500 `ash` (« janv. », « févr. »…, « Total »), lignes 44px séparées par
`hairline`, ligne Total en 600. Valeur nulle ou mois futur non compté : « — » en `faint`. Soldes
futurs affichés en `ash` (prévisions). Montants négatifs en `amount-negative`. Le tableau Dépenses
reprend exactement le regroupement du graphique (mêmes lignes « Autres » et « Sans catégorie »).

#### État « année sans données »

Si l'année ne contient aucune opération : une seule carte à la place des sections — « Aucune
opération en 2024. » (heading-sm) / « Les graphiques et les tableaux apparaîtront dès la première
opération saisie sur cette année. » (body-md `mute`) / lien ghost « Voir 2025 ». Si seules certaines
sections sont vides, chaque carte affiche son propre message (voir chaque graphique).

#### Interactions — récapitulatif

| Graphique | Statique | Réagit au tap |
|---|---|---|
| Barre empilée | oui | — |
| Liste des catégories | — | déplie l'histogramme mensuel / « Autres » |
| Courbes de solde | — | mois (colonne ou stepper), isolement d'un compte (chip), Réel/Pointé |
| Prévu vs réalisé | — | catégorie (chip), mois (colonne ou stepper) |

Pas d'animation de tracé, pas de zoom, pas de geste à plusieurs doigts, pas d'info-bulle flottante
(la lecture se fait dans une zone fixe sous le graphique). Transitions éventuelles : fondu ≤ 150 ms.

## 7. Interactions & état

| Déclencheur | Effet |
|---|---|
| Tap onglet de tab bar | change d'écran ; l'état de chaque écran est conservé |
| Chevrons du sélecteur de mois | mois ±1 (année suit) ; affecte Accueil et Budgets |
| Tap sur une ligne d'opération (Accueil) | Non pointé ⇄ Pointé ; **Prévision et Flux comptable ne changent pas** ; soldes recalculés immédiatement |
| Tap sur une ligne « À pointer » (Comptes) | passe à Pointé ; la ligne quitte la liste |
| Tap « n à pointer » (hero) | va sur Comptes |
| Tap « Tout voir » (Budgets) | va sur Budgets |
| Switch report / auto / réglage | bascule locale, sous-texte mis à jour en conséquence |
| FAB | ouvre le bottom sheet ; Annuler / scrim ferme et vide le brouillon |
| Enregistrer avec montant 0 ou vide | ferme sans rien créer (pas de message d'erreur) |

État nécessaire : mois + année affichés · onglet actif · liste de transactions (id, compte, date
opération, date banque, commentaire, montant, catégorie, statut, répartition, liens récurrence /
miroir) · brouillon de saisie (montant, signe, catégorie) · report par budget · mode auto par règle ·
réglages. Pas de fetch réseau : persistance locale (SQLite / stockage clé-valeur pour les réglages).

**Calculs** (cf. `CONTEXT.md` §7) :
- Solde pointé = solde initial + Σ transactions au statut **Pointé**.
- Solde réel/prévisionnel = solde initial + Σ **toutes** les transactions **sauf Flux comptable**
  (donc Prévisions incluses).
- Résumé du mois : dépenses/recettes hors **Flux comptable** et hors **Prévision**.
- Split : somme des sous-lignes = montant total (ou 100 %), contrôlée **en direct**.
- Mouvement inter-compte : transaction miroir créée automatiquement en une seule action.
- « Avancé » : marquable sur **n'importe quel compte** (pas seulement EdenRed).

**Validation** : pas de rouge, pas d'icône d'alerte. Message texte sobre en `amount-negative` sous
le champ, bordure de champ `primary` au focus, `hairline` au repos.

**Performance** : rester fluide avec plusieurs années d'historique — listes virtualisées, agrégats
calculés en base plutôt qu'en mémoire, un seul registre de transactions (pas de découpage mensuel).

## 8. Assets

- `assets/Logo.jpg` — logo NoMie, affiché 30×30 radius 9 dans l'app bar. Fourni par le client
  (à convertir en PNG/SVG transparent pour l'icône d'app).
  ⚠️ Dans le prototype, l'image est référencée par le chemin `uploads/Logo.jpg`.
- Aucun autre asset : icônes de catégories et de tab bar sont des **placeholders** (§3, §5) et
  doivent être remplacées par un set d'icônes ligne homogène.
- Police **Inter** (Google Fonts), poids 400/500/600/700 — à embarquer localement, l'app fonctionne
  hors-ligne.

## 9. Fichiers du bundle

| Fichier | Contenu |
|---|---|
| `README.md` | ce document |
| `prototype/Accueil NoMie.dc.html` | prototype des 5 écrans + bottom sheet (à ouvrir dans un navigateur) |
| `prototype/Bilan annuel NoMie.dc.html` | prototype du Bilan annuel et de ses 3 graphiques (§6.7) |
| `prototype/android-frame.jsx` | cadre d'appareil Android utilisé par le prototype (hors design) |
| `DESIGN.md` | design system NoMie complet (tokens + composants + do/don't) |
| `CONTEXT.md` | cahier des charges fonctionnel, modèle de données, règles de gestion |
| `assets/Logo.jpg` | logo |

Écrans encore à maquetter avant développement complet : saisie détaillée + éditeur de split,
détail budget « Voir l'année » (§6.7), gestion des catégories, vue des avances en attente, verrouillage PIN/biométrie.
