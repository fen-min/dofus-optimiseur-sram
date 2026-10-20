# OMBRE — Optimiseur Sram DOFUS 3.7 (prototype v0.3)

Application web pour un Sram Air 200, avec 12 PA et 5 tours par défaut.

- Site : https://fen-min.github.io/dofus-optimiseur-sram/
- Stuff source : https://www.dofusbook.net/desktop/fr/equipement/16093814-db/sorts

## Ce qui a changé en v0.3

- Les 44 sorts de classe figurent désormais dans le moteur (22 paires de variantes exclusives).
- Chaque paire a un sélecteur dans Paramètres → Sorts, variantes et hypothèses. Un seul des deux sorts est retenu dans une simulation.
- Attaques et dégâts conditionnels, poisons et pièges avec scénarios de déclenchement.
- Buffs persistants simulés : Manigance (+20 dommages pendant 3 tours), Arnaque (+40 Agilité pendant 3 tours), Extorsion, Pillage, Fourberie, Truanderie.
- Vulnérabilités simplifiées : Coupe-gorge et Marque Mortuaire.
- Concentration de Chakra réagit aux pièges sur la cible, sous hypothèse de déclenchement.
- Comploteur peut exploser au troisième tour si l'option de contact est activée ; il ne frappe pas immédiatement.
- Le coût de Perfidie peut baisser avec les charges de pièges.
- Les sorts sans dégâts directs (Invisibilité, Brume, Double, Dérobade, etc.) sont des actions candidates, mais ne se voient jamais attribuer de dégâts fictifs.
- La rotation affiche les dommages directs, les dommages différés et les buffs ou états appliqués.

## Limites importantes

Le modèle est MONOCIBLE, sans carte réelle, sans obstacle ni IA de monstres. Les dégâts des sorts sont relevés sur le contexte du stuff DofusBook, pas recalculés à partir des caractéristiques complètes.
Les contributions des buffs de caractéristiques et de la Puissance sont approximatives. Les changements de position sont simplifiés, et les pièges ne font des dégâts que selon des hypothèses ACTIVÉES par l'utilisateur.
Une recherche par faisceaux (beam search) échantillonne de nombreuses rotations mais ne garantit pas un optimum global.
Épidémie ne propage pas de dégâts sur d'autres ennemis en monocible. Les effets utilitaires ou défensifs ne reçoivent pas de valeur DPS artificielle et peuvent ne pas figurer dans une rotation purement offensive.
La réduction de dégâts des ennemis, les résistances fixes, la survie, l'initiative, les zones exactes et toutes les subtilités des buffs ne sont pas encore modélisées.
Ce n'est PAS un outil déterminant le tour parfait en jeu : comparer les sorties avec les dégâts du journal de combat.

## Utilisation

1. Ouvrir le site ou lancer un serveur HTTP local avec python -m http.server 8000.
2. Choisir le nombre de PA et de tours.
3. Dans les options avancées, choisir tes 22 variantes et les hypothèses (résistances, distance, pièges et Comploteur).
4. Calculer la rotation, puis consulter le détail des 5 tours et des effets.
5. Dans Dégâts des sorts, consulter tous les sorts et calibrer les dommages calculés pour le personnage.

## Tests

Commande : npm test (Node.js requis). Les tests dans test/engine.test.mjs vérifient 44 sorts, variantes, PA, Manigance, poison, Comploteur, invisibilité et 5 tours.

## Déploiement

Sur le dépôt GitHub, utiliser Settings → Pages → Deploy from a branch → main / (root). Aucun serveur ni dépendance npm requis pour le site.

## Sources

- DofusBook : https://www.dofusbook.net/desktop/fr/equipement/16093814-db/sorts
- OpenDofusDB : https://openddb.dev/classes/4-sram
- Dofus Grimoire : https://dofus-grimoire.fr/classes/sram/
- Changements de classe 3.7 : https://backfromafk.com/classes/sram/

Projet communautaire non affilié à Ankama.

## v0.4 — Combats longs (10 tours)

La durée de simulation est désormais **10 tours par défaut**, réglable de **1 à 10 tours**. Les mêmes règles de PA, effets persistants, poisons, relances, buffs et variantes sont conservées pendant la simulation complète.

Pour ne pas bloquer l'interface pendant une recherche longue, le calcul tourne dans un **Web Worker**. L'utilisateur voit la progression tour par tour et peut appuyer sur **Annuler le calcul**. En l'absence de Web Worker, un mode de repli calcule sur le fil principal.

Le graphique, les résultats tour par tour, les dégâts cumulés, les dégâts directs et les dégâts différés sont adaptés à la durée choisie. Attention : une simulation plus longue peut exiger davantage de calcul et **n'améliore pas automatiquement la précision** des mécaniques approximées ou de la recherche heuristique. La cible est supposée rester présente pendant 10 tours, sans IA ni vraie carte.
