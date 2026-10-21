/** Référentiel d'effets en jeu : 44 Sacrieur, 44 Sram. Vérification au 21/10/2026.
 * Un effet décrit n'est pas forcément simulé ; attention aux différences de rang.
 * Source principale : https://openddb.dev/spells */
export const SPELL_EFFECTS_AUDIT = {
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
      "description": "Vol de Puissance sur ennemi ; dégâts Terre ; bonus de Puissance au lanceur.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Chausse-trappe": {
      "description": "Dégâts Terre renforcés pour chaque piège déclenché ; charges dépensées au lancer.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Sournoiserie": {
      "description": "Dégâts Feu et repousse de 3 cases.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Coupe-gorge": {
      "description": "Dégâts Feu et augmentation des dommages subis par la cible.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Arsenic": {
      "description": "Poison Air de début de tour ; retrait de Portée.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Toxines": {
      "description": "Poison Air de fin de tour ; dégâts de base cumulables (5) et réapplication sur activation de piège une fois par tour.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Cruauté": {
      "description": "Dégâts Eau en zone et gain de PM.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Poisse": {
      "description": "Vol de vie Eau ; minimise les dégâts aléatoires, soigne les alliés et impose un état limitant la minimisation.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Invisibilité": {
      "description": "Invisibilité de la cible, gain de PM sur allié ; relance réinitialisée après avoir achevé une cible.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Brume": {
      "description": "Glyphe-aura cachant des alliés, réduisant la Portée des ennemis ; recharge raccourcie sur coup fatal.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Double": {
      "description": "Double contrôlable ; meurt à la fin de son deuxième tour, échange de place et donne des PM.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Comploteur": {
      "description": "Double contrôlable ; meurt au troisième tour et inflige dégâts de contact dans le meilleur élément, renforcés par les pièges déclenchés.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège Sournois": {
      "description": "Piège Feu avec attirance en zone au déclenchement.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Guet-apens": {
      "description": "Vol de vie Eau ; attire cible vers soi ou Double et applique un soin sur les attaquants.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège Fangeux": {
      "description": "Piège Eau avec retrait de PM.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Épidémie": {
      "description": "Poison Air de fin de tour propagé aux ennemis proches ; le Sram et son Double peuvent relayer la propagation.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège Funeste": {
      "description": "Piège Terre renforcé selon le nombre d'ennemis autour du piège.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Effraction": {
      "description": "Dégâts Feu et transfert de résistances aux poussées.",
      "checked": false,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège Répulsif": {
      "description": "Piège Air qui repousse les entités depuis son centre.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège Effroyable": {
      "description": "Piège de contrôle/peur : conditions exactes à approfondir.",
      "checked": false,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège d'Immobilisation": {
      "description": "Piège qui retire les PM aux ennemis de la zone.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Fosse Commune": {
      "description": "Piège de contrôle : effets précis à approfondir.",
      "checked": false,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Extorsion": {
      "description": "Vol de Force et de vie Terre.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Perquisition": {
      "description": "Dégâts Feu et repousse la cible.",
      "checked": false,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Arnaque": {
      "description": "Vol de 40 Agilité sur 3 tours ; vol de vie Air.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Larcin": {
      "description": "Érosion en zone et dégâts Eau.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Pillage": {
      "description": "Vol de Chance et de vie Eau.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Attaque Mortelle": {
      "description": "Dégâts Terre plus élevés si la cible a moins de 50 % de ses PV.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Fourberie": {
      "description": "Vol d'Intelligence et vol de vie Feu en zone.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Injection Toxique": {
      "description": "-1 PM, poison Air de début de tour ; relance raccourcie pour chaque piège déclenché.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Peur": {
      "description": "Repousse une cible ; dégâts de poussée/obstacles non intégrés.",
      "checked": false,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Méprise": {
      "description": "Échange de positions/placement : conditions exactes à approfondir.",
      "checked": false,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège de Dérive": {
      "description": "Piège Feu qui repousse depuis son centre.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège Insidieux": {
      "description": "Piège Air : poison Air de fin de tour et attirance en zone.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège Scélérat": {
      "description": "Piège Eau mono-cellule : attire vers le centre et inflige dégâts en zone.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège à Fragmentation": {
      "description": "Piège Feu de zone à plusieurs anneaux ; dommages variables selon la distance.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Concentration de Chakra": {
      "description": "État déclenché par les dégâts de pièges ; vole de la vie dans le meilleur élément ; dévoile le lanceur.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Manigance": {
      "description": "Vol de Fuite et de Dommages contre un ennemi, bonus de Fuite et Dommages sur soi ou allié.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Piège Mortel": {
      "description": "Piège Terre plus puissant sur cibles sous 50 % PV.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Calamité": {
      "description": "Piège Eau en zone avec vol de Fuite.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Fourvoiement": {
      "description": "Dégâts Air en zone et Érosion.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Perfidie": {
      "description": "Dégâts Terre, coût en PA réduit par piège déclenché ; charges dépensées.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Dérobade": {
      "description": "Réduction des dégâts subis, Intaclable ; recul sans dégâts et gain de PM déclenchés sur attaque ennemie.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    },
    "Marque Mortuaire": {
      "description": "Érosion et augmentation des dégâts subis selon les pièges déclenchés ; dévoile le Sram.",
      "checked": true,
      "source": "https://dofus-grimoire.fr/classes/sram/",
      "simulation": "partielle"
    }
  }
};
