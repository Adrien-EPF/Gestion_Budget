# Spec V2 — NoMie : suivi de trésorerie et suivi comptable

> Spec destinée à Claude Code, au format `/to-spec`. Enchaîner `/to-tickets` puis `/implement-spec`.
> Source : cahier des charges V2 validé par l'utilisateur (`Cahier_des_charges_NoMieV2.pdf`), la note de Colin et le fichier Excel d'origine.
> Avant de coder, lire `CONTEXT.md`, `DESIGN.md`, `NOMIE_DESIGN_HANDOFF.md` et `docs/adr/`. Vocabulaire du domaine : voir le glossaire en fin de document, à reporter dans `CONTEXT.md`.

## Problem Statement

NoMie V1 est en service, mais l'utilisateur ne peut pas y tenir ses comptes comme il le faisait dans l'Excel.

- **La saisie est trop pauvre.** La saisie rapide ne propose que le montant, le sens et la catégorie : l'opération tombe sur le premier compte, à la date du jour, en Non pointé, sans libellé. Aucun écran ne permet de choisir le compte, la date, la date banque, le statut, de répartir le montant, de marquer une avance ou un virement. Aucune opération ne peut être modifiée ni supprimée. Le service de données sait gérer la répartition, l'avance et le virement, mais rien n'y donne accès.
- **Trésorerie et comptabilité sont mélangées.** C'est la remarque centrale de la validation : *« Toujours bien distinguer le suivi trésorerie du suivi comptable. »* L'Excel les séparait sans le dire :
  - la **trésorerie** est le vrai argent sur les comptes ; le solde excluait les lignes « Flux comptable » ;
  - le **bilan comptable** est ce qu'on a réellement dépensé ou gagné ; il affichait un « Total (hors Avancé) » et isolait les mouvements entre comptes.

  La V1 confond les deux. Un virement vers le Livret A compte comme une dépense du mois. Un remboursement d'avance gonfle les recettes : dans l'Excel, 916 € de remboursements étaient comptés comme revenus pour 145 € d'avances. Enfin, rien ne permet de voir au bilan un impôt prélevé à la source, qui ne passe jamais par le compte.
- **Une prévision ne devient jamais réelle.** Une récurrence crée des Prévisions qui restent Prévision même une fois leur date passée. Pour vérifier ce comportement, il faut attendre des semaines.
- **Il manque des outils de lecture.** Il n'y a pas de niveau d'importance des dépenses, pas de comparaison « où j'en étais à la même date », pas de suivi de l'épargne. Le Bilan annuel a trop de sections et trop de catégories, et aucune synthèse.

## Solution

1. **Deux suivis, deux sections, comme l'Excel.**
   - La **trésorerie** suit les vrais flux bancaires : soldes réel et pointé par compte, solde de début de mois, épargne versée.
   - Le **bilan comptable** suit ce qu'on a réellement dépensé ou gagné : dépenses et recettes, importance, comparaison à date, budgets.

   Le bilan du mois (Accueil) et le Bilan annuel affichent la trésorerie en haut et le comptable en dessous, comme la feuille Bilan de l'Excel.
2. **Deux marqueurs symétriques.**
   - **Fantôme** (statut) : une écriture *comptable seulement*. Elle apparaît au bilan mais pas dans les soldes.
   - **Hors bilan** (case) : une opération de *trésorerie seulement*. Elle compte dans les soldes mais pas au bilan.

   Les avances, leurs remboursements et les mouvements entre comptes sont automatiquement hors bilan.
3. **Saisie complète.** La saisie rapide est enrichie (libellé, suggestions, calculs, importance). Un écran complet permet de créer, modifier et supprimer une opération, de la répartir et de la « partager à N ».
4. **Lecture enrichie.** Chaque dépense reçoit un niveau d'importance. Le bilan du mois offre une comparaison à date (moyenne des 3 mois précédents) et l'épargne versée. Les budgets peuvent porter sur un niveau d'importance. Le Bilan annuel est allégé.
5. **Fiabilité.**
   - Les prévisions basculent en Non pointé le jour venu.
   - Un mode « date simulée », réservé au développement, permet de tester les récurrences.
   - La V2 démarre sur une base vide (pas de migration).

