---
version: alpha
name: NoMie-design-system
description: |
  Système de design pour NoMie, application mobile de gestion budgétaire
  personnelle. Palette sobre et chaleureuse (canevas cassé-blanc, encre
  grise douce, accent sauge) volontairement dépourvue de rouge/orange
  alarmiste : les quatre statuts de transaction (Non Pointé, Pointé,
  Prévision, Flux comptable) et les dépassements de budget sont codés en
  teintes désaturées (sauge, sable, prune, gris) plutôt qu'en signal
  d'alerte. Typo unique (Manrope) pour rester lisible et chaleureuse. Coins
  arrondis généreux, cartes posées sur une ombre douce et large, composants pensés
  mobile-first (barre de tabs, bottom sheet de saisie, FAB d'ajout rapide).
  Point de départ initialement extrait du design system marketing de
  Revolut via `getdesign`, entièrement recoloré et recomposé pour un usage
  d'app bancaire personnelle bienveillante (voir CONTEXT.md — principe
  directeur : jamais anxiogène).

colors:
  primary: "#477566"
  primary-bright: "#5a8e7d"
  primary-deep: "#355c4f"
  primary-soft: "#eaf2ef"
  on-primary: "#ffffff"
  on-primary-mute: "rgba(255,255,255,0.72)"
  canvas: "#fcf7f8"
  surface: "#ffffff"
  surface-soft: "#f6eef0"
  surface-sunken: "#efe5e8"
  scrim: "rgba(36,31,33,0.32)"
  ink: "#241f21"
  body: "#3b3538"
  mute: "#675f63"
  ash: "#766e72"
  faint: "#ddd3d7"
  hairline: "#efe4e7"
  hairline-strong: "#dacfd3"
  status-pointe: "#477566"
  status-pointe-soft: "#eaf2ef"
  status-non-pointe: "#8a6422"
  status-non-pointe-soft: "#f7ecdc"
  status-prevision: "#6f5f8c"
  status-prevision-soft: "#efe9f5"
  status-flux: "#6f696c"
  status-flux-soft: "#f0ebed"
  amount-positive: "#477566"
  amount-negative: "#8a5a46"
  advance: "#6f5f8c"
  budget-ok: "#477566"
  budget-watch: "#c79a56"
  link: "#355c4f"
  chart-1: "#6f9486"
  chart-2: "#c2a06a"
  chart-3: "#9a8db4"
  chart-4: "#c29478"
  chart-5: "#8499b3"
  chart-6: "#7ba8a1"
  chart-7: "#c0939a"
  chart-8: "#99a57a"
  chart-9: "#c6b26f"
  chart-autres: "#b3aaae"
  chart-sans-categorie: "#dacfd3"
  chart-sous-zero: "#f8f1f3"
  chart-compte-1: "#477566"
  chart-compte-2: "#8499b3"
  chart-compte-3: "#9a8db4"
  chart-compte-4: "#c2a06a"

typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.11
    letterSpacing: -0.8px
  display-md:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.21
    letterSpacing: -0.5px
  heading-lg:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.27
    letterSpacing: -0.4px
  heading-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: -0.2px
  heading-sm:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.38
    letterSpacing: -0.1px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0px
  body-md-medium:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: 0px
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.38
    letterSpacing: 0px
  caption:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: 0.1px
  button:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: -0.1px
  amount-lg:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: -0.3px
  amount-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.29
    letterSpacing: -0.1px

rounded:
  none: 0px
  sm: 10px
  md: 14px
  lg: 20px
  xl: 28px
  full: 999px

shadows:
  card: "0 1px 2px rgba(36,31,33,0.04), 0 6px 20px rgba(36,31,33,0.05)"
  sheet: "0 -12px 40px rgba(36,31,33,0.12)"
  fab: "0 8px 20px rgba(53,92,79,0.30)"

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px

