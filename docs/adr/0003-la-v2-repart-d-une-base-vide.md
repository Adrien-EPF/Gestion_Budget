# La V2 repart d'une base vide

Statut : accepté (décision du porteur de produit, spec V2, issue #40).

## Contexte

L'ADR 0001 pose que « toute évolution de schéma passe par une migration exécutée au lancement de l'app ». La V2 change profondément le modèle : statut Fantôme à la place de Flux comptable, rôles système sur les catégories, importance, hors bilan, contreparties, avances typées, budgets par importance. Il n'y a aucune donnée V1 à conserver : l'utilisateur tenait ses comptes dans l'Excel.

## Décision

- La V2 démarre sur **une base vide**, dans un **nouveau fichier de base** (`nomie-v2.db`). La base V1 (`nomie.db`) n'est ni lue ni migrée.
- Le schéma est donc **réécrit proprement** plutôt qu'empilé en migrations de colonnes : `COLUMN_MIGRATIONS` repart vide.
- Le format de sauvegarde passe en **version 2**. Une sauvegarde V1 est **refusée avec un message clair** : on ne la convertit pas.
- Les migrations au lancement **reprennent** pour toute évolution de schéma postérieure à cette V2.

## Conséquences

- Cette décision **déroge** à la conséquence de l'ADR 0001 sur les migrations, pour ce seul passage V1 → V2.
- Un appareil qui aurait des données V1 ne les retrouve pas dans la V2 ; elles restent dans l'ancien fichier de base, intact.
- Aucun code de migration V1 → V2 à écrire ni à tester.
