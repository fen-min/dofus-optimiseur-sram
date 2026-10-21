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

## v0.7 — Correction de Furie et état de vérification des effets

⚠️ **Les 44 sorts sont catalogués, mais leurs effets secondaires ne sont PAS tous vérifiés ni simulés.** Les nombres de dommages/PA/PO de DofusBook ne décrivent pas l'intégralité de chaque sort. Les rotations restent expérimentales.

La capture du menu de sorts DOFUS fournie pour **Furie (Sacrieur, rang 2)** confirme : 3 PA, portée 0–2, deux lancers par tour, **+3 % de dommages finaux pendant 3 tours**, cumulable **2 fois**. Le moteur applique désormais un multiplicateur de **1,03** après une Furie ou **1,06** après deux Furies actives, sur les sorts suivants. Les dégâts du sort sont appliqués avant le bonus qu'il génère.

La zone en croix, les PV du Sacrieur, la Souffrance, les soins, et de nombreux effets secondaires restent partiellement ou totalement absents du calcul. Par conséquent, un calcul sur 10 tours ne doit pas être présenté comme une rotation optimale exacte.

Le Sacrieur démarre désormais à **2 cases** de distance (valeur modifiable et conservée pour chaque build), car Furie ne porte pas au-delà de 2 cases. Les personnages existants sans distance enregistrée reçoivent la distance adaptée à leur classe.

Les tests `test/furie.test.mjs` vérifient l'ordre des effets, les cumuls +3 % et +6 %, l'expiration et la contrainte de portée. Quand un sort n'a pas encore été audité, l'interface avertit explicitement que ses effets secondaires peuvent manquer.

Remarque : une base communautaire peut afficher un pourcentage différent selon la version du jeu. Les valeurs de cette mise à jour s'appuient en priorité sur la capture récente de DOFUS et sont recoupées avec les builds communautaires.


## v0.8 — Audit qualitatif des 88 sorts

Un inventaire des **44 sorts Sram** et **44 sorts Sacrieur** se trouve dans [SPELLS_EFFECTS_AUDIT.md](./SPELLS_EFFECTS_AUDIT.md). Le registre `src/spell-effects-audit.js` documente un résumé des effets secondaires par sort, les pistes de vérification et l'état de l'audit. Dans l'application, ouvrir **Sorts & variantes → Afficher les dégâts et les effets détaillés** pour lire les effets recensés sous chaque sort et accéder à une source de comparaison.

**Attention :** cet audit n'est pas une extraction structurée exhaustive de chaque rang depuis DofusDB. Les données DofusDB, OpenDofusDB, Dofus Grimoire et la capture du jeu peuvent porter sur des versions/rangs distincts. Les 88 résumés identifient les mécaniques importantes ; ils **ne certifient pas** leurs chiffres, cibles ou limites exacts à tous les rangs. Le moteur de combat n'a **pas** été modifié pour attribuer des valeurs conjecturales. En particulier, les PV/Souffrance du Sacrieur et la géométrie des pièges du Sram restent absents : les rotations de 10 tours ne sont donc pas garanties exactes.

## v0.9 — Version visible et Pacte de Sang (Sacrieur)

**Affichage de version :** une ancienne étiquette « Toutes les actions · v0.3 » restait codée en dur dans la barre latérale alors que le pied de page et les fichiers étaient en v0.8. Les deux étiquettes ont été synchronisées sur **v0.9** et le HTML charge les fichiers JS/CSS avec le paramètre `?v=0.9` pour limiter l'effet du cache.

**Pacte de Sang rang 2**, d'après la capture du jeu fournie le 21 octobre 2026 : **2 PA, portée 0, relance 2 tours, cumul 1, +100 Puissance pendant 3 tours et +25 % Vitalité pendant 3 tours**. L'optimiseur suit deux bonus indépendants ; la Puissance est utilisée dans ses estimations de dégâts, tandis que le bonus de Vitalité est suivi mais **n'ajuste pas encore les PV** (et donc ne corrige pas encore les dégâts conditionnés par la Souffrance). Les deux bonus s'affichent dans le grimoire et les détails du sort.