components:
  app-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.heading-md}"
    rounded: "{rounded.none}"
    height: 56px
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.mute}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    height: 64px
  fab-add:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: 13px 24px
    height: 48px
  button-primary-pressed:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: 12px 23px
    height: 48px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: 13px 24px
    height: 48px
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: 12px 14px
    height: 52px
  account-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  balance-hero:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.none}"
    padding: 0
  transaction-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.none}"
    padding: 14px 16px
    height: 64px
  status-pill:
    backgroundColor: "{colors.status-non-pointe-soft}"
    textColor: "{colors.status-non-pointe}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 3px 10px
  category-chip:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 6px 12px
  budget-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  progress-track:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "{rounded.full}"
    height: 8px
  progress-fill-ok:
    backgroundColor: "{colors.budget-ok}"
    rounded: "{rounded.full}"
    height: 8px
  progress-fill-watch:
    backgroundColor: "{colors.budget-watch}"
    rounded: "{rounded.full}"
    height: 8px
  split-row:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 12px
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.xl}"
    padding: 24px
  switch-toggle:
    backgroundColor: "{colors.surface-sunken}"
    activeColor: "{colors.primary}"
    rounded: "{rounded.full}"
  badge-advance:
    backgroundColor: "{colors.status-prevision-soft}"
    textColor: "{colors.advance}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 3px 10px
  empty-state:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.mute}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 40px 24px
---

## Overview

NoMie est une app de gestion budgétaire personnelle, utilisée seul(e) au
quotidien pour saisir une dépense en quelques secondes — pas une brochure
produit. Le système de design privilégie donc la **lisibilité rapide et le
calme visuel** plutôt que l'impact éditorial : un seul canevas cassé-blanc
(`{colors.canvas}` — `#fcf7f8`, jamais de noir pur ni de blanc pur en fond
plein écran), des cartes `{colors.surface}` posées dessus sur une ombre douce
et large (`shadow-card`), et une typo unique (**Manrope**) qui ne cherche jamais à impressionner.

Le principe directeur du cahier des charges — **l'app ne doit jamais être
anxiogène** — se traduit directement dans la palette : aucune couleur
saturée de type rouge/orange d'alerte n'existe dans le système. Les quatre
statuts de transaction (Non Pointé, Pointé, Prévision, Flux comptable) et
le dépassement de budget sont codés en teintes **désaturées et distinctes**
(sauge, sable, prune, gris) — l'information reste lisible sans jamais lire
comme un signal de danger.

**Key Characteristics:**
- Un seul canevas chaleureux `{colors.canvas}` (`#fcf7f8`, un blanc cassé rosé) — pas de mode sombre marketing, pas de noir pur.
- Accent unique `{colors.primary}` — sauge `#477566` — associé au positif (solde, revenu, action principale), jamais à l'urgence.
- Zéro rouge/orange saturé dans tout le système : le "négatif" (dépense) est un brun-terracotta doux `{colors.amount-negative}`, jamais un rouge d'alerte.
- Statuts codés par teinte + fond tinté doux (`{component.status-pill}`), pas par icône d'avertissement.
- Coins généreux (`{rounded.lg}` 20px sur les cartes, `{rounded.xl}` 28px sur la feuille, `{rounded.full}` sur boutons/pills).
- Composants pensés pour un usage à une main : `{component.fab-add}` pour la saisie rapide, `{component.bottom-sheet}` pour le formulaire de transaction/split, `{component.tab-bar}` pour la navigation principale.

## Colors

### Brand & Accent
- **Sauge** (`{colors.primary}` — `#477566`): couleur de marque unique. CTA principal, solde positif, statut Pointé, remplissage de budget dans les clous. Reste discrète — jamais utilisée en aplat sur de grandes surfaces.
- **Sauge claire** (`{colors.primary-bright}` — `#5a8e7d`): variante d'accent inline, icônes actives.
- **Sauge profonde** (`{colors.primary-deep}` — `#355c4f`): état pressé/actif des éléments sauge.
- **Sauge douce** (`{colors.primary-soft}` — `#eaf2ef`): fond teinté très clair pour badges, sélection, fond de `{component.status-pill}` "Pointé".
- **On-Primary** (`{colors.on-primary}` — `#ffffff`): texte sur surfaces `{colors.primary}`.

