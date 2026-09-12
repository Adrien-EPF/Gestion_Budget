# Contexte projet — NoMie

Ce document résume le cahier des charges (`Cahier_des_charges_NoMie.pdf`) pour servir de brief aux prochaines étapes : design (Claude Design) puis développement. Il complète le [README.md](README.md).

## 1. Vision & contexte

Le suivi budgétaire d'Adrien repose aujourd'hui sur un fichier Excel volumineux et fragile (formules géantes, feuilles à rallonge, utilisable uniquement sur ordinateur). NoMie doit le remplacer par une application mobile utilisable au quotidien depuis le téléphone, en conservant toute la richesse de suivi de l'Excel (comptes multiples, catégorisation fine, statuts, transactions divisées) tout en étant bien plus rapide et agréable à utiliser.

Conçue au départ pour un usage personnel, l'app doit pouvoir être utilisée de façon totalement indépendante par quelques proches (chacun avec ses propres comptes et données, sans partage entre utilisateurs).

**Principe directeur : l'application ne doit jamais être anxiogène.** Ce principe guide en particulier le ton des notifications et la charte graphique (pas de rouge alarmiste, pas de reproches, pas de points d'exclamation).

## 2. Objectifs & périmètre

- Pas de découpage en versions (pas de MVP puis itérations) : toutes les fonctionnalités de la section 5 font partie d'un seul périmètre à construire dès le départ.
- Deux exigences à concilier : parité fonctionnelle avec l'Excel, et ambition sur l'expérience mobile (axe de différenciation principal).
- **Hors périmètre** (à confirmer si besoin) : partage/collaboration temps réel entre utilisateurs, synchronisation bancaire automatique, multi-devise.

## 3. Utilisateurs

- Utilisateur principal : Adrien (suivi personnel quotidien).
- Utilisateurs secondaires : quelques proches, chacun avec un espace totalement indépendant.

Cas d'usage clés : saisie rapide d'une opération, pointage/rapprochement bancaire, suivi des soldes (réel et pointé), visualisation par catégorie/mois/année, anticipation via le statut Prévision, gestion des transactions divisées et des avances.

## 4. Analyse de l'existant (fichier Excel)

- 14 feuilles : `Bilan` (tableau de bord annuel), 12 feuilles mensuelles, `Data` (listes de référence).
- Chaque feuille mensuelle suit 3 comptes : Compte courant, Livret A, EdenRed.
- Statuts (4) : Non Pointé, Pointé, Prévision, Flux comptable.
- Catégories (27, liste commune) : Alimentation/Entretien essentiel, Crédit, Voiture, Transports autres, Loisir, Restaurant, Culture, Cadeaux, Habillement, Santé, Services, Sorties/bières, Logement, Impôts, Assurances, Cotisations/inscriptions, Frais, Don, Retrait, Virement, Mouvement inter-compte, Salaire/Intérêts/Avantages, Chèque, Avancé, Aide Etat, Vacances, Autres.
- Split limité à 2 sous-catégories, avec colonne "Vérif" de contrôle a posteriori.
- Sur EdenRed uniquement, le reste d'un split est auto-étiqueté "Avancé".

**Points de vigilance identifiés** (à ne pas reproduire) :
- Formules `SUMIF`/`SUMIFS` très longues et fragiles sur des plages de taille variable → remplacer par une table unique de transactions + dimensions (comptes, catégories, statuts, mois).
- Incohérence sur la feuille Janvier : le solde réel total omettait EdenRed.
- L'auto-étiquetage "Avancé" n'était appliqué que sur EdenRed dans l'Excel — dans NoMie, il doit fonctionner sur n'importe quel compte.

## 5. Cahier des charges fonctionnel

