# Karuta — DPS manuel corrigé : Chatons et buffs persistants

**Mis à jour le 3 novembre 2026.** Le modèle précédent de Griffe Invocatrice était incorrect : il supprimait +90 Puissance après 4 tours et limitait le cumul à un seul bonus. La durée de **relance** est de 4 tours ; le bonus est **infini tant que le Chaton est vivant**. La capture du sort indique clairement **cumul max 3**.

## Règles confirmées et hypothèses

- Griffe Invocatrice (rang 3) : **3 PA, portée 1–4, relance 4 tours**.
- Chaque Chaton Enragé **vivant** ajoute **+90 Puissance**, jusqu'à **3 cumuls maximum**, soit **+270 Puissance au maximum**.
- Le profil exact de Karuta indique **6 invocations** : cela autorise six Chatons vivants si les cases sont libres, mais **pas +540 Puissance**, puisque l'effet est plafonné à trois cumuls.
- Si les trois Chatons survivent, le maximum est atteignable aux **tours 1, 5 et 9**. Lancer le quatrième, le cinquième ou le sixième n'augmente plus la Puissance au-delà de +270.
- OMBRE conserve désormais les invocations dans l'état du combat, distingue limite d'invocations et limite des buffs, et recalcule le bonus lorsque des Chatons meurent. Les morts doivent être représentées dans l'état : **les monstres n'attaquent pas** dans cette simulation ; les Chatons ne meurent donc pas automatiquement.
- Les dégâts et comportements propres aux Chatons (attaque, soin, téléportation, placement) **ne sont pas simulés**. Les chiffres de DPS sont par conséquent des estimations prudentes sur leur contribution directe.

Source du sort : [Dofus Grimoire](https://dofus-grimoire.fr/classes/ecaflip/), captures de la fiche de Griffe Invocatrice fournies par le joueur, statistiques de Karuta dans OMBRE.

## Conditions fixes de la comparaison

Karuta Écaflip Eau Critique 200 de référence, 12 PA, ses **22 variantes équipées**, Sceptre du Roi Joueur, Dofus Turquoise, un ennemi fictif à 0 % de résistances, dégâts critiques moyens, **aucune attaque ennemie**. Les 16 sorts simulés équipés plus l'arme peuvent être évalués. Six autres sorts équipés n'ont pas encore leurs effets simulés ; aucune valeur de dégâts ne leur est inventée.

## Comparaison sur 100 tours (vérifiée manuellement)

| Scénario | Dégâts estimés sur 100 tours |
|---|---:|
| Sans buffs offensifs de sorts : Pile ou Face, arme ×2, Infortune | 409 858,3 |
| Ancienne meilleure rotation avec buffs, **ancien modèle erroné de Griffe** | 429 286,1 |
| Nouveau moteur, ancienne ouverture de 15 tours, puis choix adaptatifs | 485 745,1 |
| Un Chaton au tour 1, puis choix adaptatifs | 491 636,5 |
| Deux Chatons aux tours 1 et 5, puis choix adaptatifs | 494 337,6 |
| Trois Chatons aux tours 1, 5 et 9, puis choix adaptatifs | 495 686,3 |
| **Ouverture réordonnée à 3 Chatons : tours 1, 5 et 9**, puis choix adaptatifs | **495 792,4** |

**Gain de la correction et de la rotation : +66 506,3 dégâts par rapport à l'ancien modèle**, sur 100 tours. Attention : cette hausse est due en grande partie à la correction d'un effet de sort oublié, pas à une simple meilleure permutation d'attaques.

Tous les plans retenus ont été rejoués **entièrement dans le moteur manuel** avec 12 PA, les limites d'utilisation et la relance réelle. Le résultat est le meilleur parmi les scénarios testés, pas une preuve d'optimum théorique mondial.

## Nouvel ordre pour les combats longs (100 tours)

Ce plan privilégié atteint trois Chatons vivants dès le T9.

| Tour | Actions |
|---|---|
| 1 | **Griffe Invocatrice** → Yams → Griffe Joueuse → Sceptre du Roi Joueur |
| 2 | Kraps → Infortune → Pile ou Face ×2 → Yams |
| 3 | Tout ou Rien → Sceptre du Roi Joueur → Rekop → Yams |
| 4 | Griffe Joueuse → Kraps → Infortune |
| 5 | **Griffe Invocatrice** → Griffe Joueuse → Pile ou Face ×2 → Sceptre du Roi Joueur |
| 6 | Kraps → Baraka → Sceptre du Roi Joueur ×2 |
| 7 | Griffe Joueuse → Pile ou Face ×2 → Sceptre du Roi Joueur ×2 |
| 8 | Griffe Joueuse → Sceptre du Roi Joueur → Infortune |
| 9 | **Pile ou Face ×2 → Griffe Invocatrice** → Kraps → Griffe Joueuse |
| 10 | Pile ou Face → Sceptre du Roi Joueur ×2 → Infortune |
| 11 | Griffe Joueuse → Kraps → Infortune |
| 12 | Griffe Joueuse → Sceptre du Roi Joueur → Infortune |
| 13 | Yams → Pile ou Face ×2 → Yams → Sceptre du Roi Joueur ×2 |
| 14 | Kraps ×2 → Sceptre du Roi Joueur ×2 |
| 15 | Pile ou Face → Sceptre du Roi Joueur ×2 → Infortune |

Le **tour 9** doit commencer par les deux Pile ou Face : le remboursement de PA intervient **après** le coût du sort ; lancer le Chaton avant ces sorts dans certaines permutations rend le deuxième lancer impossible. De T16 à T100, OMBRE reprend ses choix adaptatifs.

**Total de la meilleure ouverture longue sur 15 tours : 67 825,5 dégâts.** Elle est optimisée pour l'investissement sur 100 tours, pas pour le seul score du tour 15.

## Nouveau meilleur combat court (15 tours)

Sur un combat court, la meilleure ouverture testée ne lance que le **premier Chaton au tour 1** et utilise les autres PA pour ses attaques. Elle atteint **68 822,9 dégâts sur 15 tours**, un peu plus que l'ouverture longue au même horizon. OMBRE conserve donc un plan court distinct du plan long.

## Vérifications et limites

- [Six Chatons vivants et cumul de +90 ×3 jusqu'à leur disparition : 30 tests validés](https://github.com/fen-min/dofus-optimiseur-sram/actions/runs/41549338331)
- [100 tours, comparaison 0 à 3 Chatons survivants](https://github.com/fen-min/dofus-optimiseur-sram/actions/runs/41549415591)
- [100 tours, optimisation de l'ordre des trois invocations et rejeu manuel intégral](https://github.com/fen-min/dofus-optimiseur-sram/actions/runs/41549884787)
- [15 tours, recherche des séquences manuelles en tenant compte du Chaton](https://github.com/fen-min/dofus-optimiseur-sram/actions/runs/41549553814)

Ce modèle **suppose que tous les Chatons survivent**, que les cases d'invocation soient libres et que Karuta puisse se placer correctement. Un monstre peut les éliminer : les bonus baisseraient alors immédiatement. La simulation ne calcule ni leurs propres dégâts ni leurs effets utilitaires.

Site : https://fen-min.github.io/dofus-optimiseur-sram/
