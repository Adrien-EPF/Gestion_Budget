# NoMie

Application mobile de gestion budgétaire personnelle — un clin d'œil à « économie ».

NoMie remplace un suivi budgétaire fait sur un fichier Excel volumineux et fragile par une application mobile pensée pour être utilisée au quotidien : saisir une dépense en quelques secondes, pointer ses opérations, suivre ses soldes et sa répartition par catégorie, sans ouvrir un tableur.

## Philosophie

L'application ne doit **jamais être anxiogène**. Le rapport à l'argent qu'elle propose reste détendu et bienveillant plutôt que culpabilisant — y compris dans ses notifications, ses messages et son vocabulaire (pas d'alertes rouges, pas de reproches, pas de points d'exclamation anxiogènes).

Chaque utilisateur (Adrien, puis quelques proches) dispose de son propre espace totalement indépendant : ses comptes, ses catégories, ses données, sans partage ni synchronisation entre utilisateurs.

## Fonctionnalités principales

Le projet est construit comme un produit complet dès le départ (pas de découpage MVP / V2 / V3). Périmètre fonctionnel :

- **Comptes** multiples, illimités et 100% personnalisables (créer, renommer, archiver, supprimer).
- **Catégories** : les 27 catégories de l'Excel existant, pré-chargées puis personnalisables (icône, couleur, ordre).
- **Transactions** avec 4 statuts (Non Pointé, Pointé, Prévision, Flux comptable), pointage rapide, et **répartition (split)** illimitée entre sous-catégories, en montant ou en pourcentage.
- **Mouvements inter-comptes** liés automatiquement (transaction miroir créée en une seule saisie).
- **Avances** ("Avancé") : suivi des montants avancés à se faire rembourser, sur n'importe quel compte.
- **Budgets prévisionnels** par catégorie, avec report du reliquat configurable, suivi visuel non alarmiste.
- **Transactions récurrentes** activables explicitement (loyer, salaire, abonnements...).
- **Tableau de bord annuel** : soldes, dépenses/recettes par catégorie et par mois, nombre d'opérations.
- **Visualisations graphiques** : répartition par catégorie, évolution du solde, budget prévu vs réalisé.
- **Notifications** bienveillantes (rappel de pointage, information budget — jamais une alerte de dépassement).
- **Export / sauvegarde** : fichier technique réimportable + export Excel/CSV lisible, séparément.

Le détail complet des règles de gestion et du modèle de données est dans [CONTEXT.md](CONTEXT.md).

## Choix techniques

- **Plateforme** : application mobile, Android en priorité (portage iOS envisagé ensuite).
- **Stockage** : 100% local sur l'appareil, aucun compte ni serveur ; sauvegarde/export manuel des données.
- **Sécurité d'accès** : verrouillage obligatoire par code PIN ou biométrie à l'ouverture de l'app.
- **Fonctionnement hors-ligne** : l'application doit être pleinement utilisable sans connexion internet.
- Le framework technique reste à trancher (dépendra du fichier de design produit via Claude Design).

## Design

Direction retenue : style sobre et épuré. La charte graphique détaillée (palette, typographies, composants, écrans) sera produite via Claude Design puis reproduite fidèlement dans l'application.

## Statut du projet

Phase actuelle : cahier des charges consolidé, en attente de la phase de design (Claude Design) puis de développement. Voir [CONTEXT.md](CONTEXT.md) pour le brief complet destiné aux prochaines étapes.
