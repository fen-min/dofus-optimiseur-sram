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

 
## v1.4 — 📌 Épinglage au premier plan (mode Combat)

Une nouvelle **épingle** apparaît dans la petite fenêtre `combat.html` et dans le panneau « Vue combat » de l'application principale. Cliquer sur **📌 Épingler / Garder au premier plan** ouvre une fenêtre Document Picture-in-Picture (PiP) du navigateur, légère et redimensionnable, contenant les 10 tours et uniquement les sorts/PA. Le PiP peut rester **au-dessus des autres fenêtres du bureau** et les flèches continuent de faire avancer le tour, avec mémorisation du tour actif par build.

Cliquer sur **✕** dans la fenêtre épinglée la ferme ; le panneau ou la petite fenêtre d'origine reste intact. La fermeture de l'onglet/la fenêtre qui a créé le PiP ferme **également** le PiP : il faut laisser l'application d'origine ouverte.

**Compatibilité :** l'API Document Picture-in-Picture fonctionne sur les navigateurs qui l'implémentent (notamment Chrome et Edge de bureau, sur HTTPS). En cas d'absence de prise en charge, un message apparaît : JavaScript **ne peut pas** forcer une fenêtre `window.open` traditionnelle à rester au premier plan. Le mode épinglé est piloté par le navigateur, pas par un réglage natif du système. Une application/jeu en **plein écran exclusif** peut tout de même masquer le PiP : privilégier le mode fenêtré sans bordures si nécessaire.

**Fichiers :** `src/combat-pin.js` (API de mise au premier plan), `combat.html` / `src/combat.js` et panneau latéral `index.html` / `src/app.js`. Tests : `test/combat-pin.test.mjs` (fonctionnalité disponible ou non, affichage et navigation des tours, libération des événements après fermeture).



## v1.5 — Deuxième mode : Combat assisté (choix libre + meilleure suite)

**Le mode « Rotation rapide » existant reste inchangé.** Dans Optimisation, utiliser **⚡ Combat assisté** pour ouvrir un panneau latéral compact ; le bouton ↗ ouvre la même interface en petite fenêtre redimensionnable. Le bouton 📌 tente l'épinglage au premier plan avec Document Picture-in-Picture (navigateur compatible).

### Utilisation

1. Sélectionner ton build, ses variantes, les PA et le nombre de tours.
2. Ouvrir **⚡ Combat assisté** ; OMBRE affiche le tour 1 et estime la meilleure suite pour les PA disponibles et jusqu'à 10 tours.
3. Cliquer sur les sorts réellement joués, dans l'ordre. Le moteur déduit les PA et filtre les sorts selon les relances, limites de lancer, portée et variantes. Il recalcule une proposition **sans effacer tes actions**.
4. Cliquer sur **Tour suivant** pour conserver les buffs, poisons, relances, états et autres mécanismes suivis puis renouveler les PA.
5. Utiliser **Annuler** pour revenir sur les choix, **Recommencer** pour réinitialiser le combat ; cliquer sur un sort conseillé l'ajoute à tes actions comme un sort joué.

L'historique des tours et des sorts joués est sauvegardé par build dans localStorage. Si les paramètres ou variantes changent, une nouvelle session est initialisée pour éviter les combinaisons obsolètes.

### Architecture technique

- src/engine.js : optimizeFromState() reprend la recherche à partir d'un état reconstruit depuis les actions choisies, au lieu de recommencer le combat.
- src/assist-core.js : sauvegardes, rejeu des sorts avec eligible/castSpell, changement de tour via endTurn et calcul des sorts actuellement légaux.
- src/assist-worker.js : calcul en arrière-plan, faisceau rapide de 16 états maximum pour conserver un bon délai en combat ; horizon restant conservé.
- combat-assiste.html / src/assist.js / assist.css : interface compacte responsive, propositions, mini-fenêtre et épingle optionnelle.
- La page principale ouvre ce même mode dans une colonne latérale via iframe, sans maintenir deux implémentations.

### Limites

Le modèle reste **expérimental** : PV et Souffrance Sacrieur, obstacles, placement des pièges, soins, boucliers, zones et lignes de vue réelles incomplets. Aucune lecture de l'état du jeu en direct ni action automatique. Le joueur doit choisir manuellement les sorts vraiment lancés. Les rotations conseillées sont des estimations, pas une garantie de DPS optimal.