1. **Tableau de bord** : vue des comptes (solde pointé + solde réel/prévisionnel), résumé du mois (dépenses, recettes, budgets avec barre de progression).
2. **Comptes** : créer/renommer/archiver/supprimer librement, solde initial, nombre illimité, aucun type imposé.
3. **Catégories** : 27 catégories pré-chargées, personnalisables (nom, icône/couleur, visibilité, ordre).
4. **Saisie de transaction** : compte, date opération, date banque (optionnelle), commentaire, montant, catégorie, statut ; split illimité en montant ou %, avec contrôle en direct ; pointage rapide depuis la liste.
5. **Mouvements inter-comptes** : catégorie dédiée créant automatiquement la transaction miroir sur le compte de destination.
6. **Avances ("Avancé")** : portion de split marquable comme avance, quel que soit le compte ; vue dédiée des avances en attente.
7. **Budgets prévisionnels** : par catégorie et par mois, report du reliquat activable/désactivable indépendamment par budget, suivi visuel non alarmiste même en dépassement.
8. **Transactions récurrentes** : règle (compte, montant, catégorie, fréquence, date de référence), activation explicite en mode automatique ; occurrences modifiables/supprimables individuellement sans affecter la règle.
9. **Tableau de bord annuel** : détail dépenses/recettes par catégorie et par mois (+ cumul annuel), nombre d'opérations par compte/mois, soldes pointés et réels sur toute la période.
10. **Visualisations** : répartition des dépenses par catégorie, évolution du solde dans le temps, comparaison budget prévisionnel vs réalisé.
11. **Notifications** (ton toujours détendu, jamais anxiogène) : rappel amical de pointage, information budget présentée comme donnée factuelle plutôt qu'alerte de dépassement.
12. **Export / sauvegarde** : fichier de sauvegarde technique réimportable + export Excel/CSV lisible, proposés séparément.
13. **Accès** : application locale, sans compte ni connexion internet requise.

## 6. Modèle de données (simplifié vs. Excel)

Au lieu de 12 feuilles mensuelles, chaque compte tient un registre continu de transactions (plus de report manuel de solde d'un mois à l'autre).

- **Compte** : id, nom, solde initial, date de création, actif/archivé.
- **Catégorie** : id, nom, sens (dépense / recette / les deux), icône et/ou couleur, visible/masquée, ordre. Les 27 catégories Excel sont pré-chargées comme valeurs par défaut.
- **Transaction** : id, compte, date opération, date banque (optionnelle), commentaire, montant, catégorie principale, statut ; répartition = liste illimitée de sous-lignes `{montant ou %, catégorie}` avec contrôle continu que la somme égale le montant total ; lien optionnel vers une règle de récurrence d'origine ; lien automatique vers la transaction miroir (mouvement inter-compte).
- **Règle de transaction récurrente** : id, compte, montant, catégorie, fréquence (mensuelle/hebdomadaire/annuelle), date de référence, mode automatique (opt-in explicite), actif/inactif, date de fin optionnelle.
- **Budget prévisionnel** : id, catégorie, montant plafond, période (mensuelle), report du reliquat activable/désactivable par budget.

## 7. Règles de gestion & calculs

