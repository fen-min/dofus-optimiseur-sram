# Sram Air — 44 sorts et effets (audit du 22 octobre 2026)

**Matryoshka** : Sram Air, 4 065 PV, 12 PA, 5 PM, 1 645 Agilité, 160 Puissance, +17 Critique, +153 dommages Air et +33 dommages critiques.

Sources : [OpenDofusDB Sram — DOFUS 3.7.12.12](https://openddb.dev/classes/4-sram) et [Dofus Grimoire Sram 3.7](https://dofus-grimoire.fr/classes/sram/). OpenDofusDB montre souvent le rang 1 par défaut ; les valeurs du dernier rang ont été recoupées pour les mécaniques citées. Les autres rangs, conditions de lancer et déclenchements n'ont pas tous été validés en jeu.

**Les effets décrits ne sont pas tous simulés.** Le moteur OMBRE travaille sur une cible unique sans carte, avec des hypothèses de pièges et des soins, zones et invocations encore incomplets.

## 22 paires de variantes du grimoire (fond clair = choisi)

| # | Sélectionné | Autre variante |
|---:|---|---|
| 1 | Truanderie | Chausse-trappe |
| 2 | Coupe-gorge | Sournoiserie |
| 3 | Arsenic | Toxines |
| 4 | Poisse | Cruauté |
| 5 | Brume | Invisibilité |
| 6 | Comploteur | Double |
| 7 | Guet-apens | Piège Sournois |
| 8 | Épidémie | Piège Fangeux |
| 9 | Piège Funeste | Effraction |
| 10 | Piège Répulsif | Piège Effroyable |
| 11 | Piège d'Immobilisation | Fosse Commune |
| 12 | Perquisition | Extorsion |
| 13 | Arnaque | Larcin |
| 14 | Attaque Mortelle | Pillage |
| 15 | Injection Toxique | Fourberie |
| 16 | Peur | Méprise |
| 17 | Piège Insidieux | Piège de Dérive |
| 18 | Piège Scélérat | Piège à Fragmentation |
| 19 | Manigance | Concentration de Chakra |
| 20 | Piège Mortel | Calamité |
| 21 | Fourvoiement | Perfidie |
| 22 | Marque Mortuaire | Dérobade |

## Les 44 sorts — effets et état du modèle

| # | Sort et référence | Description des effets | Limites dans OMBRE |
|---:|---|---|---|
| 1 | [Truanderie](https://openddb.dev/spells/12902-truanderie) | Rang 3 : vole 80 Puissance pendant 3 tours et inflige des dommages Terre. La cible perd la Puissance volée. | +80 Puissance simulé au rang 3 ; vol à l’ennemi absent |
| 2 | [Chausse-trappe](https://openddb.dev/classes/4-sram) | Dommages Terre renforcés par les pièges déclenchés (+8 dégâts de base par charge au rang supérieur). Charges consommées au lancer. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 3 | [Sournoiserie](https://openddb.dev/classes/4-sram) | Dommages Feu et repousse la cible de 3 cases ; lancer en ligne. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 4 | [Coupe-gorge](https://openddb.dev/classes/4-sram) | Dommages Feu puis augmentation des dommages subis par la cible (jusqu’à x110 % au rang supérieur). | vulnérabilité simulée de manière simplifiée, durée/cible à vérifier |
| 5 | [Arsenic](https://openddb.dev/classes/4-sram) | Poison Air au début du tour de la cible, avec retrait de Portée. Lancer en ligne et effet différé. | poison différé simulé ; retrait de PO absent |
| 6 | [Toxines](https://openddb.dev/classes/4-sram) | Poison Air de fin de tour. Si la cible subit des dégâts de piège pendant le poison, celui-ci est réappliqué et gagne jusqu’à 5 charges (+6 dégâts de base par charge au rang 2), une fois par tour. | poison différé simulé ; croissance et réapplications sur pièges encore approximatives |
| 7 | [Cruauté](https://openddb.dev/classes/4-sram) | Dommages Eau en zone et +1 PM au lanceur, dans les limites de cumul du sort. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 8 | [Poisse](https://openddb.dev/classes/4-sram) | Vol de vie Eau ; minimise les effets aléatoires de la cible, applique l’état Poisse. Les soins au lanceur ne sont pas simulés. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 9 | [Invisibilité](https://openddb.dev/classes/4-sram) | Rend invisible ; +2 PM si cible alliée. Relance globale. Quand elle prend fin, le passif L’Ombre de Sram peut donner +15 % Critique au lanceur. | invisibilité simplifiée ; passif +15 % Critique non simulé |
| 10 | [Brume](https://openddb.dev/classes/4-sram) | Pose un glyphe-aura qui rend les alliés invisibles et retire de la Portée aux ennemis (−4 PO au rang 2). Relance diminuée après un coup fatal. | aura, perte de Portée et passif de coup fatal non simulés |
| 11 | [Double](https://openddb.dev/classes/4-sram) | Invoque un double contrôlable ; à sa mort (fin de son 2e tour) échange de place avec le Sram et lui donne +2 PM. | invocation simplifiée ; échange de place, PM et IA absents |
| 12 | [Comploteur](https://openddb.dev/classes/4-sram) | Invoque un double contrôlable, qui inflige des dégâts dans le meilleur élément à son contact à la fin de son 3e tour ; +8 dégâts de base par piège déclenché depuis son invocation. | dégâts si contact supposé ; invocation et position absentes |
| 13 | [Piège Sournois](https://openddb.dev/spells/12906-piege-sournois) | Piège Feu qui attire les entités vers son centre en zone au déclenchement. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 14 | [Guet-apens](https://openddb.dev/spells/12939-guet-apens) | Vol de vie Eau et attirance de 2 cases, éventuellement depuis le Double. OpenDofusDB indique actuellement soin sur l’attaquant : 0 % (et non 25 %). | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 15 | [Piège Fangeux](https://openddb.dev/spells/12916-piege-fangeux) | Piège Eau avec retrait de PM dans la zone du piège. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 16 | [Épidémie](https://openddb.dev/classes/4-sram) | Poison Air de fin de tour et état de propagation aux ennemis voisins ; peut se propager via le Sram et son Double, sauf invocations statiques. | poison monocible simplifié ; propagation multi-cible absente |
| 17 | [Piège Funeste](https://openddb.dev/spells/12948-piege-funeste) | Piège Terre augmenté selon le nombre d’ennemis autour du piège avant son déclenchement. | bonus selon les ennemis autour du piège non simulé |
| 18 | [Effraction](https://openddb.dev/classes/4-sram) | Dommages Feu ; vole 30 résistances Poussée à la cible et les octroie au Sram. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 19 | [Piège Répulsif](https://openddb.dev/spells/12914-piege-repulsif) | Piège Air repoussant les entités depuis son centre de 2 cases. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 20 | [Piège Effroyable](https://openddb.dev/classes/4-sram) | Piège Terre mono-cellule ; dommages Terre aux ennemis et repousse les entités de 2 cases depuis le centre. Deux lancers par tour. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 21 | [Piège d'Immobilisation](https://openddb.dev/spells/12910-piege-d-immobilisation) | Piège de zone qui retire jusqu’à 4 PM au dernier rang ; relance 4 tours. | relance suivie ; retrait de PM et zone absents |
| 22 | [Fosse Commune](https://openddb.dev/classes/4-sram) | Piège mono-cellule appliquant l’état Pesanteur aux entités de la zone, alliés compris ; relance 3 tours. | relance suivie ; état Pesanteur et zone absents |
| 23 | [Extorsion](https://openddb.dev/spells/12938-extorsion) | Rang 3 : vole 100 Force pendant 3 tours et vole de la vie en Terre. | +100 Force simulée ; soins et retrait adverse absents |
| 24 | [Perquisition](https://openddb.dev/classes/4-sram) | Dommages Feu et repousse la cible de 2 cases ; si le Double est présent, la poussée peut partir de lui. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 25 | [Arnaque](https://openddb.dev/spells/12911-arnaque) | Rang 3 : vole de l’Agilité (100 au rang 3 selon le guide 3.7) et vole de la vie dans l’élément Air. | +100 Agilité (vol) appliquée au lanceur dans le modèle ; soins et retrait chez la cible absents |
| 26 | [Larcin](https://openddb.dev/classes/4-sram) | Dommages Eau en zone et 13 % Érosion, sans affecter le lanceur. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 27 | [Pillage](https://openddb.dev/classes/4-sram) | Rang 3 : vole 100 Chance et vole de la vie Eau. | +100 Chance simulée ; soins et retrait adverse absents |
| 28 | [Attaque Mortelle](https://openddb.dev/classes/4-sram) | Dommages Terre renforcés lorsque la cible a moins de 50 % de ses PV. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 29 | [Fourberie](https://openddb.dev/classes/4-sram) | Rang 3 : vol de 100 Intelligence et vol de vie Feu dans un anneau de zone. | +100 Intelligence simulée ; vol de vie et zone absents |
| 30 | [Injection Toxique](https://openddb.dev/classes/4-sram) | Retire 1 PM et applique un poison Air de début de tour. Relance raccourcie à chaque piège déclenché du lanceur. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 31 | [Peur](https://openddb.dev/classes/4-sram) | Repousse une cible jusqu’à la case visée (pas toujours 2 cases) ; nécessite le placement exact. | placement réduit à une approximation de distance, pas de grille |
| 32 | [Méprise](https://openddb.dev/classes/4-sram) | Échange de place avec la cible, ou entre la cible et le Double si présent ; dissipe l’invisibilité. | échange de cases et interaction du Double non simulés |
| 33 | [Piège de Dérive](https://openddb.dev/spells/12942-piege-de-derive) | Piège Feu de zone, repousse les entités de 2 cases. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 34 | [Piège Insidieux](https://openddb.dev/spells/12918-piege-insidieux) | Piège Air infligeant des dommages Air, appliquant un poison Air de fin de tour et attirant vers le centre. | placement et poison conditionnel au piège approximatifs |
| 35 | [Piège Scélérat](https://openddb.dev/spells/12931-piege-scelerat) | Piège Eau mono-cellule, attirance vers le centre et dommages Eau en zone. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 36 | [Piège à Fragmentation](https://openddb.dev/classes/4-sram) | Piège Feu multi-anneaux : dégâts différents selon la distance au centre, peut affecter des alliés. | zones et distances des anneaux non simulées |
| 37 | [Concentration de Chakra](https://openddb.dev/classes/4-sram) | Place un effet sur une cible : chaque piège qui l’affecte déclenche un vol de vie dans le meilleur élément. Dissipe l’invisibilité. | vol de vie proxy lors d’un déclenchement ; pas de modèle de cible |
| 38 | [Manigance](https://openddb.dev/classes/4-sram) | Vole Fuite et Dommages à un ennemi ; accorde des bonus de Fuite et Dommages sur allié / lanceur. | bonus Dommages approximé sur soi ; vol de Fuite et ciblage non simulés |
| 39 | [Piège Mortel](https://openddb.dev/spells/12921-piege-mortel) | Piège Terre ; dégâts accrus contre une cible sous 50 % PV. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 40 | [Calamité](https://openddb.dev/spells/12950-calamite) | Piège Eau de zone qui vole la Fuite des ennemis dans la zone. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 41 | [Fourvoiement](https://openddb.dev/classes/4-sram) | Dommages Air en zone avec Érosion sur les cibles. | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 42 | [Perfidie](https://openddb.dev/spells/12949-perfidie) | Dommages Terre, coût diminué de 1 PA par piège déclenché (maximum 4, minimum 2 PA). Charges dépensées au lancer. | réduction des PA selon pièges déclenchés modélisée, placements non simulés |
| 43 | [Dérobade](https://openddb.dev/classes/4-sram) | Réduit les dégâts subis par l’allié ciblé, le rend Intaclable ; lorsqu’il est attaqué, le repousse et lui donne des PM (effet réactif). | Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis |
| 44 | [Marque Mortuaire](https://openddb.dev/classes/4-sram) | Applique Érosion et dégâts reçus augmentés selon les pièges déclenchés, jusqu’à x110 % et 30 % Érosion à 5 charges. Dissipe l’invisibilité. | vulnérabilité initiale simplifiée ; paliers, érosion et réinitialisation d’invisibilité incomplets |

## Corrections apportées

- Arnaque, Extorsion, Pillage et Fourberie : gain de caractéristique volée au dernier rang représenté par +100 au lieu de +40. La baisse chez l'ennemi et le vol de vie ne sont pas encore simulés.
- Précisions : Guet-apens (soin attaquant 0 % selon OpenDofusDB), Effraction (résistances Poussée), Piège Effroyable (Terre + repousse), Fosse Commune (Pesanteur), Perquisition (repousse), Méprise (échange via Double), Toxines (charges sur pièges).
- Le grimoire de la capture définit les variantes du build Sram de référence sans écraser les personnalisations.

## À développer pour des dégâts réellement exacts

- Dégâts de base de tous les sorts au dernier rang avec les caractéristiques exactes du personnage, et critique calculé à partir de la vraie probabilité.
- Déclenchement des pièges sur une carte, zones, placements, invisibilité, passif L'Ombre de Sram et coups critiques conditionnels.
- Soins et vols de vie, PM, erosion, altérations, contrôles et durée exacte des poisons.

**Conclusion :** l'audit général couvre les 44 sorts ; tous les effets ne sont pas reproduits entièrement par le moteur d'optimisation.