Tests : test/assist-core.test.mjs.


## v1.6 — Correction fenêtre vide et épingle du Combat assisté

Deux problèmes de la v1.5 sont corrigés :

- **La fenêtre détachable devenait vide lors de l'épinglage** car son élément racine était déplacé (append du DOM existant) dans Document Picture-in-Picture. L'origine garde maintenant toute son interface. Le PiP charge une vue indépendante via une iframe même origine ; l'historique reste synchronisé via le stockage local par build.
- **Erreur « requestWindow is only allowed from a top-level browsing context »** : l'épingle située dans l'iframe du panneau latéral appelait une API interdite dans les frames. Le panneau possède désormais une épingle dans son en-tête, sur la page principale, qui déclenche la demande depuis le contexte de navigation de premier niveau. L'épingle intérieure est masquée dans les cadres.
- Cliquer sur **↗** dans le panneau intégré ouvre la fenêtre détachable puis ferme le panneau pour éviter deux vues visibles simultanément. Dans la vue épinglée, le bouton ↗ est masqué pour éviter des fenêtres supplémentaires.

**Utilisation conseillée :** ouvrir ⚡ Combat assisté puis cliquer directement sur l'épingle **dans le bandeau supérieur du panneau latéral**. Il n'est plus nécessaire de passer par ↗. La petite fenêtre indépendante peut également être épinglée ; elle reste alors remplie à l'arrière-plan tant que le PiP est actif (le navigateur impose de conserver sa fenêtre d'origine ouverte).

Compatibilité : Chrome/Edge de bureau sur HTTPS avec Document Picture-in-Picture. Une page web ne peut pas forcer une fenêtre Chrome classique à rester toujours devant ; le PiP est géré par le navigateur. Le jeu en plein écran exclusif peut masquer l'overlay.

Fichiers : `src/assist-pin.js`, `src/assist.js`, `src/app.js`, `index.html`, `combat-assiste.html`, `combat.css`. Tests de non-régression : `test/assist-pin.test.mjs`.

## v1.7 — Régler les PA disponibles pour chaque tour (Combat assisté)

Dans **⚡ Combat assisté**, juste sous le compteur du tour, le champ **PA disponibles au total pour ce tour** accepte de **1 à 30 PA**, avec deux boutons `−` et `+` et un bouton `↺` pour revenir aux PA habituels du build.

- Il s'agit des **PA totaux du tour**, pas des PA restants. Si tu as dépensé 4 PA sur un tour initialement à 12 PA et que tu passes le total à 14 PA, le compteur devient **10 / 14 PA**.
- Les sorts déjà joués restent enregistrés et leurs contraintes de relance/lancer restent appliquées. Le moteur relance immédiatement son optimisation à partir du tour actuel avec le nouveau budget.
- Les autres tours conservent les PA du build (par exemple 12 PA), sauf si tu définis une valeur différente pour eux.
- Le réglage du tour est sauvegardé dans l'historique local du combat (`turnPA`) avec les sorts joués : il reste disponible après rechargement et dans les fenêtres compactes / épinglées du même build.
- Un nombre inférieur aux PA **déjà dépensés** est refusé pour éviter d'invalider l'historique. Valeurs permises : nombres entiers de 1 à 30.
- Le bouton `↺` annule seulement la modification de PA de ce tour ; il ne modifie ni les PA du build ni les autres tours.

**Technique :** `turnActionPoints(settings,turn)` contrôle les PA au début de chaque tour, le comptage des PA dépensés et la recherche. `setAssistTurnPA()` valide et sauvegarde la modification, et `replayAssist()` rejoue l'historique avec les budgets spécifiques. Le nouveau champ de l'historique n'affecte pas l'identité du build ni la migration des anciennes sessions.

Test ajouté : `test/assist-pa.test.mjs`. Les limites de simulation des mécaniques DOFUS restent inchangées.

## v1.8 — Matryoshka, Sram Air : caractéristiques et audit des 44 sorts (22 octobre 2026)