### Surface
- **Canvas** (`{colors.canvas}` — `#fcf7f8`): fond d'écran par défaut, cassé-blanc rosé — jamais de blanc pur ni de noir en fond plein écran.
- **Surface** (`{colors.surface}` — `#ffffff`): cartes, lignes de liste, champs de saisie — blanc pur posé sur le canevas pour créer un léger contraste sans bordure dure.
- **Surface Soft** (`{colors.surface-soft}` — `#f6eef0`): fond de chip/tag, zones secondaires (ex. lignes de split dans le formulaire de saisie).
- **Surface Sunken** (`{colors.surface-sunken}` — `#efe5e8`): fond de piste de progression (`{component.progress-track}`), zones "creusées".
- **Hairline** (`{colors.hairline}` — `#efe4e7`): séparateurs 1px entre lignes de transaction.
- **Hairline Strong** (`{colors.hairline-strong}` — `#dacfd3`): bordure de `{component.button-secondary}`, contours de champ au focus off.

### Text
- **Ink** (`{colors.ink}` — `#241f21`): texte principal — gris très foncé, pas de noir pur (plus doux à l'œil, cohérent avec le canevas chaud).
- **Body** (`{colors.body}` — `#3b3538`): texte de contenu long (descriptions, notes).
- **Mute** (`{colors.mute}` — `#675f63`): texte secondaire, libellés de champ, éléments de tab bar inactifs.
- **Ash** (`{colors.ash}` — `#766e72`): métadonnées, dates, texte tertiaire.
- **Faint** (`{colors.faint}` — `#ddd3d7`): texte désactivé, placeholders.

### Statuts de transaction
Les 4 statuts métier (voir CONTEXT.md §7) sont codés par une teinte + son fond
tinté associé, jamais par une icône d'alerte :
- **Pointé** (`{colors.status-pointe}` — `#477566` sur `{colors.status-pointe-soft}` `#eaf2ef`): confirmé par la banque.
- **Non Pointé** (`{colors.status-non-pointe}` — `#8a6422` sur `{colors.status-non-pointe-soft}` `#f7ecdc`): saisi, en attente de confirmation — sable doux, pas un warning.
- **Prévision** (`{colors.status-prevision}` — `#6f5f8c` sur `{colors.status-prevision-soft}` `#efe9f5`): anticipé, pas encore réalisé — prune douce.
- **Flux comptable** (`{colors.status-flux}` — `#6f696c` sur `{colors.status-flux-soft}` `#f0ebed`): mouvement technique neutralisé — gris neutre, volontairement le moins visible des quatre.

### Montants & Budget
- **Positif** (`{colors.amount-positive}` — `#477566`): recette, remboursement. Même teinte que `{colors.primary}` — l'argent qui rentre reste associé à la couleur de confiance de l'app.
- **Négatif** (`{colors.amount-negative}` — `#8A5A46`): dépense. Un brun-terracotta assourdi, délibérément choisi contre tout rouge — une dépense n'est pas une faute.
- **Avance** (`{colors.advance}` — `#6f5f8c`): portion "Avancé" d'un split, même famille que le statut Prévision.
- **Budget dans les clous** (`{colors.budget-ok}` — `#477566`): `{component.progress-fill-ok}`.
- **Budget à surveiller** (`{colors.budget-watch}` — `#C79A56`): `{component.progress-fill-watch}` — utilisé même en dépassement ; il n'existe **aucune** troisième couleur "danger" plus intense. Le dépassement se lit dans le texte ("un peu plus que d'habitude"), pas dans une couleur qui s'aggrave.
- **Link** (`{colors.link}` — `#355c4f`): liens inline, actions secondaires textuelles.

### Graphiques (Bilan annuel)
Palette catégorielle du Bilan annuel (handoff §6.7) : même famille que les pastels, remontée à une
luminance moyenne équivalente pour qu'aucune teinte ne domine. Attribution **par rang de montant**,
pas par catégorie fixe.
- **chart-1 … chart-9** (`#6F9486` sauge, `#C2A06A` ocre, `#9A8DB4` lavande, `#C29478` argile, `#8499B3` bleu ardoise, `#7BA8A1` eau, `#C0939A` rose poudré, `#99A57A` olive, `#C6B26F` blé — réserve).
- **Autres** (`{colors.chart-autres}` — `#b3aaae`): catégories regroupées, taupe.
- **Sans catégorie** (`{colors.chart-sans-categorie}` — `#dacfd3`, = hairline-strong): toujours une ligne à part, en dernier.
- **Sous zéro** (`{colors.chart-sous-zero}` — `#f8f1f3`): fond très léger sous la ligne 0 € de l'évolution du solde ; la courbe garde sa couleur, jamais de rouge.
- **Comptes** (`chart-compte-1 … 4` — `#477566`, `#8499B3`, `#9A8DB4`, `#C2A06A`): une couleur par compte, dans l'ordre des comptes de l'utilisateur.

## Typography

### Font Family

Une seule famille : **Manrope** — sans-serif géométrique aux formes arrondies,
chiffres tabulaires, très lisible en petite taille sur mobile, gratuite
(embarquée via `@expo-google-fonts/manrope`, aucun appel réseau). NoMie n'a pas
besoin d'une typo d'apparat : le contenu (montants, listes, formulaires) prime
sur l'effet éditorial. Poids utilisés : 400 (texte courant), 500 (emphase
légère, libellés), 600 (sous-titres), 700 (titres, boutons, solde), 800 (montants
d'une ligne de transaction).

### Hierarchy

| Token | Taille | Poids | Line Height | Usage |
|---|---|---|---|---|
| `{typography.display-lg}` | 36px | 700 | 1.11 | Solde principal du tableau de bord. |
| `{typography.display-md}` | 28px | 700 | 1.21 | Solde d'un compte sur sa page dédiée. |
| `{typography.heading-lg}` | 22px | 700 | 1.27 | Titres d'écran. |
| `{typography.heading-md}` | 18px | 700 | 1.33 | Titres de section (ex. "Ce mois-ci"), `{component.app-bar}`. |
| `{typography.heading-sm}` | 16px | 600 | 1.38 | Sous-titres, nom de catégorie en tête de groupe. |
| `{typography.body-lg}` | 16px | 400 | 1.5 | Texte de champ de saisie, corps principal. |
| `{typography.body-md}` | 14px | 400 | 1.45 | Défaut — libellés de transaction, texte de carte. |
| `{typography.body-md-medium}` | 14px | 500 | 1.45 | Emphase légère (nom de catégorie dans une ligne). |
| `{typography.body-sm}` | 13px | 400 | 1.4 | Métadonnées, date, commentaire. |
| `{typography.caption}` | 12px | 500 | 1.35 | `{component.status-pill}`, `{component.category-chip}`, tab bar. |
| `{typography.button}` | 15px | 700 | 1.33 | Tous les boutons. |
| `{typography.amount-lg}` | 20px | 800 | 1.2 | Montant dans une ligne de transaction, chiffres tabulaires. |
| `{typography.amount-sm}` | 14px | 700 | 1.29 | Montant secondaire (ligne de split, sous-total). |

### Principles
- Les montants (`{typography.amount-lg}`, `{typography.amount-sm}`) utilisent des chiffres tabulaires (`font-variant-numeric: tabular-nums`) pour que les colonnes de montants restent alignées dans les listes.
- Aucune taille display marketing (pas de 40px+) : le plus grand texte de l'app est le solde du tableau de bord à 36px.
- Les titres sont en 700 avec un interlettrage resserré, mais l'argent reste l'élément le plus fort de l'écran : `{typography.amount-lg}` monte à 800, le poids le plus lourd du système.

## Layout

### Spacing System
- **Base unit**: 4px.
- **Tokens**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 20px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.xxxl}` 40px.
- Marge d'écran par défaut : `{spacing.md}` (16px) de chaque côté.
- Padding de carte (`{component.account-card}`, `{component.budget-card}`) : `{spacing.lg}` (20px).
- Espacement vertical entre sections d'un écran : `{spacing.xl}` (24px).

### Grid & Container
- App mobile portrait uniquement — pas de grille desktop/tablette dans ce système (voir "Responsive Behavior").
- Listes de transactions : liste verticale simple, une ligne par transaction, séparées par `{colors.hairline}`.
- Tableau de bord : pile verticale de cartes pleine largeur (`{component.balance-hero}`, cartes de comptes, résumé du mois, budgets) — pas de grille multi-colonnes.

### Whitespace Philosophy
- Espacement resserré par rapport à un site marketing : les écrans denses en information (liste de transactions, détail de budget) doivent rester scannables sans scroll excessif.
- Les cartes respirent (`{spacing.lg}` de padding interne) mais s'enchaînent avec `{spacing.md}` entre elles, pas plus.

## Elevation & Depth

| Niveau | Traitement | Usage |
|---|---|---|
| 0 — canevas | `{colors.canvas}`, aucune ombre | Fond d'écran par défaut. |
| 1 — surface | `{colors.surface}` sur `{colors.canvas}` avec `shadow-card`, sans bordure | Cartes, listes groupées. |
| 2 — bottom sheet | `{colors.surface}`, coins `{rounded.xl}` en haut, `shadow-sheet`, voile `{colors.scrim}` derrière | Formulaire de saisie de transaction, éditeur de split. |
| 3 — accent | `{colors.primary}` en aplat, `shadow-fab` teintée `{colors.primary-deep}` | `{component.fab-add}` ; `{component.button-primary}` sans ombre. |

Les ombres sont douces et très larges : un soulèvement léger qui remplace les
bordures, jamais une ombre dure façon carte physique. Valeurs : `shadow-card`
`0 1px 2px rgba(36,31,33,0.04), 0 6px 20px rgba(36,31,33,0.05)`, `shadow-sheet`
`0 -12px 40px rgba(36,31,33,0.12)`, `shadow-fab` `0 8px 20px rgba(53,92,79,0.30)`.
React Native n'accepte qu'une couche : l'app garde la couche large (voir
`shadows` dans `NoMie/src/theme/tokens.ts`).

## Shapes

### Border Radius Scale

| Token | Valeur | Usage |
|---|---|---|
| `{rounded.none}` | 0px | `{component.app-bar}`, `{component.tab-bar}`, lignes de transaction. |
| `{rounded.sm}` | 10px | Petits tags inline. |
| `{rounded.md}` | 14px | `{component.text-input}`, `{component.split-row}`. |
| `{rounded.lg}` | 20px | `{component.account-card}`, `{component.budget-card}`. |
| `{rounded.xl}` | 28px | Coins hauts de `{component.bottom-sheet}`. |
| `{rounded.full}` | 999px | Boutons, `{component.status-pill}`, `{component.category-chip}`, `{component.fab-add}`, barres de progression. |

## Components

### Navigation

**`app-bar`** — en-tête d'écran
- Fond `{colors.canvas}`, texte `{colors.ink}`, type `{typography.heading-md}`, hauteur 56px.
- Titre d'écran centré ou aligné à gauche selon le contexte ; action secondaire (ex. filtre, export) à droite.

**`tab-bar`** — navigation principale (bas d'écran)
- Fond `{colors.surface}`, icônes/labels `{colors.mute}` au repos, `{colors.primary}` à l'état actif, type `{typography.caption}`, hauteur 64px.
- 4-5 destinations max (Tableau de bord, Comptes, Budgets, Récurrences, Réglages).

**`fab-add`** — action rapide d'ajout
- Fond `{colors.primary}`, icône `{colors.on-primary}`, `rounded: {rounded.full}`, 60px de diamètre, ancré en bas à droite au-dessus de la `{component.tab-bar}`.
- Ouvre le `{component.bottom-sheet}` de saisie de transaction — le geste le plus fréquent de l'app doit être atteignable en un tap depuis n'importe quel écran principal.

### Buttons

**`button-primary`** — action principale
- Fond `{colors.primary}`, texte `{colors.on-primary}`, type `{typography.button}`, `rounded: {rounded.full}`, hauteur 48px.
- Enregistrer une transaction, valider un budget. État pressé : `button-primary-pressed` (`{colors.primary-deep}`).

**`button-secondary`** — action secondaire
- Fond `{colors.surface}`, texte `{colors.ink}`, bordure 1px `{colors.hairline-strong}`, type `{typography.button}`, `rounded: {rounded.full}`.
- Annuler, actions alternatives dans une modale.

**`button-ghost`** — action tertiaire
- Fond transparent, texte `{colors.primary}`, type `{typography.button}`.
- Liens d'action dans une liste (ex. "Ajouter une catégorie").

### Cards & Data Display

**`account-card`** — carte de compte
- Fond `{colors.surface}`, texte `{colors.ink}`, `rounded: {rounded.lg}`, `shadow-card`, padding `{spacing.lg}`.
- Nom du compte (`{typography.heading-sm}`), solde pointé et solde réel (`{typography.amount-lg}` / `{typography.body-sm}` en dessous).

**`balance-hero`** — solde principal
- Fond `{colors.canvas}` (pas de carte, directement sur l'écran), type `{typography.display-lg}`.
- Un seul par tableau de bord — le chiffre le plus important de l'app.

**`transaction-row`** — ligne de transaction
- Fond `{colors.surface}`, séparée par `{colors.hairline}`, padding `14px 16px`, hauteur 64px.
- Icône de catégorie à gauche, libellé + `{component.status-pill}` au centre, montant (`{typography.amount-lg}`, couleur `{colors.amount-positive}` ou `{colors.amount-negative}` selon le signe) à droite. Tap = pointage rapide.

**`status-pill`** — badge de statut
- Fond et texte selon le statut (voir "Statuts de transaction" ci-dessus), type `{typography.caption}`, `rounded: {rounded.full}`, padding `3px 10px`.

**`category-chip`** — sélecteur/affichage de catégorie
- Fond `{colors.surface-soft}`, texte `{colors.ink}`, type `{typography.body-sm}`, `rounded: {rounded.full}`.
- Utilisé dans le sélecteur de catégorie et en filtre de liste.

**`budget-card`** — carte de budget prévisionnel
- Fond `{colors.surface}`, `rounded: {rounded.lg}`, `shadow-card`, padding `{spacing.lg}`.
- Catégorie + montant plafond en tête, `{component.progress-track}` avec `{component.progress-fill-ok}` ou `{component.progress-fill-watch}`, texte de suivi factuel en dessous (jamais formulé comme un reproche — voir CONTEXT.md §10).

**`split-row`** — ligne de répartition
- Fond `{colors.surface-soft}`, `rounded: {rounded.md}`, padding `10px 12px`.
- Une ligne par sous-catégorie dans le formulaire de split ; contrôle en direct du total affiché en `{typography.body-sm}` sous la liste.

**`badge-advance`** — badge "Avancé"
- Fond `{colors.status-prevision-soft}`, texte `{colors.advance}`, type `{typography.caption}`, `rounded: {rounded.full}`.
- Marque la portion "Avancé" d'un split, quel que soit le compte.

### Inputs & Forms

**`text-input`** — champ de saisie par défaut
- Fond `{colors.surface}`, texte `{colors.ink}`, type `{typography.body-lg}`, `rounded: {rounded.md}`, hauteur 52px.
- Bordure `{colors.hairline}` au repos, `{colors.primary}` au focus (pas de rouge en cas d'erreur de validation — préférer un message texte `{colors.amount-negative}` sous le champ, sobre, sans icône d'alerte).

**`switch-toggle`** — interrupteur
- Piste `{colors.surface-sunken}`, `{colors.primary}` à l'état actif, `rounded: {rounded.full}`.
- Activation explicite d'une récurrence automatique, report du reliquat d'un budget.

**`bottom-sheet`** — feuille modale
- Fond `{colors.surface}`, coins hauts `{rounded.xl}`, padding `{spacing.xl}`.
- Formulaire de saisie de transaction, éditeur de split, sélecteur de catégorie — tout ce qui interrompt temporairement le flux principal remonte du bas plutôt que de pousser un nouvel écran plein, pour rester rapide à fermer.

### Feedback

**`empty-state`** — état vide
- Fond `{colors.canvas}`, texte `{colors.mute}`, type `{typography.body-md}`, padding `40px 24px`.
- Ton toujours factuel et léger ("Aucune transaction ce mois-ci pour l'instant"), jamais culpabilisant.

## Do's and Don'ts

### Do
- Garder `{colors.primary}` (sauge) comme unique couleur de marque — action principale, solde positif, statut Pointé.
- Coder les 4 statuts et le suivi de budget par teinte désaturée + fond tinté (`-soft`), jamais par un rouge/orange saturé.
- Utiliser `{component.bottom-sheet}` pour toute saisie ou édition rapide (transaction, split, catégorie) plutôt qu'un écran plein qui casse le flux.
- Formuler tout texte de suivi de budget ou de notification comme un fait, jamais comme une alerte (voir CONTEXT.md §10 pour des exemples de formulation).
- Utiliser des chiffres tabulaires sur tous les montants pour garder les colonnes alignées.
- Garder `{component.fab-add}` accessible en un tap depuis les écrans principaux — c'est le geste le plus fréquent de l'app.

### Don't
- Ne jamais introduire de rouge/orange saturé, même pour un dépassement de budget ou une erreur de saisie.
- Ne pas dupliquer la sauge comme deuxième couleur "succès" différente de `{colors.primary}` — une seule couleur de confiance dans tout le système.
- Ne pas utiliser de point d'exclamation ni d'icône de danger (triangle, panneau stop) dans les micro-textes ou notifications.
- Ne pas ajouter d'ombre dure ou sombre sur les cartes — seule `shadow-card`, douce et large, est admise ; pas de bordure en plus.
- Ne pas réintroduire de typo display façon marketing (Aeonik Pro et consorts) : Manrope partout, y compris pour le solde principal.
- Ne pas dépasser 3 boutons visibles simultanément sur un même écran (primary + secondary + ghost au maximum).

## Responsive Behavior

NoMie est une app mobile portrait ; il n'y a pas de mode desktop/tablette
dans ce système (contrairement à l'extraction marketing d'origine).

### Cibles d'écran
- **Téléphone standard** (360–430px de large) : layout de référence, pile verticale pleine largeur, marges `{spacing.md}` (16px).
- **Petit téléphone** (< 360px) : la `{component.tab-bar}` réduit ses labels à l'icône seule si besoin ; les cartes gardent leur padding mais le texte passe si nécessaire à `{typography.body-sm}`.
- **Orientation** : portrait uniquement pour la V1 — le paysage n'est pas dans le périmètre du cahier des charges.

### Touch Targets
- Boutons : 48px de haut au minimum ; `{component.fab-add}` : 60px de diamètre.
- `{component.text-input}` fait 52px de haut.
- Chaque `{component.transaction-row}` (64px) est dimensionnée pour un pointage rapide au tap sans viser précisément une petite cible.

## Iteration Guide

1. Travailler un composant à la fois. La majorité des écrans combinent `{colors.canvas}` en fond, des cartes `{colors.surface}` en `{rounded.lg}`, et des boutons en `{rounded.full}`.
2. Référencer les tokens directement (`{colors.primary}`, `{component.status-pill}`, `{rounded.lg}`) plutôt que de paraphraser une couleur ou une taille.
3. Avant d'ajouter une nouvelle couleur sémantique (nouveau statut, nouvel état), vérifier qu'elle reste dans la famille désaturée du système — aucune couleur ne doit "crier" plus fort qu'une autre.
4. Ajouter les nouveaux variants comme entrées séparées (`-pressed`, `-disabled`, `-soft`) plutôt que dans la prose.
5. Réserver `{typography.amount-lg}` et le poids 800 aux montants.

## Known Gaps

- Écrans détaillés non encore maquettés (récurrences, réglages, export) — les tokens ci-dessus s'appliquent mais les compositions précises restent à définir écran par écran.
- Iconographie des 27 catégories (voir CONTEXT.md §4) non spécifiée — à choisir dans un set cohérent (ex. style ligne, épaisseur constante) une fois le framework technique tranché.
- Mode sombre non spécifié — à ajouter ultérieurement si demandé, en gardant le même principe : jamais de noir pur, jamais de rouge d'alerte.
- Détail des micro-copies de notification (rappel de pointage, information budget) à écrire séparément en s'appuyant sur le ton défini dans CONTEXT.md §10.