Les autres effets secondaires des 88 sorts sont recensés dans l'audit, mais **ne sont pas tous reproduits dans le calculateur**. Les résultats restent approximatifs. Les tests `test/pacte-de-sang.test.mjs` valident les deux buffs, leur expiration et la relance.

## v1.0 — Relecture Sacrieur avec OpenDofusDB (21 octobre 2026)

Une fiche de référence pour chacun des **44 sorts Sacrieur** figure dans [SACRIEUR_OPENDB_AUDIT_2026-10-21.md](./SACRIEUR_OPENDB_AUDIT_2026-10-21.md).

Les descriptions et liens OpenDofusDB sont dans `src/spell-effects-audit.js`. 40 sorts sont liés à leur page individuelle ; les 4 autres pointent vers la page générale de la classe pour éviter les liens inventés. Dans le grimoire, **Sorts & variantes → Afficher les dégâts et les effets détaillés** présente chaque effet et précise ce que le moteur ne sait pas calculer.

Corrections de simulation : **Nervosité rang 2 (+7 % de critique, 3 tours)**, **Douleur Cuisante rang 2 (+60 Puissance, 3 tours)** et **Mutilation rang 3 (+150 Puissance dès le premier lancer, état Mutilation de 1/3 à 3/3 et conversion en Coagulation au second lancer)**. Furie et Pacte de Sang restent intégrés. La conversion en Coagulation retire bien le bonus de Puissance, mais ne calcule pas encore le bouclier.

Les sorts à coût en PV (Carnage, Déchaînement, Entaille, Immolation, Libation, Berserk, Châtiment) sont désormais signalés dans les actions et la documentation du moteur. **Leurs pertes de PV ne sont pas encore déduites**, donc la Souffrance et les dommages conditionnels associés ne sont pas calculés. Les bonus de Berserk restent conditionnels et ne sont pas attribués artificiellement.

La recherche sur 10 tours, les variantes exclusives et les builds individuels sont préservés. La simulation demeure **heuristique, monocible, sans carte de combat**, et ses résultats ne doivent pas être présentés comme un maximum de DPS exact en jeu.

Un fichier de tests `test/sacrier-openddb.test.mjs` contrôle la couverture des 44 sorts, les buffs et la progression de Mutilation.

 
## v1.1 — Effets actifs par tour dans l'optimiseur

Dans **Optimisation → Rotation conseillée**, chaque tour affiche désormais une colonne **Effets actifs** à droite des sorts joués :
- **Début du tour N** : buffs, états, poisons et altérations encore présents avant les actions.
- **Pour le tour N+1** : mêmes effets conservés après la résolution du tour, les déclenchements et l'expiration des bonus.
- Les cumuls d'une même source sont fusionnés : deux Furies à +3 % deviennent **+6 % Dommages finaux · 2 cumuls**.
- Si deux bonus ont des échéances distinctes, la plage de tours restants est conservée plutôt que de cacher l'expiration la plus proche. Deux sources différentes sont désignées comme **sources**, et non cumuls d'un même sort.
- Les bonus à durée non simulée (invisibilité) sont présentés comme tels. La progression de Mutilation est indiquée, sans inventer ses PV ou boucliers.
- Affichage en deux colonnes sur ordinateur, une seule colonne sur écrans étroits.

L'affichage est un **résumé de l'état du simulateur**, pas une validation supplémentaire de ses mécaniques. Les coûts de PV, la Souffrance et le placement des pièges restent limités. Tests de régression : `test/turn-effects.test.mjs`.


## v1.2 — Fiche de statistiques du Sacrieur Air