- **Solde pointé** = somme des transactions au statut Pointé (confirmé par la banque).
- **Solde réel/prévisionnel** = somme de toutes les transactions sauf Flux comptable (donc y compris les Prévisions).
- **Split** : répartition illimitée, en montant fixe ou en pourcentage ; la somme doit toujours égaler 100% ou le montant total, contrôlée en direct (pas a posteriori comme dans l'Excel).
- **Avances** : portion non affectée d'un split marquable "Avancé" sur n'importe quel compte.
- **Mouvements inter-comptes** : transaction miroir créée automatiquement dès la saisie (une seule action pour les deux écritures liées) — rend inutile toute vérification de cohérence a posteriori.
- **Budgets** : définis par catégorie et par mois ; report du reliquat configurable indépendamment pour chaque budget.
- **Récurrence** : génération automatique uniquement si explicitement activée par l'utilisateur pour cette règle ; chaque occurrence reste annulable/supprimable individuellement.
- **Notifications** : rappel de pointage (pratique, non injonctif) et information budget (factuelle, non alarmiste) ; une alerte de solde bas n'est pas retenue pour l'instant.

## 8. Améliorations vs. l'Excel

Graphiques/visualisations, notifications/rappels, budgets prévisionnels par catégorie, transactions récurrentes automatiques, et une interface intuitive posée comme objectif fort en soi (pas seulement un "plus").

## 9. Choix techniques

- Application mobile, **Android en priorité**, portage iOS envisagé ensuite (à garder en tête dans les choix techniques).
- **Stockage 100% local** sur l'appareil : pas de compte, pas de serveur. Export/sauvegarde manuel prévu (pas de sync cloud automatique).
- Comptes et catégories entièrement personnalisables, sans limite de nombre.
- Export/sauvegarde : deux mécanismes distincts, proposés séparément — (1) fichier de sauvegarde technique réimportable pour restauration complète, (2) export Excel/CSV lisible.
- **Framework technique non encore tranché** — dépend du fichier de design qui sera produit via Claude Design, à reproduire ensuite fidèlement en code.

## 10. Charte graphique

- Direction : style **sobre et épuré**.
- La charte détaillée (palette, typographies, composants, écrans) sera produite séparément via Claude Design, puis reproduite fidèlement en code.
- Nom **NoMie** : clin d'œil à « économie », registre fun et décontracté, sans caractère officiel.
- Ton de marque : détendu et bienveillant, jamais anxiogène. À bannir : "Attention !", "Vous avez dépassé…", points d'exclamation, rouge alarmant, icônes de danger. Préférer par exemple *"Tu as dépensé un peu plus en Restaurant ce mois-ci qu'en général"* à *"Attention, vous avez dépassé votre budget Restaurant !"*.

## 11. Contraintes non-fonctionnelles

- **Verrouillage obligatoire** de l'app par code PIN ou biométrie dès la première version.
- **Fonctionnement hors-ligne** complet.
- **Pérennité des données** : export/sauvegarde facilement accessible pour limiter le risque de perte (téléphone cassé/perdu/changé), les données étant uniquement locales.
- **Performance** : rester fluide même avec plusieurs années d'historique (l'Excel montre déjà des signes de lourdeur après un an).
- À enrichir si besoin : accessibilité, langue de l'application, gestion des erreurs de saisie.

## 12. Roadmap & priorisation

Pas de découpage en versions successives (pas de MVP/V2/V3) : l'ensemble des fonctionnalités de la section 5 (y compris les améliorations de la section 8) constitue un périmètre unique. Un ordre de construction technique (ex. modèle de données et saisie avant les graphiques) reste possible, mais relève d'un choix d'implémentation, pas d'un découpage fonctionnel visible pour l'utilisateur.

## 13. Glossaire

- **Pointé** : transaction rapprochée avec le relevé bancaire (confirmée).
- **Non Pointé** : transaction saisie mais pas encore confirmée par la banque.
- **Prévision** : dépense/recette anticipée, pas encore réalisée.
- **Flux comptable** : mouvement technique (ex. virement interne) neutralisé dans les totaux pour éviter les doublons.
- **Avancé** : montant avancé par l'utilisateur, à se faire rembourser plus tard.
- **Split / transaction divisée** : transaction dont le montant est réparti sur plusieurs catégories.

## Points restant à trancher

- Framework technique de l'application (dépend du fichier de design Claude Design).
- Éventuel enrichissement des contraintes non-fonctionnelles (accessibilité, langue, gestion des erreurs de saisie).
- Réintégration éventuelle d'une alerte de solde bas (non retenue pour l'instant), à traiter avec le même principe de ton détendu si elle est ajoutée plus tard.

---

Document source : `Cahier_des_charges_NoMie.pdf` (statut : consolidé avec Adrien, sert de brief pour la phase de design Claude Design puis de développement).