## User Stories

### Saisie et modification
1. En tant qu'utilisateur, je veux ajouter un libellé (ex. « Lidl ») dans la saisie rapide, afin de retrouver mes opérations comme dans l'Excel.
2. En tant qu'utilisateur, je veux qu'un libellé déjà utilisé me propose sa catégorie et son importance habituelles, afin de saisir mes courses récurrentes en deux taps.
3. En tant qu'utilisateur, je veux taper un calcul dans le montant (11,9 × 2 ou 25 − 7,9), afin de ne plus calculer de tête, comme je le faisais avec les formules de l'Excel.
4. En tant qu'utilisateur, je veux choisir l'importance d'une dépense depuis la saisie rapide, pré-remplie avec mon dernier choix pour cette catégorie, afin de la qualifier sans effort.
5. En tant qu'utilisateur, je veux un bouton « Plus d'options » qui ouvre l'écran complet sans perdre ce que j'ai déjà saisi, afin de compléter une opération particulière.
6. En tant qu'utilisateur, je veux choisir le compte, la date d'opération, la date banque, le libellé, le statut, la catégorie, l'importance et la case Hors bilan, afin de saisir n'importe quelle opération de mon relevé.
7. En tant qu'utilisateur, je veux que la date banque soit pré-remplie avec la date d'opération et modifiable, parce qu'elle diffère dans plus de la moitié de mes opérations.
8. En tant qu'utilisateur, je veux toucher une opération dans une liste pour l'ouvrir et la modifier, afin de corriger une erreur.
9. En tant qu'utilisateur, je veux supprimer une opération après confirmation, afin d'effacer un doublon.
10. En tant qu'utilisateur, je veux pointer ou dépointer une opération d'un tap sur sa pastille de statut, afin de garder le pointage rapide de la V1.
11. En tant qu'utilisateur, je veux que modifier ou supprimer un mouvement entre comptes, ou un fantôme et sa contrepartie, agisse sur les deux écritures liées, afin qu'elles ne se désynchronisent jamais.

### Répartition
12. En tant qu'utilisateur, je veux répartir un montant sur autant de parts que je veux, en euros ou en pourcentage, afin de ventiler un achat mixte.
13. En tant qu'utilisateur, je veux voir le reste à répartir en direct et ne pouvoir enregistrer que lorsque le total tombe juste, afin d'éviter les erreurs de la colonne « Vérif » de l'Excel.
14. En tant qu'utilisateur, je veux un raccourci « Partager à N » qui calcule ma part (montant ÷ N) et pré-remplit le reste en Avancé, afin de saisir un resto partagé en une action, comme 9 répartitions sur 12 dans l'Excel.
15. En tant qu'utilisateur, je veux changer la catégorie du reste (Cadeaux si j'invite), afin de couvrir le cas où je ne serai pas remboursé.
16. En tant qu'utilisateur, je veux qu'une seule importance s'applique à toute l'opération répartie, afin de rester simple.

### Statut Fantôme et contrepartie
17. En tant qu'utilisateur, je veux saisir une opération au statut Fantôme, qui apparaît au bilan comptable sans modifier aucun solde, afin de voir une charge réelle qui ne passe pas par mon compte (impôt à la source, part salariale des tickets resto).
18. En tant qu'utilisateur, je veux qu'un fantôme apparaisse grisé dans les listes et ne soit jamais proposé au pointage, afin de ne pas le confondre avec un vrai flux.
19. En tant qu'utilisateur, je veux que NoMie me propose une contrepartie quand je crée un fantôme (impôt −250 € en Impôts et recette fantôme +250 € en Salaire), afin que mon bilan montre le salaire avant impôt sans compter l'impôt deux fois.
20. En tant qu'utilisateur, je veux saisir en fantôme, dans sa vraie catégorie et sans contrepartie, une dépense que quelqu'un a payée pour moi, afin qu'elle compte dans ma consommation sans toucher à mon solde.