Capture de statistiques reçue le **21 octobre 2026**. Fiche du personnage EN JEU sauvegardée dans `src/character-stats.js` et automatiquement associée au build de référence `sacri-air-pvm` sans supprimer ses variantes/paramètres déjà enregistrés en local.

| Caractéristique | Valeur | Caractéristique | Valeur |
|---|---:|---|---:|
| PV | 4 952 | PA réels | 12 |
| PM | 5 | Portée | 5 |
| Agilité | 1 267 | Puissance | 160 |
| Chance | 405 | Force / Intelligence | 100 / 100 |
| Critique | −44 | Dommages critiques | 24 |
| Dommages Air | 144 | Dommages Eau | 56 |
| Dommages aux sorts | 1 % | Sagesse | 386 |
| Résistances Air / Eau | 20 % / 27 % | Résistances Terre / Feu / Neutre | 37 % / 37 % / 29 % |

Les statistiques secondaires (tacle, fuite, retraits, esquives, initiative, soins, invocations, prospection et résistances critiques/de poussée) sont également enregistrées. **Personnages & builds → Statistiques du build actif** permet de les consulter ou modifier. Les builds Sram et les nouveaux builds Sacrieur n'héritent pas automatiquement de cette capture ; une duplication conserve une copie indépendante des stats du build d'origine.

**ATTENTION — calcul des dégâts :** le moteur ne recalcule PAS encore automatiquement tous les sorts en appliquant ces statistiques à leurs dégâts de base. Les chiffres de DofusBook sont déjà calculés pour un équipement qui peut différer de la capture. Additionner une seconde fois 1 267 Agilité, 160 Puissance ou 144 dommages Air produirait un double comptage. Le −44 Critique du personnage est conservé ; pour recalculer correctement les critiques, il faut repartir des chances de base de chaque sort, pas soustraire 44 à un taux déjà calculé/clampé par DofusBook. Les PA utilisés pour une rotation personnalisée (ex. 16) restent distincts des 12 PA effectivement affichés sur la capture.


## v1.3 — Mode Combat compact (10 tours)

Après **Calculer la rotation**, le bouton **⚔ Vue combat** apparaît dans les résultats et un raccourci flottant **⚔ Rotation rapide** reste disponible. Il ouvre une colonne compacte à droite, avec **uniquement les sorts à lancer dans leur ordre et les PA utilisés pour chacun des 10 tours** (ou moins selon l'horizon choisi). Aucun nombre de dégâts, poison ou note n'est ajouté dans ce mode.

- **Tour en cours** encadré ; cliquer sur un tour ou utiliser les flèches gauche/droite pour avancer pendant le combat.
- **↗ Ouvrir en petite fenêtre** ouvre `combat.html` dans une fenêtre détachable redimensionnable (largeur demandée 420 px), à placer à côté du jeu. Les navigateurs peuvent bloquer les pop-ups : il faut alors autoriser la fenêtre sur ce site. Le mode plein écran exclusif d'un jeu peut masquer les autres fenêtres ; le mode fenêtré/sans bordures est plus pratique.
- La dernière rotation et le numéro de tour sélectionné sont **sauvegardés par build dans le navigateur** et accessibles après rechargement. Les deux vues synchronisent les changements de tour grâce au stockage local partagé de la même origine.
- Si le build, les variantes ou les paramètres de simulation changent, le résumé devient caduc ; OMBRE masque le raccourci jusqu'au prochain calcul. Les tours provenant d'un autre personnage ne sont jamais affichés comme ceux du build actif.
- Les boutons et les noms des sorts sont affichés en mode tactile et clavier ; l'affichage reste réactif sur petit écran.

Le mode Combat n'apporte **aucune nouvelle mécanique de dégâts** : il simplifie seulement la lecture des rotations théoriques déjà calculées. Les PV, la Souffrance, les cases et les autres limites du moteur restent applicables.

Tests : `test/combat-view.test.mjs` (ordre des sorts, 10 tours, PA, séparation entre builds et protection du HTML).