Le build Sram de référence est renommé **Matryoshka** (si le nom existant était encore « Mon Sram ») et récupère les caractéristiques de la capture : **4 065 PV, 12 PA, 5 PM, 5 de Portée, 1 645 Agilité, 160 Puissance, +17 Critique, +153 dommages Air, +33 dommages critiques et 430 Sagesse**. Toutes les autres résistances et statistiques secondaires de la capture sont stockées dans `src/character-stats.js`.

Les **22 variantes activées** visibles avec le fond clair sur la capture ont été consignées dans `SRAM_SCREENSHOT_VARIANTS` dans `src/sim-spells.js`. Le build de référence utilise cette sélection ; seule une ancienne sélection DofusBook inchangée est migrée automatiquement. Les variantes déjà personnalisées ne sont jamais remplacées. Les autres builds Sram sont indépendants.

### 44 effets de sorts relus

Voir [l'audit complet](./SRAM_OPENDB_AUDIT_2026-10-22.md) : **44 descriptions Sram**, avec 15 liens individuels confirmés vers OpenDofusDB et la page classe OpenDofusDB pour les 29 autres. Source secondaire : guide Dofus Grimoire 3.7. Chaque fiche indique aussi ce que le calculateur sait réellement simuler.

Corrections principales : **Arnaque (+100 Agilité), Extorsion (+100 Force), Pillage (+100 Chance), Fourberie (+100 Intelligence)** au dernier rang à la place des anciens buffs +40. Détails revus notamment pour Toxines, Guet-apens, Méprise, Fosse Commune, Piège Effroyable et Perquisition.

**Limite importante :** ces quatre vols de caractéristiques sont représentés comme buffs offensifs du lanceur, mais le vol adverse et les PV soignés ne sont pas pris en compte. La progression de Toxines sur déclenchement de pièges reste partiellement approximative ; le passif de fin d'Invisibilité, les déplacements, les réseaux et zones restent non fiables sans carte. Il ne faut pas considérer 44 fiches relues comme 44 simulations mécaniques exactes.

**Calculs :** les statistiques du personnage NE sont PAS réappliquées sur les dégâts DofusBook déjà pré-calculés (évite le double comptage). Le moteur conserve son modèle de critique approximatif en attendant un calcul depuis les dégâts de base réels de chaque sort, du rang et de l'équipement.

Tests : `test/character-stats.test.mjs`, `test/sram-2026-10-22.test.mjs` et `test/spell-effects-audit.test.mjs`.

## v1.9 — Combat assisté multi-cibles (module autonome)

**Le mode existant Combat assisté monocible et la Rotation rapide restent inchangés.** Le bouton **⬡ Combat multi-cibles ↗** dans les résultats ouvre une page indépendante : [multi-combat.html](./multi-combat.html).

### Fonctions

- Grille **9 × 9 approximative**, personnage bleu et jusqu'à **8 monstres rouges**. Choix du nombre de monstres, des positions et de leurs PV.
- Sélection des builds existants Sram / Sacrieur (variantes exclusives et calibrations du navigateur conservées).
- Gabarits de zones **personnalisables** pour chaque sort : cible unique, croix 1 case, carré 1 case, rayon 2 ou ligne 2. Les formes par défaut sont **des hypothèses**, et non les formes officielles du jeu.
- Sorts joués manuellement, sélection d'un monstre ciblé sur la grille, suivi des PA, buffs, poisons par cible et relances.
- Calcul d'une suite estimée maximisant les **dégâts cumulés sur l'ensemble des ennemis**, sur 1 à 10 tours (3 par défaut). Proposition après chaque sort, possibilité d'annuler ou de passer au tour suivant.
- PA du tour ajustables, dégâts théoriques par monstre et limite des dégâts aux PV estimés saisis.
- Sauvegarde indépendante des placements et de l'historique par build ; épingle Picture-in-Picture sur navigateur PC compatible.

### Architecture

Les nouveaux fichiers sont **src/multi-core.js**, **src/multi-worker.js**, **src/multi.js**, **multi-combat.html** et **multi-combat.css**. Le code de l'assistant monocible n'est pas modifié : un seul lien supplémentaire est ajouté dans index.html. Les tests de régression sont dans **test/multi-core.test.mjs**.

### Limites importantes

Les positions sont des repères approximatifs et les monstres sont considérés immobiles. Pas d'obstacles, de vrai calcul de ligne de vue, de carte DOFUS, de mouvements dynamiques ou de formes de zones officielles. La recherche vise seulement les cases occupées par un monstre (pas les centres sur cases libres). Les sorts de piège et autres invocations placées sur une case libre sont **exclus des propositions automatiques** : aucune activation fictive de piège n'est ajoutée aux dégâts. La propagation réelle d'Épidémie, les interactions du Double, les soins, le vol de vie, les dégâts de zone dégressifs et la Souffrance du Sacrieur restent incomplets. Chaque ennemi pris dans un gabarit reçoit provisoirement la même estimation de dommages directs, sans modélisation d'atténuation spatiale.

**Les propositions sont expérimentales : les valeurs ne garantissent pas le meilleur tour DOFUS réel.**

## v2.0 — Visualisation des zones de sorts sur la grille multi-cibles

Cette évolution concerne **UNIQUEMENT** le module `multi-combat.html`. Le module `combat-assiste.html` (monocible), l'optimiseur traditionnel et les sauvegardes associées sont laissés intacts.

### Exemple vérifié : Fourvoiement

**Fourvoiement (Sram rang 2, 4 PA, portée 0–5) frappe les quatre cellules orthogonales autour de la case visée, MAIS PAS la case centrale.** Le joueur peut viser une case vide, y compris sa propre position, et toucher les quatre ennemis adjacents à ce centre. La grille affiche les cellules touchées en rouge et la case visée avec une bordure claire. Cette forme est corroborée par [OpenDofusDB](https://openddb.dev/spells/12909-fourvoiement) et [Dofus Grimoire 3.7](https://dofus-grimoire.fr/classes/sram/).

### Tous les sorts, avec niveau de validation explicite

- Le nouveau catalogue `src/spell-zones.js` fournit un profil pour **44 sorts Sram et 44 sorts Sacrieur**. Il distingue **34 géométries vérifiées**, **4 indicatives** et **50 non vérifiées**, ces dernières utilisant volontairement une seule cellule tant que leurs zones exactes ne sont pas documentées. Ce décompte porte sur les gabarits, **PAS** sur 88 mécanismes de dégâts complets.
- La grille affiche le centre de lancer, la zone d'effet, les cases pouvant servir de centre et, pour Épidémie, un aperçu différent des cases voisines susceptibles de recevoir son effet. Les pièges posés manuellement laissent un marqueur ◇. Aucun dégât de piège n'est créé automatiquement sans déclenchement simulé.
- Sram : Fourvoiement (croix sans centre), Fourberie (anneau), Épidémie (propagation différée approximative), plusieurs pièges et invocations, plus des formes prudentes pour les autres sorts.
- Sacrieur : Furie (croix), Douleur Cuisante (croix de 2), Fulgurance (ligne du lanceur), Carnage (ligne de 2), Bain de Sang (carré autour du lanceur), Désolation (demi-cercle orienté, approximation), etc.
- Il est désormais possible de viser une **case vide** avec les sorts de zone appropriés, et de placer manuellement les sorts de type piège/invocation sur une case libre. Les propositions automatiques n'attribuent pas de dégâts de piège non déclenché.
- Les **22 paires de variantes** du build apparaissent dans un volet dédié à ce module : changer une variante n'écrase pas les choix du personnage enregistrés dans la page principale.
- Le menu de géométrie permet de tester d'autres formes comme une croix sans centre, un cercle, un anneau ou une ligne. Il signale si une forme est confirmée par la source ou personnalisée.

### Limites

Les zones sont dessinées sur une grille orthogonale abstraite 9 × 9 : ce n'est pas une carte DOFUS et il n'y a pas de vrais obstacles/ligne de vue, de déplacement d'ennemis, de gestion complète des poussées et déplacements, ni de véritable activation de réseau de pièges. La transmission du poison Épidémie entre les cibles est encore un modèle simplifié, et ses effets exacts doivent être vérifiés avec les logs du jeu. Les soins, PV/Souffrance Sacrieur, effets sur alliés et dégâts de zones dégressifs ne sont pas reproduits exactement. Une forme vérifiée ne garantit pas que **tous les effets du sort** le soient.

Tests : `test/spell-zones.test.mjs` et `test/multi-core.test.mjs`, comprenant la croix de Fourvoiement avec une case centrale vide.


## v2.1 — Combat multi-cibles intégré à OMBRE et lié au build actif

**Le bouton « ⬡ Combat multi-cibles » ouvre maintenant un grand panneau directement dans OMBRE**, avec la grille et les recommandations dans l'application. Il n'ouvre plus automatiquement de nouvel onglet. Une fenêtre détachable reste disponible en cliquant « ↗ Fenêtre » en haut du panneau (épingle du navigateur possible si compatible).

### Liaison avec OMBRE

- Depuis `src/app.js`, à chaque ouverture, la page transmet le **build actif** au nouveau stockage de contexte `ombre-multi-context-v2` via `src/multi-build-link.js`. La transmission recopie exactement les paramètres de `appliedSettings()` et les sorts déjà calibrés de `applyCalibration()` et/ou modifiés dans « Dégâts des sorts ».
- Le contexte contient les caractéristiques enregistrées du personnage, le nombre de PA de base, le niveau de critique et ses paramètres activés, les résistances par élément, les 22 variantes choisies, les buffs configurés et les quatre valeurs de dommages normaux/critiques de chaque sort. **Les caractéristiques ne sont pas rajoutées une seconde fois aux dégâts DofusBook déjà calculés.**
- Le sélecteur de build, les PA de base et les variantes affichées dans le module sont **en lecture seule** : ils sont contrôlés depuis OMBRE. Le compteur de PA **du tour courant** reste modifiable (comme dans le Combat assisté monocible). L'horizon multi-cibles peut rester plus court pour accélérer le calcul, sans modifier l'horizon du build enregistré.
- Pendant que le panneau est ouvert, modifier les paramètres, variantes, caractéristiques, calibrations ou lignes de dégâts dans OMBRE met à jour le contexte. Les actions multi-cibles sont réinitialisées si les paramètres utilisés dans le calcul changent ; le placement des monstres est conservé.
- La grille et les actions du combat restent sauvegardées **séparément par build** dans `ombre-multi-battle-v1:<build id>`. Le code et l'historique de `combat-assiste.html` / `src/assist.js` sont préservés.

### Précision des dégâts

Le mode multi-cibles utilise la même fonction `castSpell` de `src/engine.js` pour les dégâts directs et les buffs. Depuis la v2.1, les poisons utilisent aussi la **valeur de base réellement calculée par la fonction `dot` dans le moteur OMBRE**, au lieu d'une deuxième formule de dégâts divergente. Dans le test d'une seule cible avec 20 % de résistances Air, **Arnaque** donne la même estimation de 564,9 dégâts directs et **Épidémie** la même estimation de 710 dégâts par déclenchement dans les deux modes.

**Important :** sur plusieurs cibles, la forme de zone reste approximative lorsqu'elle n'est pas confirmée, et le simulateur ne reproduit toujours pas intégralement les effets de placement, la ligne de vue, les réseaux de pièges, la Souffrance, les interactions de poisons et les soins. La comparaison à une cible vérifie la cohérence du calcul, pas une garantie de précision en combat réel.

Tests supplémentaires : `test/multi-build-link.test.mjs` ; le module mono-cibles n'a pas été modifié.


## v2.2 — Coordonnées visibles dans le Combat multi-cibles

- Les 81 cases de la grille 9 × 9 affichent désormais **leurs coordonnées (x,y) en petit en haut à gauche**, sans survol de souris : de `1,1` à `9,9`. Ce sont les **mêmes coordonnées 1-based que dans la suite conseillée** (par exemple `Fourvoiement → (6,4)`).
- Les coordonnées restent lisibles sur **les cases bleues du personnage, les monstres rouges, les zones des sorts et les cases vides**. Les pions ne sont pas déplacés.
- Une case à cocher **« Afficher les coordonnées (x,y) »** située au-dessus de la grille permet de masquer ou réafficher les numéros.
- La préférence est sauvegardée dans `localStorage` sous `ombre-multi-show-coordinates-v1` et synchronisée entre fenêtres du même site.
- C'est un changement **uniquement visuel** dans le module multi-cibles : ni recalcul des dégâts, ni réinitialisation de tour, ni modification du Combat assisté monocible.

Vérification de l'interface : 81 étiquettes affichées par défaut, `1,1` et `9,9` présents, disparition des seules étiquettes après décochage, et aucun nouveau calcul lancé.