### Hors bilan et avances
21. En tant qu'utilisateur, je veux une case Hors bilan qui retire une opération du bilan comptable tout en la gardant dans mes soldes, afin de distinguer un vrai flux bancaire d'une vraie dépense.
22. En tant qu'utilisateur, je veux que les mouvements entre comptes soient automatiquement hors bilan, des deux côtés, afin qu'un virement vers mon Livret A ne compte plus comme une dépense.
23. En tant qu'utilisateur, je veux qu'Avancé soit une catégorie utilisable sur une opération entière ou sur une part, toujours hors bilan, afin de retrouver mon « Total (hors Avancé) » de l'Excel.
24. En tant qu'utilisateur, je veux préciser si une avance est réglée ailleurs (Tricount) ou en attente de remboursement, afin de ne suivre que ce qui doit l'être.
25. En tant qu'utilisateur, je veux qu'une note de frais avancée pour mon employeur (train, visa) soit une avance en attente, afin qu'elle ne gonfle ni mes dépenses ni mes recettes.
26. En tant qu'utilisateur, je veux voir mes avances en attente (opérations et parts) avec leur montant et leur date, afin de savoir qui me doit quoi.
27. En tant qu'utilisateur, je veux qu'un bouton Remboursé enregistre la recette reçue (compte, date, montant modifiables), reliée à l'avance et hors bilan, afin qu'un remboursement ne compte plus comme un revenu.
28. En tant qu'utilisateur, je veux voir au bilan un bloc Hors bilan qui totalise avances, remboursements et mouvements entre comptes, afin de garder ces flux visibles sans les mélanger aux dépenses.

### Importance
29. En tant qu'utilisateur, je veux classer chaque dépense en Essentiel, Secondaire important, Secondaire superflu ou Exceptionnel, indépendamment de sa catégorie, afin de distinguer les courses de la semaine d'un paquet de gâteaux.
30. En tant qu'utilisateur, je veux voir la répartition par importance des dépenses du mois et de l'année, afin de savoir où je peux agir.
31. En tant qu'utilisateur, je veux fixer un budget mensuel sur un niveau d'importance (150 € de Secondaire superflu), en plus des budgets par catégorie, afin de cadrer mes dépenses de confort.

### Bilan du mois (Accueil)
32. En tant qu'utilisateur, je veux en haut de l'Accueil une section Trésorerie : pour chaque compte, solde de fin du mois précédent, solde réel et solde pointé, plus le total, afin de retrouver l'en-tête de mes feuilles mensuelles Excel.
33. En tant qu'utilisateur, je veux voir l'épargne versée du mois (virements vers mes comptes épargne moins les retraits qui en sortent), afin de suivre mon équilibre épargne.
34. En tant qu'utilisateur, je veux marquer un compte comme compte épargne, afin que l'épargne versée se calcule toute seule.
35. En tant qu'utilisateur, je veux sous la trésorerie une section Comptable : dépenses et recettes du mois au sens du bilan, fantômes compris et hors bilan exclus, afin de voir ce que j'ai vraiment dépensé.
36. En tant qu'utilisateur, je veux comparer mes dépenses cumulées du 1er au jour J à la moyenne des 3 mois précédents au même jour, au total, par catégorie et par importance, afin de savoir si je dépense plus ou moins que d'habitude.
37. En tant qu'utilisateur, je veux que cette comparaison soit formulée sans jugement (« 420 € au 14, contre 510 € en moyenne à cette date »), afin qu'elle reste rassurante.

### Bilan annuel
38. En tant qu'utilisateur, je veux en haut du Bilan annuel une section Trésorerie avec les soldes réel et pointé par compte et au total, afin de retrouver le haut de ma feuille Bilan.
39. En tant qu'utilisateur, je veux que la section Comptable s'ouvre sur 3 chiffres (dépenses, recettes, moyenne mensuelle des dépenses), afin d'avoir la synthèse d'un coup d'œil.
40. En tant qu'utilisateur, je veux la répartition par importance de l'année, afin de voir la part de superflu.
41. En tant qu'utilisateur, je veux les dépenses par catégorie sous forme de liste (principales catégories + « Autres »), avec total et moyenne mensuelle, et le détail mois par mois au tap, afin de ne plus lire de tableau à 12 colonnes.
42. En tant qu'utilisateur, je veux garder les budgets prévus / réalisés quand j'en ai, et un bloc Hors bilan, afin de ne rien perdre d'utile.

