import {ECAFLIP_SPELLS,ECAFLIP_SOURCE} from "./ecaflip-spells.js?v=3.24";
/** Référentiel d'effets de classe : 44 Sram + 44 Sacrieur.
 * Mise à jour Sram : 22 octobre 2026, OpenDofusDB 3.7.12.12
 * Une description répertoriée ne signifie pas que le moteur reproduit cet effet.
 * Les liens vers la page classe sont utilisés lorsqu'une URL précise n'a pas été vérifiée.
 */
const ECAFLIP_EFFECT_AUDIT=Object.fromEntries(ECAFLIP_SPELLS.map(spell=>[
 spell.name,{
  description:spell.utility||spell.conditionalDamage||
   (spell.drawCard?
    "Sort élémentaire Écaflip : "+spell.cardSource+" ; ses dégâts de base sont documentés, les effets annexes restent partiels.":
    spell.ecaflipRekop?
     "Rekop consomme une main gagnante de cartes pour ses dégâts, selon les combinaisons de rangs et couleurs.":
     "Sort Écaflip figurant sur la capture du personnage ; effet chiffré incomplet, vérifier la fiche avant simulation."),
  checked:spell.modelingConfidence==="verified-base-damage",
  source:ECAFLIP_SOURCE,
  simulation:spell.ecaflipRekop?"Combinaison de cartes et dommages estimés":
   spell.modelingConfidence==="verified-base-damage"?"Dégâts directs calculés depuis le build actif; effets conditionnels incomplets":
   "Sort visible, mais effets non chiffrés ou tirages non simulés",
  sourceClass:"Dofus Grimoire 3.7.12 et capture Karuta 24/10/2026",
  sourceRank:"Rang de niveau 200 lorsque confirmé",
  verified:spell.modelingConfidence==="verified-base-damage"?
   "Jets de base documentés, conditions secondaires à vérifier":
   "Détails et aléatoires non complètement vérifiés"
 }
]));
export const SPELL_EFFECTS_AUDIT = {
  ecaflip:ECAFLIP_EFFECT_AUDIT,
  "sacrieur": {
    "Supplice": {
      "description": "Vol de vie Terre ; effet de soin sur les attaquants désormais nul (0 %).",
      "checked": true,
      "source": "https://openddb.dev/spells/12725-supplice",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Nervosité": {
      "description": "Rang 2 : +7 % Critique pendant 3 tours après les dégâts Eau de zone ; 2 lancers par tour.",
      "checked": true,
      "source": "https://openddb.dev/spells/12727-nervosite",
      "simulation": "buff critique appliqué, zone absente",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Stase": {
      "description": "Rang 3 : vol de vie Eau et −20 % de Critique à la cible.",
      "checked": true,
      "source": "https://openddb.dev/spells/12728-stase",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Douleur Cuisante": {
      "description": "Rang 2 : +60 Puissance pendant 3 tours après dégâts Feu de zone ; 2 lancers par tour.",
      "checked": true,
      "source": "https://openddb.dev/spells/12730-douleur-cuisante",
      "simulation": "buff Puissance appliqué, zone absente",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Absorption": {
      "description": "Vol de vie Feu ; retrait de Puissance sur ennemi ou transfert de PV à allié.",
      "checked": true,
      "source": "https://openddb.dev/spells/12734-absorption",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Furie": {
      "description": "+3 % de dommages finaux pendant 3 tours au rang 2, cumul maximum 2 ; dommages Air en zone (source : capture du jeu).",
      "checked": true,
      "source": "https://openddb.dev/spells/12723-furie",
      "simulation": "buff final appliqué, zone absente",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Hémorragie": {
      "description": "Vol de vie Air ; diminue les soins reçus par la cible.",
      "checked": true,
      "source": "https://openddb.dev/spells/12748-hemorragie",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Décimation": {
      "description": "Rang 2 : dégâts Terre de zone et dommages subis par la cible ×103 % ; durée de l'effet et ciblage à confirmer.",
      "checked": true,
      "source": "https://openddb.dev/classes/11-sacrieur",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Attirance": {
      "description": "Attire la cible ; puissance de l'attirance et portée améliorées en Souffrance 6+.",
      "checked": true,
      "source": "https://openddb.dev/spells/12735-attirance",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Perfusion": {
      "description": "Transfert de vie aux alliés et état qui les soigne selon les coups subis ; transfert désactivé en Souffrance 6+.",
      "checked": true,
      "source": "https://openddb.dev/spells/12758-perfusion",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Mutilation": {
      "description": "Rang 3 : coût 10 % PV, +150 Puissance immédiate, état Mutilation 1/3→3/3 ; relancer active Coagulation (bouclier selon l'état).",
      "checked": true,
      "source": "https://openddb.dev/spells/12737-mutilation",
      "simulation": "buff Puissance immédiat et progression d'état, PV et bouclier non calculés",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Pacte de Sang": {
      "description": "Rang 2 : +25 % Vitalité et +100 Puissance pendant 3 tours, coût 2 PA, relance 2 tours (capture du jeu).",
      "checked": true,
      "source": "https://openddb.dev/spells/12762-pacte-de-sang",
      "simulation": "buff Puissance calculé, Vitalité notée sans PV",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Épée Vorace": {
      "description": "Invoque une épée contrôlable qui vole de la vie Neutre.",
      "checked": true,
      "source": "https://openddb.dev/spells/12744-epee-vorace",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Épée Dansante": {
      "description": "Invoque une épée contrôlable : placement, attirance, échange et dégâts Neutre.",
      "checked": true,
      "source": "https://openddb.dev/spells/12765-epee-dansante",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Ravage": {
      "description": "Approche du lanceur vers la cible et dégâts Terre.",
      "checked": true,
      "source": "https://openddb.dev/spells/12746-ravage",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Fulgurance": {
      "description": "Téléportation vers la cible et dégâts Air en zone.",
      "checked": true,
      "source": "https://openddb.dev/spells/12724-fulgurance",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Assaut": {
      "description": "Échange de positions avec la cible et dégâts Air.",
      "checked": true,
      "source": "https://openddb.dev/spells/12733-assaut",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Aversion": {
      "description": "Dégâts Feu et recul d'une case en zone.",
      "checked": true,
      "source": "https://openddb.dev/classes/11-sacrieur",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Transposition": {
      "description": "Échange de positions ; portée accrue en Souffrance 6+.",
      "checked": true,
      "source": "https://openddb.dev/spells/12736-transposition",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Fluctuation": {
      "description": "État Intaclable et bonus de PM, augmentés en Souffrance 6+.",
      "checked": true,
      "source": "https://openddb.dev/spells/12763-fluctuation",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Condensation": {
      "description": "Dégâts Eau et attire en zone vers le lanceur.",
      "checked": true,
      "source": "https://openddb.dev/spells/12745-condensation",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Afflux": {
      "description": "Dégâts Terre et attire vers le centre en zone.",
      "checked": true,
      "source": "https://openddb.dev/spells/12729-afflux",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Hostilité": {
      "description": "Dégâts Feu ; repousse de 2 cases.",
      "checked": true,
      "source": "https://openddb.dev/spells/12756-hostilite",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Projection": {
      "description": "Téléporte symétriquement par rapport à la cible ; dégâts Eau.",
      "checked": true,
      "source": "https://openddb.dev/spells/12726-projection",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Couronne d'Épines": {
      "description": "Pesanteur, bouclier et renvoi de dégâts de mêlée ; bouclier additionnel en Souffrance 6+.",
      "checked": true,
      "source": "https://openddb.dev/spells/12761-couronne-d-epines",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Pilori": {
      "description": "Bouclier, Indéplaçable ; soin conditionné par des dégâts de mêlée et Souffrance.",
      "checked": true,
      "source": "https://openddb.dev/spells/14011-pilori",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Transfusion": {
      "description": "Rang 3 : dommages Neutre correspondant à 10 % des PV du lanceur et transfert de PV aux alliés.",
      "checked": true,
      "source": "https://openddb.dev/spells/12738-transfusion",
      "simulation": "PV du lanceur non simulés",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Liens du Sang": {
      "description": "Rapprochement initial et réactif vers une cible ; effets amplifiés en Souffrance 6+.",
      "checked": true,
      "source": "https://openddb.dev/spells/12754-liens-du-sang",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Dissolution": {
      "description": "Rang 3 : vol Eau en zone et −30 Fuite durant 1 tour.",
      "checked": true,
      "source": "https://openddb.dev/spells/12757-dissolution",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Carnage": {
      "description": "Dégâts Air en zone pour un coût de 10 % PV du lanceur, 2 lancers par tour.",
      "checked": true,
      "source": "https://openddb.dev/spells/12752-carnage",
      "simulation": "dégâts directs ; coût PV non déduit",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Désolation": {
      "description": "Rang 3 : vol Air en zone et −3 PM pendant 1 tour.",
      "checked": true,
      "source": "https://openddb.dev/spells/12753-desolation",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Déchaînement": {
      "description": "Dégâts Eau en zone pour un coût de 10 % PV du lanceur, 2 lancers par tour.",
      "checked": true,
      "source": "https://openddb.dev/classes/11-sacrieur",
      "simulation": "dégâts directs ; coût PV non déduit",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Sacrifice": {
      "description": "Intercepte les dégâts reçus par les alliés ; peut détruire des Épées pour transférer leur vie.",
      "checked": true,
      "source": "https://openddb.dev/spells/12739-sacrifice",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Pénitence": {
      "description": "Échange de positions et échanges réactifs suivant l'entité qui reçoit des dégâts.",
      "checked": true,
      "source": "https://openddb.dev/classes/11-sacrieur",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Bain de Sang": {
      "description": "Rang 2 : vol Terre en zone et +15 Tacle par entité touchée durant 1 tour.",
      "checked": true,
      "source": "https://openddb.dev/spells/12732-bain-de-sang",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Immolation": {
      "description": "Dégâts Feu en zone pour un coût de 10 % PV du lanceur, 2 lancers par tour.",
      "checked": true,
      "source": "https://openddb.dev/spells/12747-immolation",
      "simulation": "dégâts directs ; coût PV non déduit",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Hécatombe": {
      "description": "Vol de vie Feu de zone ; réduction des soins reçus.",
      "checked": true,
      "source": "https://openddb.dev/spells/12750-hecatombe",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Entaille": {
      "description": "Dégâts Terre au contact pour un coût de 10 % PV du lanceur, 2 lancers par tour.",
      "checked": true,
      "source": "https://openddb.dev/spells/12751-entaille",
      "simulation": "dégâts directs ; coût PV non déduit",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Libation": {
      "description": "Sacrifie 30 % de PV, raccourcit les effets et soigne au tour suivant selon la Souffrance.",
      "checked": true,
      "source": "https://openddb.dev/spells/12759-libation",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Châtiment": {
      "description": "Dégâts Neutre de zone calculés sur 15 % des PV du lanceur et sacrifice de 15 % des PV.",
      "checked": true,
      "source": "https://openddb.dev/spells/12760-chatiment",
      "simulation": "PV du lanceur non simulés",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Berserk": {
      "description": "Rang 2 : coût 70 % PV ; état Berserk avec Intaclable, +10 % dommages aux sorts et soins reçus ×30 %, retiré en Souffrance ≤5 ou par relance.",
      "checked": true,
      "source": "https://openddb.dev/spells/12743-berserk",
      "simulation": "conditions de Souffrance et PV non simulées",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Rituel de Jashin": {
      "description": "Glyphe-aura et états reliant les dégâts subis par lanceur et cible.",
      "checked": true,
      "source": "https://openddb.dev/spells/14000-rituel-de-jashin",
      "simulation": "effet secondaire partiellement ou non simulé",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Punition": {
      "description": "Dégâts dans le meilleur élément et dégâts Neutre additionnels équivalant à 30 % des PV érodés.",
      "checked": true,
      "source": "https://openddb.dev/spells/12741-punition",
      "simulation": "PV érodés non simulés",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    },
    "Folie Sanguinaire": {
      "description": "Vol de vie dans le meilleur élément en zone sans dégressivité de zone, relance de 3 tours.",
      "checked": true,
      "source": "https://openddb.dev/spells/12740-folie-sanguinaire",
      "simulation": "meilleur élément et vol de vie non calculés",
      "sourceClass": "OpenDofusDB • données de jeu 3.7.12.12",
      "sourceRank": "Effets décrits pour le dernier rang si précisé ; sinon vérifier sur la fiche",
      "verified": "effets répertoriés ; tous les rangs et conditions non testés"
    }
  },
  "sram": {
    "Truanderie": {
      "description": "Rang 3 : vole 80 Puissance pendant 3 tours et inflige des dommages Terre. La cible perd la Puissance volée.",
      "checked": true,
      "source": "https://openddb.dev/spells/12902-truanderie",
      "simulation": "+80 Puissance simulé au rang 3 ; vol à l’ennemi absent",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Chausse-trappe": {
      "description": "Dommages Terre renforcés par les pièges déclenchés (+8 dégâts de base par charge au rang supérieur). Charges consommées au lancer.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Sournoiserie": {
      "description": "Dommages Feu et repousse la cible de 3 cases ; lancer en ligne.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Coupe-gorge": {
      "description": "Dommages Feu puis augmentation des dommages subis par la cible (jusqu’à x110 % au rang supérieur).",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "vulnérabilité simulée de manière simplifiée, durée/cible à vérifier",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Arsenic": {
      "description": "Poison Air au début du tour de la cible, avec retrait de Portée. Lancer en ligne et effet différé.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "poison différé simulé ; retrait de PO absent",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Toxines": {
      "description": "Poison Air de fin de tour. Si la cible subit des dégâts de piège pendant le poison, celui-ci est réappliqué et gagne jusqu’à 5 charges (+6 dégâts de base par charge au rang 2), une fois par tour.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "poison différé simulé ; croissance et réapplications sur pièges encore approximatives",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Cruauté": {
      "description": "Dommages Eau en zone et +1 PM au lanceur, dans les limites de cumul du sort.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Poisse": {
      "description": "Vol de vie Eau ; minimise les effets aléatoires de la cible, applique l’état Poisse. Les soins au lanceur ne sont pas simulés.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Invisibilité": {
      "description": "Rend invisible ; +2 PM si cible alliée. Relance globale. Quand elle prend fin, le passif L’Ombre de Sram peut donner +15 % Critique au lanceur.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "invisibilité simplifiée ; passif +15 % Critique non simulé",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Brume": {
      "description": "Pose un glyphe-aura qui rend les alliés invisibles et retire de la Portée aux ennemis (−4 PO au rang 2). Relance diminuée après un coup fatal.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "aura, perte de Portée et passif de coup fatal non simulés",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Double": {
      "description": "Invoque un double contrôlable ; à sa mort (fin de son 2e tour) échange de place avec le Sram et lui donne +2 PM.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "invocation simplifiée ; échange de place, PM et IA absents",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Comploteur": {
      "description": "Invoque un double contrôlable, qui inflige des dégâts dans le meilleur élément à son contact à la fin de son 3e tour ; +8 dégâts de base par piège déclenché depuis son invocation.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "dégâts si contact supposé ; invocation et position absentes",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège Sournois": {
      "description": "Piège Feu qui attire les entités vers son centre en zone au déclenchement.",
      "checked": true,
      "source": "https://openddb.dev/spells/12906-piege-sournois",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Guet-apens": {
      "description": "Vol de vie Eau et attirance de 2 cases, éventuellement depuis le Double. OpenDofusDB indique actuellement soin sur l’attaquant : 0 % (et non 25 %).",
      "checked": true,
      "source": "https://openddb.dev/spells/12939-guet-apens",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège Fangeux": {
      "description": "Piège Eau avec retrait de PM dans la zone du piège.",
      "checked": true,
      "source": "https://openddb.dev/spells/12916-piege-fangeux",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Épidémie": {
      "description": "Poison Air de fin de tour et état de propagation aux ennemis voisins ; peut se propager via le Sram et son Double, sauf invocations statiques.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "poison monocible simplifié ; propagation multi-cible absente",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège Funeste": {
      "description": "Piège Terre augmenté selon le nombre d’ennemis autour du piège avant son déclenchement.",
      "checked": true,
      "source": "https://openddb.dev/spells/12948-piege-funeste",
      "simulation": "bonus selon les ennemis autour du piège non simulé",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Effraction": {
      "description": "Dommages Feu ; vole 30 résistances Poussée à la cible et les octroie au Sram.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège Répulsif": {
      "description": "Piège Air repoussant les entités depuis son centre de 2 cases.",
      "checked": true,
      "source": "https://openddb.dev/spells/12914-piege-repulsif",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège Effroyable": {
      "description": "Piège Terre mono-cellule ; dommages Terre aux ennemis et repousse les entités de 2 cases depuis le centre. Deux lancers par tour.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège d'Immobilisation": {
      "description": "Piège de zone qui retire jusqu’à 4 PM au dernier rang ; relance 4 tours.",
      "checked": true,
      "source": "https://openddb.dev/spells/12910-piege-d-immobilisation",
      "simulation": "relance suivie ; retrait de PM et zone absents",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Fosse Commune": {
      "description": "Piège mono-cellule appliquant l’état Pesanteur aux entités de la zone, alliés compris ; relance 3 tours.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "relance suivie ; état Pesanteur et zone absents",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Extorsion": {
      "description": "Rang 3 : vole 100 Force pendant 3 tours et vole de la vie en Terre.",
      "checked": true,
      "source": "https://openddb.dev/spells/12938-extorsion",
      "simulation": "+100 Force simulée ; soins et retrait adverse absents",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Perquisition": {
      "description": "Dommages Feu et repousse la cible de 2 cases ; si le Double est présent, la poussée peut partir de lui.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Arnaque": {
      "description": "Rang 3 : vole de l’Agilité (100 au rang 3 selon le guide 3.7) et vole de la vie dans l’élément Air.",
      "checked": true,
      "source": "https://openddb.dev/spells/12911-arnaque",
      "simulation": "+100 Agilité (vol) appliquée au lanceur dans le modèle ; soins et retrait chez la cible absents",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Larcin": {
      "description": "Dommages Eau en zone et 13 % Érosion, sans affecter le lanceur.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Pillage": {
      "description": "Rang 3 : vole 100 Chance et vole de la vie Eau.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "+100 Chance simulée ; soins et retrait adverse absents",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Attaque Mortelle": {
      "description": "Dommages Terre renforcés lorsque la cible a moins de 50 % de ses PV.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Fourberie": {
      "description": "Rang 3 : vol de 100 Intelligence et vol de vie Feu dans un anneau de zone.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "+100 Intelligence simulée ; vol de vie et zone absents",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Injection Toxique": {
      "description": "Retire 1 PM et applique un poison Air de début de tour. Relance raccourcie à chaque piège déclenché du lanceur.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Peur": {
      "description": "Repousse une cible jusqu’à la case visée (pas toujours 2 cases) ; nécessite le placement exact.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "placement réduit à une approximation de distance, pas de grille",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Méprise": {
      "description": "Échange de place avec la cible, ou entre la cible et le Double si présent ; dissipe l’invisibilité.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "échange de cases et interaction du Double non simulés",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège de Dérive": {
      "description": "Piège Feu de zone, repousse les entités de 2 cases.",
      "checked": true,
      "source": "https://openddb.dev/spells/12942-piege-de-derive",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège Insidieux": {
      "description": "Piège Air infligeant des dommages Air, appliquant un poison Air de fin de tour et attirant vers le centre.",
      "checked": true,
      "source": "https://openddb.dev/spells/12918-piege-insidieux",
      "simulation": "placement et poison conditionnel au piège approximatifs",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège Scélérat": {
      "description": "Piège Eau mono-cellule, attirance vers le centre et dommages Eau en zone.",
      "checked": true,
      "source": "https://openddb.dev/spells/12931-piege-scelerat",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège à Fragmentation": {
      "description": "Piège Feu multi-anneaux : dégâts différents selon la distance au centre, peut affecter des alliés.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "zones et distances des anneaux non simulées",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Concentration de Chakra": {
      "description": "Place un effet sur une cible : chaque piège qui l’affecte déclenche un vol de vie dans le meilleur élément. Dissipe l’invisibilité.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "vol de vie proxy lors d’un déclenchement ; pas de modèle de cible",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Manigance": {
      "description": "Vole Fuite et Dommages à un ennemi ; accorde des bonus de Fuite et Dommages sur allié / lanceur.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "bonus Dommages approximé sur soi ; vol de Fuite et ciblage non simulés",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Piège Mortel": {
      "description": "Piège Terre ; dégâts accrus contre une cible sous 50 % PV.",
      "checked": true,
      "source": "https://openddb.dev/spells/12921-piege-mortel",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Calamité": {
      "description": "Piège Eau de zone qui vole la Fuite des ennemis dans la zone.",
      "checked": true,
      "source": "https://openddb.dev/spells/12950-calamite",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Fourvoiement": {
      "description": "Dommages Air en zone avec Érosion sur les cibles.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Perfidie": {
      "description": "Dommages Terre, coût diminué de 1 PA par piège déclenché (maximum 4, minimum 2 PA). Charges dépensées au lancer.",
      "checked": true,
      "source": "https://openddb.dev/spells/12949-perfidie",
      "simulation": "réduction des PA selon pièges déclenchés modélisée, placements non simulés",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Dérobade": {
      "description": "Réduit les dégâts subis par l’allié ciblé, le rend Intaclable ; lorsqu’il est attaqué, le repousse et lui donne des PM (effet réactif).",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "Dégâts directs ou effets du sort partiellement simulés ; placements, zones, vol de vie et états non garantis",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    },
    "Marque Mortuaire": {
      "description": "Applique Érosion et dégâts reçus augmentés selon les pièges déclenchés, jusqu’à x110 % et 30 % Érosion à 5 charges. Dissipe l’invisibilité.",
      "checked": true,
      "source": "https://openddb.dev/classes/4-sram",
      "simulation": "vulnérabilité initiale simplifiée ; paliers, érosion et réinitialisation d’invisibilité incomplets",
      "additionalSource": "https://dofus-grimoire.fr/classes/sram/",
      "sourceClass": "OpenDofusDB / DOFUS 3.7.12.12 ; rang supérieur recoupé avec Dofus Grimoire",
      "sourceRank": "Description des effets au dernier rang pour les nombres précisés ; contrôle du sort en jeu recommandé",
      "verified": "Relecture des effets généraux au 22/10/2026 ; vérification exhaustive des conditions et déclenchements en jeu non effectuée",
      "verificationDate": "2026-10-22"
    }
  }
};
