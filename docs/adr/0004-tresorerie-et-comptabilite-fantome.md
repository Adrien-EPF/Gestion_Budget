# Trésorerie et comptabilité ; Fantôme remplace Flux comptable

Statut : accepté (décision du porteur de produit, spec V2, issue #40).

## Contexte

La validation de la V1 a posé : « Toujours bien distinguer le suivi trésorerie du suivi comptable. » L'Excel séparait les deux sans le dire : le solde excluait les lignes « Flux comptable », et le bilan affichait un « Total (hors Avancé) ». La V1 les confondait : un virement vers le Livret A comptait comme une dépense, un remboursement d'avance gonflait les recettes, et un impôt prélevé à la source ne se voyait nulle part.

## Décision

Chaque calcul est rangé dans **un seul** des deux suivis. Un nouvel indicateur doit d'abord dire auquel il appartient.

| Opération | Trésorerie (soldes, épargne versée) | Comptable (bilan, importance, comparaison, budgets) |
|---|---|---|
| Normale (Non pointé, Pointé) | oui | oui |
| Prévision | solde réel seulement | non |
| Fantôme | **non** | **oui** |
| Hors bilan (case cochée) | oui | **non** |
| Part de répartition en catégorie Avancé | oui (via l'opération) | **non** (la part seule est exclue) |

- **Solde réel** = solde initial + Σ des opérations Non pointé, Pointé et Prévision. Les Fantômes sont exclus.
- **Solde pointé** = solde initial + Σ des opérations Pointé.
- **Bilan comptable** d'une période : somme, par part (les parts d'une opération répartie, sinon l'opération entière), des montants Non pointé, Pointé ou Fantôme datés dans la période, hors opérations Hors bilan et hors parts Avancé.
- Le statut `flux_comptable` **disparaît**. **Fantôme** (`fantome`) en reprend la sémantique côté solde ; il ajoute le fait de compter au bilan.
- Deux marqueurs symétriques : **Fantôme** (statut) = comptable seulement ; **Hors bilan** (case) = trésorerie seulement. Un Fantôme ne peut pas être Hors bilan, sinon il ne compterait nulle part.
- Les avances, leurs remboursements et les mouvements entre comptes sont automatiquement Hors bilan. Ces catégories sont repérées par un **rôle système** (`virement`, `avance`) et non plus par leur nom.

## Conséquences

- Le service de données porte cette règle une seule fois, dans la définition des « parts du bilan » ; le bilan du mois, le Bilan annuel et la consommation des budgets la partagent.
- Les tests V1 reposant sur `flux_comptable` ou sur le comptage des virements dans les dépenses sont mis à jour, pas supprimés.