### Prévisions, récurrences et test
43. En tant qu'utilisateur, je veux qu'une prévision passe automatiquement en Non pointé le jour de sa date, afin de pouvoir la pointer comme une opération normale.
44. En tant que développeur, je veux, dans l'app de développement uniquement, avancer la date de l'app de N jours (récurrences, prévisions, notifications, mois en cours), afin de tester les récurrences sans attendre.
45. En tant que développeur, je veux un bandeau permanent qui signale le mode date simulée, afin de ne jamais confondre test et réalité.
46. En tant que développeur, je veux que « Revenir à aujourd'hui » annule tout ce qui s'est passé pendant le test, afin de pouvoir le rejouer.

### Divers
47. En tant qu'utilisateur, je veux trouver la catégorie Internet/téléphone dans la liste par défaut, comme dans le Bilan de l'Excel.
48. En tant qu'utilisateur, je veux que l'export CSV et la sauvegarde contiennent les nouvelles informations (fantôme, hors bilan, importance, libellé, avance, compte épargne), afin de ne rien perdre.

## Implementation Decisions

### Principe directeur : deux suivis

Chaque calcul est rangé dans **un** des deux suivis. Un nouvel indicateur doit d'abord dire à quel suivi il appartient.

| Opération | Trésorerie (soldes, épargne versée) | Comptable (bilan, importance, comparaison, budgets) |
|---|---|---|
| Normale (Non pointé, Pointé) | oui | oui |
| Prévision | solde réel seulement (comme en V1) | non |
| Fantôme | **non** | **oui** |
| Hors bilan (case cochée) | oui | **non** |
| Part de répartition en catégorie Avancé | oui (via l'opération) | **non** (la part seule est exclue) |

- **Solde réel** = solde initial + Σ montants des opérations Non pointé, Pointé et Prévision. Les fantômes sont exclus. C'est la règle V1, où Fantôme remplace Flux comptable.
- **Solde pointé** = solde initial + Σ montants des opérations Pointé. Inchangé.
- **Bilan comptable d'une période.** On somme, par part (les parts d'une opération répartie, sinon l'opération entière), les montants des opérations Non pointé, Pointé ou Fantôme datées dans la période (date d'opération), en excluant :
  - les opérations Hors bilan ;
  - les parts en catégorie Avancé.

  Les dépenses sont les montants négatifs, les recettes les montants positifs. Cette règle remplace celle de la V1 (« activité réelle = Non pointé + Pointé »).
- Un fantôme ne peut pas être Hors bilan, sinon il ne compterait nulle part : l'interface l'empêche et le service le refuse.

### Statuts

- Valeurs : `non_pointe`, `pointe`, `prevision`, `fantome`. **`flux_comptable` disparaît**, et Fantôme en reprend la sémantique côté solde : dans l'Excel, Flux comptable avait déjà cet effet et n'a jamais été utilisé.
- Le pointage reste une bascule `non_pointe ↔ pointe` uniquement. Prévision et Fantôme ne se pointent pas, et un fantôme n'apparaît jamais dans « À pointer ».
- **Prévision → Non pointé.** Une prévision dont la date d'opération est ≤ aujourd'hui passe en Non pointé. Le passage se fait dans le service, au même moment que la génération des récurrences : au lancement, au retour au premier plan et au changement de date simulée. Cette réconciliation est idempotente.

### Modèle de données

La V2 démarre sur une base vide (voir « ADR à écrire »). Le schéma peut donc être réécrit proprement plutôt qu'empilé en migrations de colonnes.

