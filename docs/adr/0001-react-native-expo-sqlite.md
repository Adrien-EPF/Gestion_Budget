# React Native + Expo avec stockage local Expo SQLite

Statut : accepté (décision du porteur de produit, issue #3).

## Contexte

NoMie remplace un classeur Excel de suivi budgétaire. Contraintes issues de `CONTEXT.md` : application mobile, Android en priorité avec portage iOS envisagé ensuite ; stockage 100 % local (pas de compte, pas de serveur, fonctionnement hors-ligne complet) ; plusieurs années d'historique à garder fluides ; export/sauvegarde manuels.

## Décision

- **React Native + Expo** pour l'application : une seule base de code JavaScript/TypeScript pour Android maintenant et iOS plus tard.
- **Expo SQLite** comme unique stockage : base locale sur l'appareil, requêtes d'agrégation côté base plutôt qu'en mémoire dans l'UI.
- **Un service de données unique** est le seul point d'accès à SQLite ; les écrans ne lisent ni n'écrivent jamais la base directement. Il porte toutes les règles de gestion (soldes, split, mouvement miroir, report de budget, récurrences) et sert d'unique seam de test, contre une vraie base SQLite en mémoire (pas de mock).

## Conséquences

- Les données n'existent que sur l'appareil : la sauvegarde/export (hors périmètre de la première version) devient le seul filet contre la perte ou le changement de téléphone.
- Pas de synchronisation multi-appareils ni de partage, cohérent avec le périmètre produit (`CONTEXT.md` §2).
- Le portage iOS reste à faire mais ne demande pas de réécriture du service de données ni des écrans.
- Toute évolution de schéma passe par une migration exécutée au lancement de l'app.
