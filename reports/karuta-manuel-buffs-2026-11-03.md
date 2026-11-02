# OMBRE — Karuta : tests DPS manuels avec et sans buffs

**3 novembre 2026 — 12 PA, Écaflip Karuta de référence, Sceptre du Roi Joueur, Dofus Turquoise, une cible à 0 % de résistances, critiques moyens.**

## Scénarios comparés

- **Avec buffs autorisés** : les 17 actions utilisables du catalogue équipé (16 sorts et l'arme) peuvent être lancées. Comprend Yams, Kraps, Griffe Joueuse, Baraka, Tout ou Rien, Rekop et Griffe Invocatrice.
- **Sans sorts préparatoires** : mêmes attaques, cartes et buffs liés aux attaques, mais pas de sort purement préparatoire comme Griffe Invocatrice. Dans les meilleurs plans testés, cette restriction ne change pas le score.
- **Sans buffs offensifs de sorts** : exclut les sorts qui ajoutent un boost offensif, une baisse des résistances critiques ou un bonus de combinaison de cartes. Le Dofus Turquoise reste équipé. Il ne s'agit pas d'une suppression artificielle de la Puissance du build.

Six sorts équipés à effet non simulé ne participent pas au calcul : Redistribution, Bond du Félin, Prédation, Roulette, Roue de la Fortune et Neuf Vies. Les autres variantes des 22 paires restent non équipées.

## Totaux de dégâts vérifiés par rejeu manuel

| Durée | Meilleur avec buffs autorisés | Sans préparation | Sans buffs offensifs de sorts | Écart |
|---:|---:|---:|---:|---:|
| 1 tour | **3 861,1** | 3 861,1 | 3 861,1 | 0 |
| 3 tours | **12 567,8** | 12 567,8 | 11 944,9 | +622,9 |
| 10 tours | **44 800,8** | 44 800,8 | 40 660,3 | +4 140,5 |
| 15 tours | **68 290,0** | 68 290,0 | 61 171,3 | +7 118,7 |
| 100 tours | **429 286,1** | 429 286,1 | 409 858,3 | **+19 427,8** |

Le score « avec buffs autorisés » sur 1 tour utilise lui-même une rotation sans buff : les bonus ont besoin de temps pour devenir rentables. Le plan de 100 tours avec buffs applique les 15 tours manuels ci-dessous, puis une optimisation à partir du 16e tour, le tout contrôlé par rejeu manuel intégral.

## Meilleure ouverture manuelle testée avec buffs (15 tours)

| Tour | Séquence |
|---:|---|
| 1 | Yams → Griffe Joueuse → Sceptre du Roi Joueur ×2 |
| 2 | Kraps → Infortune → Pile ou Face ×2 → Yams |
| 3 | Tout ou Rien → Sceptre du Roi Joueur → Rekop → Yams |
| 4 | Griffe Joueuse → Kraps → Infortune |
| 5 | Griffe Joueuse → Pile ou Face ×2 → Sceptre du Roi Joueur ×2 |
| 6 | Kraps → Baraka → Sceptre du Roi Joueur ×2 |
| 7 | Griffe Joueuse → Pile ou Face ×2 → Sceptre du Roi Joueur ×2 |
| 8 | Griffe Joueuse → Sceptre du Roi Joueur → Infortune |
| 9 | Kraps → Griffe Joueuse → Pile ou Face ×2 → Sceptre du Roi Joueur |
| 10 | Pile ou Face → Sceptre du Roi Joueur ×2 → Infortune |
| 11 | Griffe Joueuse → Kraps → Infortune |
| 12 | Griffe Joueuse → Sceptre du Roi Joueur → Infortune |
| 13 | Yams → Pile ou Face ×2 → Yams → Sceptre du Roi Joueur ×2 |
| 14 | Kraps ×2 → Sceptre du Roi Joueur ×2 |
| 15 | Pile ou Face → Sceptre du Roi Joueur ×2 → Infortune |

La recherche a examiné **33 082 mutations locales**, dont **7 230 configurations jouables**, en testant toutes les actions simulées par remplacement, insertion, retrait et permutation dans les 15 tours. Treize améliorations ont mené au total de **68 290**.

| Durée | Ancienne rotation | Nouvelle rotation | Gain |
|---:|---:|---:|---:|
| 3 tours | 12 146,8 | **12 567,8** | +421,0 |
| 10 tours | 44 177,2 | **44 800,8** | +623,6 |
| 15 tours | 67 004,4 | **68 290,0** | +1 285,6 |
| 100 tours | 427 993,4 | **429 286,1** | **+1 292,7** |

Le nouveau plan est enregistré dans OMBRE ; il n'est appliqué automatiquement que lorsque les caractéristiques, les variantes, les PA, les cartes, les buffs et les relances correspondent encore au profil de référence.

## Meilleure rotation testée sans buffs offensifs

**À chaque tour pendant 100 tours :** Pile ou Face → Sceptre du Roi Joueur ×2 → Infortune.

Les remboursements de PA de Pile ou Face sont bien appliqués : **12 PA nets** par tour. La rotation est reproductible sur 100 tours en manuel et atteint **409 858,3 dégâts**, contre **372 397,5** pour la rotation plus simple Sceptre ×2 → Infortune.

## Griffe Invocatrice et incertitudes

Griffe Invocatrice a bien été testée parmi les 17 actions utilisables. Elle coûte 3 PA, avec quatre tours de relance, et fournit un bonus de Puissance estimé dans OMBRE ; le comportement et les dommages autonomes du Chaton **ne sont pas simulés**. La meilleure rotation trouvée n'inclut pas Griffe Invocatrice : dans ce modèle monocible, ses 3 PA ne sont pas rentabilisés par rapport à d'autres actions.

**Limites :** ces résultats sont des simulations à critiques attendus, sans IA des ennemis, sans leurs attaques ni déplacements, sans placement réel du Chaton. Les recherches utilisent des faisceaux limités et une optimisation locale : **meilleurs résultats testés, pas optimum mathématique prouvé**.

## Vérifications GitHub Actions

- [15 scénarios manuels : 1, 3, 10, 15 et 100 tours](https://github.com/fen-min/dofus-optimiseur-sram/actions/runs/41546622204)
- [Recherche locale sur chaque sort simulé](https://github.com/fen-min/dofus-optimiseur-sram/actions/runs/41547083697)
- [Comparaison ancien/nouveau plan sur 100 tours](https://github.com/fen-min/dofus-optimiseur-sram/actions/runs/41547243196)
- [Comparaison 100 tours avec/sans buffs](https://github.com/fen-min/dofus-optimiseur-sram/actions/runs/41546827172)

Site : https://fen-min.github.io/dofus-optimiseur-sram/