- **Compte** : ajout de `est_epargne` (booléen, faux par défaut), modifiable dans la feuille du compte.
- **Catégorie** : ajout d'un rôle système optionnel (`virement` | `avance`), qui remplace la détection par nom (`TRANSFER_CATEGORY_NAME`). Avancé et Mouvement inter-compte portent ce rôle et ne peuvent être ni supprimés ni masqués ; ils restent renommables. Ajout de « Internet/téléphone » (dépense) aux catégories par défaut.
- **Opération**, ajouts :
  - `importance` : `essentiel` | `secondaire_important` | `secondaire_superflu` | `exceptionnel`. Obligatoire sur une dépense non hors bilan, nulle sinon.
  - `hors_bilan` (booléen).
  - `contrepartie_id` : lien symétrique entre un fantôme et sa contrepartie, sur le modèle de `mirror_transaction_id`.
  - `type_avance` : `reglee_ailleurs` | `en_attente`, nul si l'opération n'est pas une avance.
  - `rembourse_par_id` : lien vers la recette de remboursement.
  - Le champ commentaire devient le **libellé** dans l'interface ; le nom en base peut rester.
- **Part de répartition** : la part porte sa catégorie et son montant signé, comme en V1. Le booléen `advanced` est remplacé par la catégorie Avancé plus `type_avance` et `rembourse_par_id` sur la part. Une part n'a pas d'importance propre.
- **Budget** : porte soit une catégorie, soit un niveau d'importance (exactement l'un des deux), avec unicité de chacun. Report du reliquat inchangé.
- **Format de sauvegarde** : version 2. Une sauvegarde V1 est refusée avec un message clair, puisqu'on ne migre pas. L'export CSV ajoute les colonnes statut, importance, hors bilan, libellé, avance et compte épargne.

### Règles de gestion

- **Hors bilan automatique.**
  - Une opération en catégorie Avancé est hors bilan, de même que les deux écritures d'un mouvement entre comptes ; la case est alors cochée et verrouillée.
  - Une part Avancé est exclue du bilan, le reste de l'opération y compte.
  - Sur toute autre opération, la case est libre.
- **Mouvement entre comptes** : comportement V1 (écriture miroir créée en une action). Modifier ou supprimer l'une agit sur l'autre (montant opposé, même date). Une telle opération n'est pas répartissable.
- **Contrepartie de fantôme.**
  - À l'enregistrement d'un fantôme, l'écran propose « Ajouter la contrepartie », une bascule activée par défaut si la catégorie est Impôts, désactivée sinon. La contrepartie reste toujours facultative.
  - La contrepartie est un fantôme sur le même compte, à la même date, de montant opposé. Sa catégorie par défaut est Salaire/Intérêts/Avantages, modifiable.
  - Les deux écritures sont liées : la modification du montant ou de la date se répercute, et la suppression supprime les deux après confirmation.
  - La recharge de la carte tickets resto reste une recette normale ; seule la part salariale retenue sur la fiche de paie est un fantôme. Ce n'est pas une règle à coder, mais c'est à refléter dans les textes d'aide.
