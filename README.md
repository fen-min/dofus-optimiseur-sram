# OMBRE v0.5 — Atelier de builds DOFUS

Application web expérimentale, gratuite et sans serveur, pour organiser ses personnages, leurs builds et leurs rotations.

**Site** : https://fen-min.github.io/dofus-optimiseur-sram/
**Dépôt** : https://github.com/fen-min/dofus-optimiseur-sram

## Personnages intégrés

| Personnage | Build de départ | Référence DofusBook | Sorts | Variantes |
|---|---|---|---:|---:|
| Sram | Air PvM 200 Low Cost | https://www.dofusbook.net/desktop/fr/equipement/16093814-db/sorts | 44 | 22 paires |
| Sacrieur | Air PvM 200 Low Cost | https://www.dofusbook.net/desktop/fr/equipement/20072789-db/sorts | 44 | 22 paires |

Les 22 paires Sacrieur ont été recoupées avec la capture du menu de sorts fournie, ce qui permet de sélectionner **exactement une variante par paire**. Les choix de départ sont des suggestions Air, et non une importation certaine de la configuration en jeu.

## Gestion des personnages / builds

- Sélecteur de build accessible dans la barre latérale.
- Onglet **Personnages & builds** : lister, ajouter, dupliquer, renommer et supprimer les builds.
- Chaque build sauvegarde séparément : classe, personnage, nom, élément, lien DofusBook, 22 variantes, PA, nombre de tours, calibrations de dégâts.
- Les sauvegardes utilisent localStorage sur cet appareil : elles ne sont pas synchronisées avec GitHub ni entre navigateurs.
- Les nouveaux builds peuvent choisir les classes actuellement intégrées, Sram ou Sacrieur. L'architecture `src/classes.js` permet d'en ajouter d'autres ensuite.
- **Attention :** coller un nouveau lien DofusBook ne suffit pas à importer automatiquement son équipement ou ses caractéristiques. Les valeurs disponibles proviennent des deux builds de référence ; elles doivent être recalibrées si l'équipement change.

## Optimisation sur 10 tours

La recherche heuristique teste les sorts de la classe choisie, une seule variante par paire, avec les PA, portées simplifiées, temps de relance et buffs explicitement modélisés. Les calculs s'exécutent dans un Web Worker annulable afin de conserver une interface réactive.

Pour le **Sram**, le moteur expérimental conserve attaques, poisons, pièges, buff Arnaque, Manigance, etc. Pour le **Sacrieur**, les dommages directs des sorts du build DofusBook sont catalogués et une approximation du bonus progressif de **Mutilation** (+50 puis jusqu'à +150 Puissance) est testable.

## Limites cruciales

**Ce n'est pas encore un calculateur de rotations exactes de DOFUS.**

- **Sacrieur : Souffrance, PV, sacrifices, soins, boucliers, bonus conditionnels, Châtiment/Punition et invocation** ne sont pas entièrement simulés. Les dégâts et les buffs conditionnés par les PV peuvent donc être très éloignés de la réalité. Les sorts purement utilitaires ne reçoivent pas de dégâts fictifs.
- **Sram :** cartes, zones, obstacles, IA des ennemis et placement des pièges restent des hypothèses.
- Un build cloné avec un nouvel équipement ne récupère **pas** automatiquement ses nouvelles caractéristiques DofusBook. Les chiffres de départ proviennent du build d'origine.
- Le moteur part d'une cible unique stable pendant 10 tours. Il ne calcule ni les conditions réelles de déplacement ni la survie.
- Les effets de buffs et les dégâts sont des estimations. La recherche par faisceaux ne garantit pas le meilleur tour global.

## Utiliser

1. Ouvrir le site et sélectionner un build.
2. Choisir le nombre de PA (12 par défaut) et la durée (10 tours par défaut).
3. Ouvrir **Sorts, variantes et hypothèses** : cliquer sur **un seul** des deux choix de chaque paire.
4. Lancer la simulation puis consulter les dégâts et les buffs tour par tour.
5. Dupliquer un build pour tester d'autres variantes sans effacer l'original.

## Développer / tester

Ce projet utilise HTML/CSS et JavaScript ES Modules. Servir le dossier en HTTP local, par exemple `python -m http.server 8000`, ou activer GitHub Pages (main / root). Les tests Node.js s'exécutent via `npm test`.

## Références

- DofusBook Sram : https://www.dofusbook.net/desktop/fr/equipement/16093814-db/sorts
- DofusBook Sacrieur : https://www.dofusbook.net/desktop/fr/equipement/20072789-db/sorts
- Dofus Grimoire Sacrieur : https://dofus-grimoire.fr/classes/sacrieur/
- Changements Sacrieur 3.7 : https://backfromafk.com/classes/sacrieur/

Projet de fan sans affiliation avec Ankama.
## v0.6 — Grimoire de sorts inspiré de DOFUS

L'onglet **Sorts & variantes** est maintenant un grimoire en deux colonnes sur écran large, organisé comme le menu des sorts en jeu : **22 lignes de paires** pour les **44 sorts de classe**.

- Chaque ligne présente les deux sorts de la paire côte à côte, avec un pictogramme, le niveau du sort et le coût en PA.
- **Un clic sur une variante suffit à l'équiper.** L'autre sort de la même ligne est automatiquement déséquipé.
- La sélection est immédiatement enregistrée dans le build actif (stockage local). En changeant de Sram à Sacrieur, le grimoire affiche les variantes de la classe correspondante sans mélanger les profils.
- Les filtres par nom, élément et type recherchent les paires ; une paire reste entièrement visible lorsque l'un de ses sorts correspond à la recherche.
- Le bouton **Afficher les dégâts et les effets détaillés** ouvre l'ancien catalogue de calibration lorsque cela est nécessaire. Les corrections de dégâts ne sont pas perdues.
- La vue est adaptée aux écrans plus petits : une seule colonne pour garder les variantes côte à côte dans chaque paire.
- Après tout changement de variante, l'ancienne rotation est invalidée : relancer l'optimisation est nécessaire pour obtenir des résultats correspondant aux nouveaux sorts.

Les petites icônes sont des symboles stylistiques propres à l'application, pas des illustrations copiées du jeu. Le design est inspiré du principe de sélection de DOFUS sans reprendre ses ressources graphiques.

Note : les limites du moteur demeurent, notamment la Souffrance du Sacrieur et le placement des pièges du Sram.
