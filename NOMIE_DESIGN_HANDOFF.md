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
| `prototype/android-frame.jsx` | cadre d'appareil Android utilisé par le prototype (hors design) |
| `DESIGN.md` | design system NoMie complet (tokens + composants + do/don't) |
| `CONTEXT.md` | cahier des charges fonctionnel, modèle de données, règles de gestion |
| `assets/Logo.jpg` | logo |

Écrans encore à maquetter avant développement complet : saisie détaillée + éditeur de split,
tableau de bord annuel, visualisations (répartition par catégorie, évolution du solde, prévu vs
réalisé), gestion des catégories, vue des avances en attente, verrouillage PIN/biométrie.