- **Avances.**
  - Choisir Avancé (sur l'opération ou sur une part) demande le type : *réglée ailleurs* par défaut, ou *en attente*.
  - « Avances en attente » liste les opérations et parts en attente non remboursées ; c'est l'écran V1, étendu aux opérations entières.
  - **Remboursé** ouvre une feuille avec le compte (celui de l'avance par défaut), la date (aujourd'hui) et le montant (celui de l'avance), tous modifiables. Elle crée une recette en catégorie Avancé, hors bilan, Non pointé, reliée à l'avance, qui quitte alors la liste. Pas de remboursement partiel en V2.
  - « Quelqu'un a payé pour moi » n'est pas une avance : c'est un fantôme dans la vraie catégorie, sans contrepartie. Le jour où l'utilisateur rembourse, il saisit une avance réglée ailleurs.
- **Importance.**
  - Pré-remplissage : le dernier niveau utilisé pour la catégorie ; à défaut, le dernier niveau utilisé toutes catégories confondues ; à défaut, Essentiel.
  - Pas d'importance sur les recettes, ni sur les opérations hors bilan.
- **Suggestions de libellé.**
  - Le libellé est normalisé (minuscules, sans accents ni ponctuation ni espaces superflus). La saisie propose les libellés déjà utilisés, les plus fréquents puis les plus récents.
  - Choisir une suggestion pré-remplit la catégorie et l'importance de la dernière opération portant ce libellé. L'utilisateur peut toujours les changer.
- **Calculs dans le montant.**
  - Le pavé gagne `+`, `−` et `×`, avec la priorité usuelle de `×`.
  - L'expression et son résultat (arrondi au centime) sont affichés ; seul le résultat est enregistré, et un résultat ≤ 0 n'est pas enregistrable.
  - C'est une fonction pure, testée seule. Pas de division (le partage passe par « Partager à N »).
- **Partager à N.**
  - N ≥ 2, réglé par un stepper. Ma part = montant ÷ N arrondi au centime, dans la catégorie de l'opération. Le reste (montant − ma part) va dans une part Avancé de type *réglée ailleurs*.
  - Les deux parts restent ensuite modifiables comme n'importe quelle répartition.
- **Comparaison à date.**
  - Pour le mois affiché et le jour J (aujourd'hui, ou le dernier jour pour un mois passé) : on calcule les dépenses comptables cumulées du 1er au J inclus.
  - Pour chacun des 3 mois précédents, on calcule le même cumul du 1er au min(J, dernier jour du mois), puis on fait la moyenne.
  - S'il y a moins de 3 mois d'historique, la moyenne porte sur ceux qui existent ; sans aucun mois, la comparaison est masquée.
  - Le calcul se fait au total, par catégorie et par niveau d'importance.
- **Épargne versée (trésorerie).**
  - Sur le mois, on somme les mouvements entre comptes dont un côté est un compte épargne et l'autre non : les entrées vers l'épargne moins les sorties de l'épargne.
  - Les prévisions et les intérêts sont exclus.
- **Budgets.**
  - La consommation d'un budget (catégorie ou importance) suit le bilan comptable : fantômes compris, hors bilan exclus.
  - Le seuil « à surveiller » (`BUDGET_WATCH_THRESHOLD`) et le ton restent ceux de la V1.
  - La notification « point budget » couvre aussi les budgets par importance.

### Écrans

- **Saisie rapide** (bottom sheet du FAB) :
  - montant avec calculs, Dépense/Recette, libellé avec suggestions, catégories en chips, importance en chips (dépense uniquement, pré-remplie) ;
  - bouton **Plus d'options** qui transfère la saisie en cours vers l'écran complet ;
  - le compte reste « compte courant » (le plus ancien actif), modifiable seulement dans l'écran complet.
- **Écran Opération** (création et modification) : compte, date d'opération, date banque, libellé, montant, statut, catégorie, importance, Hors bilan, Répartir / Partager à N, type d'avance, compte de destination (virement), contrepartie (fantôme), et Supprimer en mode modification.
  - Aucune maquette n'existe : suivre `DESIGN.md` et le handoff (`split-row`, `bottom-sheet`, `text-input`, `switch-toggle`, chips), sans nouvelle maquette Claude Design.
  - Choisir entre plein écran et grande bottom sheet selon la densité, de façon cohérente avec Réglages et le Bilan annuel (modale plein écran).
- **Listes d'opérations** :
  - un tap sur la ligne ouvre l'écran Opération ;
  - un tap sur la `StatusPill` bascule le pointage (changement de comportement V1, validé) ;
  - un fantôme est grisé ; une opération hors bilan porte une marque discrète.
- **Accueil = bilan du mois.** Le sélecteur de mois existant (`MonthContext`) est conservé.
  - Section **Trésorerie** : le héros garde le total réel et pointé ; les cartes de compte ajoutent le solde de fin du mois précédent ; une ligne « Épargne versée » est ajoutée.
  - Section **Comptable** : dépenses et recettes du mois, répartition par importance, comparaison à date (ligne de synthèse, détail par catégorie et par importance qui se déplie au tap), bloc Hors bilan, note des prévisions (V1).
  - Puis Budgets et Dernières opérations, comme en V1.
- **Bilan annuel.**
  - Section **Trésorerie** : soldes réel et pointé par compte et au total, en fin d'année pour une année passée, aujourd'hui pour l'année en cours.
  - Section **Comptable** : synthèse (dépenses, recettes, moyenne mensuelle), répartition par importance, dépenses par catégorie (les 6 premières + « Autres », lignes total + moyenne, détail mois par mois au tap), budgets prévus / réalisés (seulement s'il y en a), bloc Hors bilan.
  - **Retirés** : la courbe et le tableau des soldes en fin de mois, le tableau des recettes par catégorie, « Opérations par compte ».
- **Budgets** : création d'un budget par catégorie ou par niveau d'importance.
- **Comptes** : case « Compte épargne » dans la feuille du compte.
- **Avances en attente** : écran V1, étendu aux opérations entières, avec la feuille Remboursé.
- **Réglages › Développement** (uniquement si `__DEV__`, absent des builds de production) : « Avancer de N jours », état courant, « Revenir à aujourd'hui ».

### Date simulée (développement)

- Le service reçoit déjà une horloge injectable (`now`). La V2 en fait une horloge applicative unique, utilisée partout où l'app lit « aujourd'hui » : service, mois courant de l'UI, planification des notifications.
- Le décalage est persisté. Entrer en simulation crée d'abord un instantané de la base, en réutilisant le mécanisme de sauvegarde existant. « Revenir à aujourd'hui » restaure cet instantané puis remet le décalage à zéro : tout ce qui a été créé ou modifié pendant le test est annulé.
- Un bandeau persistant indique « Date simulée : jj/mm/aaaa ».

### Ton et vocabulaire

Le ton ne change pas : jamais anxiogène, aucune alerte, aucun point d'exclamation, aucun rouge (`DESIGN.md`, `CONTEXT.md` §10). Les comparaisons et dépassements sont formulés comme des faits. Les textes d'interface utilisent les termes du glossaire ci-dessous.

### ADR à écrire

- **ADR 0003 — La V2 repart d'une base vide.** Elle contredit la conséquence de l'ADR 0001 (« Toute évolution de schéma passe par une migration exécutée au lancement »). Elle est justifiée par l'absence de données V1 à conserver (décision du porteur de produit). Mise en œuvre : nouveau fichier de base (ex. `nomie-v2.db`) et sauvegarde en version 2. Les migrations au lancement reprennent pour les évolutions suivantes.
- **ADR 0004 — Trésorerie et comptabilité ; Fantôme remplace Flux comptable.** Elle consigne le tableau du principe directeur.

## Testing Decisions

- **Ce qu'est un bon test** : il vérifie un comportement observable (montants affichés, soldes, listes) et jamais un détail d'implémentation. Pas de snapshot visuel.
- **Seam principal : le service de données**, testé contre une vraie base SQLite en mémoire (ADR 0001, `createTestDataService`). Toutes les règles de gestion de cette spec y sont testées :
  - le tableau trésorerie / comptable, case par case ;
  - la contrepartie et le miroir (création, modification, suppression liées) ;
  - les avances et le remboursement ;
  - le bilan comptable avec parts Avancé ;
  - l'importance par défaut ;
  - la comparaison à date (mois courts, historique de moins de 3 mois) ;
  - l'épargne versée ;
  - les budgets par importance ;
  - le passage Prévision → Non pointé ;
  - l'instantané et la restauration de la date simulée.

  L'horloge est injectée via `now`.
- **Fonctions pures testées seules** : l'évaluateur de calcul du pavé (prior art : `amountInput.test.ts`), « Partager à N » (arrondis, reste exact), la normalisation des libellés, la moyenne à date.
- **Écrans** testés via `renderWithApp` (prior art : `HomeScreen.test.tsx`, `YearReportScreen.test.tsx`, `QuickEntrySheet.test.tsx`) :
  - présence des deux sections ;
  - tap ligne → écran Opération, tap pastille → pointage ;
  - absence de l'option Développement hors `__DEV__` ;
  - textes sans formulation anxiogène, pour les copies du type `budgetCopy`.
- Les tests V1 qui reposaient sur `flux_comptable`, sur le comptage des virements dans les dépenses ou sur les sections retirées du Bilan annuel sont mis à jour pour refléter les nouvelles règles, pas supprimés en bloc.

## Out of Scope

- La reprise des données V1 (aucune migration).
- Le remboursement partiel d'une avance.
- Le rattachement d'une recette au mois suivant (« salaire pour février » reçu fin janvier).
- La courbe des soldes en fin de mois et le nombre d'opérations par compte.
- L'importance sur les recettes et par part de répartition.
- Le portage iOS, la synchronisation, le multi-devise, l'import bancaire.
- Les nouvelles maquettes Claude Design.
- La date simulée dans les builds de production.

## Further Notes

- **Découpage suggéré pour `/to-tickets`** (tranches verticales ; « ← » = bloqué par) :
  1. Base V2 et glossaire : schéma neuf, statut Fantôme, règles trésorerie / comptable dans le service, sauvegarde v2, ADR 0003-0004, mise à jour de `CONTEXT.md`.
  2. Horloge applicative, date simulée et passage Prévision → Non pointé ← 1.
  3. Écran Opération (création, modification, suppression, tap ligne / tap pastille) ← 1.
  4. Répartition et Partager à N ← 3.
  5. Avances (catégorie, types, en attente, Remboursé) et Hors bilan ← 4.
  6. Fantôme et contrepartie ← 3.
  7. Saisie rapide enrichie (libellé, suggestions, calculs, importance) ← 3.
  8. Importance : répartition et budgets par importance ← 7.
  9. Accueil en deux sections : trésorerie, épargne versée, comparaison à date, bloc Hors bilan ← 5, 6, 8.
  10. Bilan annuel en deux sections ← 9.
- **Glossaire V2**, à reporter dans `CONTEXT.md` §13 en remplaçant les entrées V1 concernées :
  - **Trésorerie** : les vrais flux bancaires ; fait les soldes.
  - **Bilan comptable** : ce qu'on a réellement dépensé ou gagné ; fait les dépenses, recettes, budgets, importance et comparaisons.
  - **Fantôme** : statut d'une écriture comptable sans flux bancaire (impôt à la source, part salariale des tickets resto, dépense payée par quelqu'un d'autre). Elle compte au bilan, pas dans les soldes. Remplace Flux comptable.
  - **Contrepartie** : fantôme de sens opposé lié à un autre fantôme, pour qu'une charge prélevée à la source ne soit pas comptée deux fois.
  - **Hors bilan** : opération de trésorerie seulement. Elle compte dans les soldes, pas au bilan.
  - **Avancé** : catégorie système, toujours hors bilan. Une avance est *réglée ailleurs* (Tricount) ou *en attente* (notes de frais comprises).
  - **Remboursement** : recette hors bilan reliée à une avance en attente.
  - **Importance** : Essentiel, Secondaire important, Secondaire superflu ou Exceptionnel ; ne concerne que les dépenses au bilan.
  - **Compte épargne** : compte dont les virements entrants et sortants font l'épargne versée.
  - **Comparaison à date** : dépenses cumulées du 1er au jour J, comparées à la moyenne des 3 mois précédents au même jour.
  - **Date simulée** : décalage de l'horloge de l'app, réservé au développement.
- **Ordres de grandeur réels** (Excel 2025, pour des données de test réalistes) :
  - environ 460 opérations sur 7 mois et 3 à 4 comptes (courant, Livret A, EdenRed, Revolut) ;
  - 12 répartitions, presque toutes « ma part + le reste avancé » ;
  - 10 paires de mouvements entre comptes ;
  - un salaire mensuel d'environ 2 150 € ;
  - un loyer de 560 €, un crédit de 626 €.
