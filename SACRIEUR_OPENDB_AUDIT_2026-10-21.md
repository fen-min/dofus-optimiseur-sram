# Sacrieur — Audit des 44 sorts / DOFUS 3.7

**Mise à jour : 21 octobre 2026**. Références : [OpenDofusDB](https://openddb.dev/spells) (données de jeu 3.7.12.12), [liste des sorts Sacrieur](https://openddb.dev/classes/11-sacrieur), [Dofus Grimoire](https://dofus-grimoire.fr/classes/sacrieur/) et captures de sorts du jeu (Furie et Pacte de Sang, rang 2).

Chaque sort est documenté, mais **inventaire de ses effets ≠ simulation de tous ces effets**. Les pages OpenDofusDB affichent parfois le rang 1 par défaut ; les valeurs de rang supérieur ci-dessous proviennent des captures ou de comparaisons avec le guide 3.7, et doivent être validées en jeu si utilisées dans une simulation compétitive.

Le moteur OMBRE reste **mono-cible, sans carte**. Les PV, la Souffrance, les effets de soin, le déplacement, les invocations et les zones ne sont pas calculés entièrement. Les coûts en PV sont affichés et reconnus par la simulation, mais ils ne diminuent pas encore les PV et ne changent pas la Souffrance.

## Tous les sorts

| # | Sort et source | Effets notables | Couverture dans OMBRE |
|---:|---|---|---|
| 1 | [Supplice](https://openddb.dev/spells/12725-supplice) | Vol de vie Terre ; effet de soin sur les attaquants désormais nul (0 %). | effet secondaire partiellement ou non simulé |
| 2 | [Nervosité](https://openddb.dev/spells/12727-nervosite) | Rang 2 : +7 % Critique pendant 3 tours après les dégâts Eau de zone ; 2 lancers par tour. | buff critique appliqué, zone absente |
| 3 | [Stase](https://openddb.dev/spells/12728-stase) | Rang 3 : vol de vie Eau et −20 % de Critique à la cible. | effet secondaire partiellement ou non simulé |
| 4 | [Douleur Cuisante](https://openddb.dev/spells/12730-douleur-cuisante) | Rang 2 : +60 Puissance pendant 3 tours après dégâts Feu de zone ; 2 lancers par tour. | buff Puissance appliqué, zone absente |
| 5 | [Absorption](https://openddb.dev/spells/12734-absorption) | Vol de vie Feu ; retrait de Puissance sur ennemi ou transfert de PV à allié. | effet secondaire partiellement ou non simulé |
| 6 | [Furie](https://openddb.dev/spells/12723-furie) | +3 % de dommages finaux pendant 3 tours au rang 2, cumul maximum 2 ; dommages Air en zone (source : capture du jeu). | buff final appliqué, zone absente |
| 7 | [Hémorragie](https://openddb.dev/spells/12748-hemorragie) | Vol de vie Air ; diminue les soins reçus par la cible. | effet secondaire partiellement ou non simulé |
| 8 | [Décimation](https://openddb.dev/classes/11-sacrieur) | Rang 2 : dégâts Terre de zone et dommages subis par la cible ×103 % ; durée de l'effet et ciblage à confirmer. | effet secondaire partiellement ou non simulé |
| 9 | [Attirance](https://openddb.dev/spells/12735-attirance) | Attire la cible ; puissance de l'attirance et portée améliorées en Souffrance 6+. | effet secondaire partiellement ou non simulé |
| 10 | [Perfusion](https://openddb.dev/spells/12758-perfusion) | Transfert de vie aux alliés et état qui les soigne selon les coups subis ; transfert désactivé en Souffrance 6+. | effet secondaire partiellement ou non simulé |
| 11 | [Mutilation](https://openddb.dev/spells/12737-mutilation) | Rang 3 : coût 10 % PV, +150 Puissance immédiate, état Mutilation 1/3→3/3 ; relancer active Coagulation (bouclier selon l'état). | buff Puissance immédiat et progression d'état, PV et bouclier non calculés |
| 12 | [Pacte de Sang](https://openddb.dev/spells/12762-pacte-de-sang) | Rang 2 : +25 % Vitalité et +100 Puissance pendant 3 tours, coût 2 PA, relance 2 tours (capture du jeu). | buff Puissance calculé, Vitalité notée sans PV |
| 13 | [Épée Vorace](https://openddb.dev/spells/12744-epee-vorace) | Invoque une épée contrôlable qui vole de la vie Neutre. | effet secondaire partiellement ou non simulé |
| 14 | [Épée Dansante](https://openddb.dev/spells/12765-epee-dansante) | Invoque une épée contrôlable : placement, attirance, échange et dégâts Neutre. | effet secondaire partiellement ou non simulé |
| 15 | [Ravage](https://openddb.dev/spells/12746-ravage) | Approche du lanceur vers la cible et dégâts Terre. | effet secondaire partiellement ou non simulé |
| 16 | [Fulgurance](https://openddb.dev/spells/12724-fulgurance) | Téléportation vers la cible et dégâts Air en zone. | effet secondaire partiellement ou non simulé |
| 17 | [Assaut](https://openddb.dev/spells/12733-assaut) | Échange de positions avec la cible et dégâts Air. | effet secondaire partiellement ou non simulé |
| 18 | [Aversion](https://openddb.dev/classes/11-sacrieur) | Dégâts Feu et recul d'une case en zone. | effet secondaire partiellement ou non simulé |
| 19 | [Transposition](https://openddb.dev/spells/12736-transposition) | Échange de positions ; portée accrue en Souffrance 6+. | effet secondaire partiellement ou non simulé |
| 20 | [Fluctuation](https://openddb.dev/spells/12763-fluctuation) | État Intaclable et bonus de PM, augmentés en Souffrance 6+. | effet secondaire partiellement ou non simulé |
| 21 | [Condensation](https://openddb.dev/spells/12745-condensation) | Dégâts Eau et attire en zone vers le lanceur. | effet secondaire partiellement ou non simulé |
| 22 | [Afflux](https://openddb.dev/spells/12729-afflux) | Dégâts Terre et attire vers le centre en zone. | effet secondaire partiellement ou non simulé |
| 23 | [Hostilité](https://openddb.dev/spells/12756-hostilite) | Dégâts Feu ; repousse de 2 cases. | effet secondaire partiellement ou non simulé |
| 24 | [Projection](https://openddb.dev/spells/12726-projection) | Téléporte symétriquement par rapport à la cible ; dégâts Eau. | effet secondaire partiellement ou non simulé |
| 25 | [Couronne d'Épines](https://openddb.dev/spells/12761-couronne-d-epines) | Pesanteur, bouclier et renvoi de dégâts de mêlée ; bouclier additionnel en Souffrance 6+. | effet secondaire partiellement ou non simulé |
| 26 | [Pilori](https://openddb.dev/spells/14011-pilori) | Bouclier, Indéplaçable ; soin conditionné par des dégâts de mêlée et Souffrance. | effet secondaire partiellement ou non simulé |
| 27 | [Transfusion](https://openddb.dev/spells/12738-transfusion) | Rang 3 : dommages Neutre correspondant à 10 % des PV du lanceur et transfert de PV aux alliés. | PV du lanceur non simulés |
| 28 | [Liens du Sang](https://openddb.dev/spells/12754-liens-du-sang) | Rapprochement initial et réactif vers une cible ; effets amplifiés en Souffrance 6+. | effet secondaire partiellement ou non simulé |
| 29 | [Dissolution](https://openddb.dev/spells/12757-dissolution) | Rang 3 : vol Eau en zone et −30 Fuite durant 1 tour. | effet secondaire partiellement ou non simulé |
| 30 | [Carnage](https://openddb.dev/spells/12752-carnage) | Dégâts Air en zone pour un coût de 10 % PV du lanceur, 2 lancers par tour. | dégâts directs ; coût PV non déduit |
| 31 | [Désolation](https://openddb.dev/spells/12753-desolation) | Rang 3 : vol Air en zone et −3 PM pendant 1 tour. | effet secondaire partiellement ou non simulé |
| 32 | [Déchaînement](https://openddb.dev/classes/11-sacrieur) | Dégâts Eau en zone pour un coût de 10 % PV du lanceur, 2 lancers par tour. | dégâts directs ; coût PV non déduit |
| 33 | [Sacrifice](https://openddb.dev/spells/12739-sacrifice) | Intercepte les dégâts reçus par les alliés ; peut détruire des Épées pour transférer leur vie. | effet secondaire partiellement ou non simulé |
| 34 | [Pénitence](https://openddb.dev/classes/11-sacrieur) | Échange de positions et échanges réactifs suivant l'entité qui reçoit des dégâts. | effet secondaire partiellement ou non simulé |
| 35 | [Bain de Sang](https://openddb.dev/spells/12732-bain-de-sang) | Rang 2 : vol Terre en zone et +15 Tacle par entité touchée durant 1 tour. | effet secondaire partiellement ou non simulé |
| 36 | [Immolation](https://openddb.dev/spells/12747-immolation) | Dégâts Feu en zone pour un coût de 10 % PV du lanceur, 2 lancers par tour. | dégâts directs ; coût PV non déduit |
| 37 | [Hécatombe](https://openddb.dev/spells/12750-hecatombe) | Vol de vie Feu de zone ; réduction des soins reçus. | effet secondaire partiellement ou non simulé |
| 38 | [Entaille](https://openddb.dev/spells/12751-entaille) | Dégâts Terre au contact pour un coût de 10 % PV du lanceur, 2 lancers par tour. | dégâts directs ; coût PV non déduit |
| 39 | [Libation](https://openddb.dev/spells/12759-libation) | Sacrifie 30 % de PV, raccourcit les effets et soigne au tour suivant selon la Souffrance. | effet secondaire partiellement ou non simulé |
| 40 | [Châtiment](https://openddb.dev/spells/12760-chatiment) | Dégâts Neutre de zone calculés sur 15 % des PV du lanceur et sacrifice de 15 % des PV. | PV du lanceur non simulés |
| 41 | [Berserk](https://openddb.dev/spells/12743-berserk) | Rang 2 : coût 70 % PV ; état Berserk avec Intaclable, +10 % dommages aux sorts et soins reçus ×30 %, retiré en Souffrance ≤5 ou par relance. | conditions de Souffrance et PV non simulées |
| 42 | [Rituel de Jashin](https://openddb.dev/spells/14000-rituel-de-jashin) | Glyphe-aura et états reliant les dégâts subis par lanceur et cible. | effet secondaire partiellement ou non simulé |
| 43 | [Punition](https://openddb.dev/spells/12741-punition) | Dégâts dans le meilleur élément et dégâts Neutre additionnels équivalant à 30 % des PV érodés. | PV érodés non simulés |
| 44 | [Folie Sanguinaire](https://openddb.dev/spells/12740-folie-sanguinaire) | Vol de vie dans le meilleur élément en zone sans dégressivité de zone, relance de 3 tours. | meilleur élément et vol de vie non calculés |

## Effets chiffrés intégrés après vérification

- **Furie rang 2** : +3 % de dommages finaux pendant 3 tours, jusqu'à 2 cumuls, appliqués après les dégâts du lancer initial.
- **Pacte de Sang rang 2** : +100 Puissance pendant 3 tours et +25 % Vitalité. La Vitalité est affichée, mais ne modifie pas encore les PV simulés.
- **Douleur Cuisante rang 2** : +60 Puissance pendant 3 tours, cumul possible via ses 2 lancers par tour.
- **Nervosité rang 2** : +7 % de chances de coup critique pendant 3 tours ; ce bonus s'ajoute aux chances de critique des attaques suivantes.
- **Mutilation rang 3** : Puissance fixée à +150 dès le lancer ; suivi de l'état de progression Mutilation, et retrait du buff lors de la seconde incantation (Coagulation). PV et bouclier restent non chiffrés.
- **Bain de Sang rang 2** : +15 Tacle en contexte d'une cible, affiché comme effet, mais ne fournit pas de dégâts supplémentaires.

## Points non encore simulables sans mécanique de PV

- Les coûts et gains de PV, la Souffrance, les seuils de bonus de Souffrance 6+, les soins, les boucliers et les PV érodés.
- Les bonus de Berserk, conditionnés à un état de Souffrance et à un sacrifice de PV ; ne pas leur attribuer automatiquement un multiplicateur de DPS.
- Les invocations, les placements, les attaques en zone et les soins réactifs nécessitent une grille ou des cibles supplémentaires.

**Conclusion :** ce document complète la base de données du projet ; une simulation sur 10 tours n'est pas encore une prédiction exacte du journal de combat en jeu.