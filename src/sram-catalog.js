// Sorts de classe relevés sur le DofusBook du build Sram Air (20 octobre 2026).
// Attention : dégâts calculés par DofusBook pour ce contexte, PAS valeurs de base.
// Chaque ligne d'effet peut dépendre de charges/états/positions ; ne pas additionner les alternatives.
export const SRAM_CATALOG = [
  {
    "id": "12902",
    "name": "Truanderie",
    "level": 132,
    "pa": 3,
    "range": "1–6",
    "type": "Attaque",
    "elements": [
      "Terre"
    ],
    "critChance": 26,
    "details": [
      "PO modifiable",
      "3 lancer/tour",
      "2 lancer/cible",
      "2 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 118,
        "max": 129,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 161,
        "max": 176,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12932",
    "name": "Chausse-trappe",
    "level": 162,
    "pa": 4,
    "range": "1–4",
    "type": "Attaque",
    "elements": [
      "Terre"
    ],
    "critChance": 31,
    "details": [
      "3 lancer/tour",
      "2 lancer/cible",
      "5 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 125,
        "max": 140,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 172,
        "max": 186,
        "cc": true,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 154,
        "max": 169,
        "cc": false,
        "condition": "1 charge"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 201,
        "max": 215,
        "cc": true,
        "condition": "1 charge"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 183,
        "max": 197,
        "cc": false,
        "condition": "2 charges"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 230,
        "max": 244,
        "cc": true,
        "condition": "2 charges"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 212,
        "max": 226,
        "cc": false,
        "condition": "3 charges"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 258,
        "max": 273,
        "cc": true,
        "condition": "3 charges"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 241,
        "max": 255,
        "cc": false,
        "condition": "4 charges"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 287,
        "max": 302,
        "cc": true,
        "condition": "4 charges"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 269,
        "max": 284,
        "cc": false,
        "condition": "5 charges"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 316,
        "max": 330,
        "cc": true,
        "condition": "5 charges"
      }
    ]
  },
  {
    "id": "12904",
    "name": "Sournoiserie",
    "level": 133,
    "pa": 3,
    "range": "1–8",
    "type": "Attaque",
    "elements": [
      "Feu"
    ],
    "critChance": 26,
    "details": [
      "Lancer en ligne",
      "3 lancer/tour",
      "2 lancer/cible"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Feu",
        "min": 125,
        "max": 136,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Feu",
        "min": 172,
        "max": 183,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12935",
    "name": "Coupe-gorge",
    "level": 167,
    "pa": 4,
    "range": "1–7",
    "type": "Attaque",
    "elements": [
      "Feu"
    ],
    "critChance": 31,
    "details": [
      "3 lancer/tour",
      "2 lancer/cible",
      "1 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Feu",
        "min": 147,
        "max": 161,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Feu",
        "min": 194,
        "max": 208,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12907",
    "name": "Arsenic",
    "level": 134,
    "pa": 3,
    "range": "1–8",
    "type": "Poison",
    "elements": [
      "Air"
    ],
    "critChance": 26,
    "details": [
      "PO modifiable",
      "Lancer en ligne",
      "3 lancer/tour",
      "1 lancer/cible",
      "1 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 478,
        "max": 515,
        "cc": false,
        "condition": "Allié / Ennemi - Début de tour"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 558,
        "max": 614,
        "cc": true,
        "condition": "Allié / Ennemi - Début de tour"
      }
    ]
  },
  {
    "id": "12933",
    "name": "Toxines",
    "level": 172,
    "pa": 3,
    "range": "1–7",
    "type": "Poison",
    "elements": [
      "Air"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "1 lancer/tour",
      "1 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 310,
        "max": 347,
        "cc": false,
        "condition": "Ennemi - Fin de tour"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 422,
        "max": 459,
        "cc": false,
        "condition": "1 tour avec cible sous poison"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 533,
        "max": 571,
        "cc": false,
        "condition": "2 tours avec cible sous poison"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 645,
        "max": 683,
        "cc": false,
        "condition": "3 tours avec cible sous poison"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 757,
        "max": 794,
        "cc": false,
        "condition": "4 tours avec cible sous poison"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 869,
        "max": 906,
        "cc": false,
        "condition": "5 tours avec cible sous poison"
      }
    ]
  },
  {
    "id": "12919",
    "name": "Cruauté",
    "level": 136,
    "pa": 3,
    "range": "0–8",
    "type": "Attaque",
    "elements": [
      "Eau"
    ],
    "critChance": 26,
    "details": [
      "PO modifiable",
      "3 lancer/tour",
      "2 lancer/cible"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Eau",
        "min": 104,
        "max": 115,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Eau",
        "min": 143,
        "max": 158,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12922",
    "name": "Poisse",
    "level": 177,
    "pa": 4,
    "range": "1–5",
    "type": "Attaque",
    "elements": [
      "Eau"
    ],
    "critChance": 31,
    "details": [
      "PO modifiable",
      "1 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Vol",
        "element": "Eau",
        "min": 147,
        "max": 161,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Vol",
        "element": "Eau",
        "min": 197,
        "max": 215,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12913",
    "name": "Invisibilité",
    "level": 139,
    "pa": 2,
    "range": "0–6",
    "type": "Utilitaire",
    "elements": [],
    "critChance": null,
    "details": [
      "3 tour(s) de relance",
      "Relance globale"
    ],
    "effects": []
  },
  {
    "id": "12930",
    "name": "Brume",
    "level": 182,
    "pa": 3,
    "range": "0–3",
    "type": "Utilitaire",
    "elements": [],
    "critChance": null,
    "details": [
      "5 tour(s) de relance"
    ],
    "effects": []
  },
  {
    "id": "12915",
    "name": "Double",
    "level": 144,
    "pa": 3,
    "range": "1–3",
    "type": "Utilitaire",
    "elements": [],
    "critChance": null,
    "details": [
      "3 tour(s) de relance"
    ],
    "effects": []
  },
  {
    "id": "12936",
    "name": "Comploteur",
    "level": 187,
    "pa": 3,
    "range": "1–3",
    "type": "Invocation",
    "elements": [
      "Air"
    ],
    "critChance": null,
    "details": [
      "4 tour(s) de relance",
      "5 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 664,
        "max": 738,
        "cc": false,
        "condition": "Allié / Ennemi - Dans 3 tours"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 813,
        "max": 887,
        "cc": false,
        "condition": "1 charge"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 962,
        "max": 1036,
        "cc": false,
        "condition": "2 charges"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 1111,
        "max": 1186,
        "cc": false,
        "condition": "3 charges"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 1260,
        "max": 1335,
        "cc": false,
        "condition": "4 charges"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 1409,
        "max": 1484,
        "cc": false,
        "condition": "5 charges"
      }
    ]
  },
  {
    "id": "12906",
    "name": "Piège Sournois",
    "level": 149,
    "pa": 2,
    "range": "1–8",
    "type": "Piège",
    "elements": [
      "Feu"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "1 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Feu",
        "min": 86,
        "max": 93,
        "cc": false,
        "condition": ""
      }
    ]
  },
  {
    "id": "12939",
    "name": "Guet-apens",
    "level": 192,
    "pa": 3,
    "range": "0–6",
    "type": "Attaque",
    "elements": [
      "Eau"
    ],
    "critChance": 26,
    "details": [
      "PO modifiable",
      "3 lancer/tour",
      "2 lancer/cible",
      "1 cumul"
    ],
    "effects": [
      {
        "kind": "Vol",
        "element": "Eau",
        "min": 104,
        "max": 115,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Vol",
        "element": "Eau",
        "min": 147,
        "max": 158,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12916",
    "name": "Piège Fangeux",
    "level": 154,
    "pa": 3,
    "range": "1–6",
    "type": "Piège",
    "elements": [
      "Eau"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "2 lancer/tour",
      "1 cumul"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Eau",
        "min": 143,
        "max": 158,
        "cc": false,
        "condition": ""
      }
    ]
  },
  {
    "id": "12943",
    "name": "Épidémie",
    "level": 197,
    "pa": 4,
    "range": "0–6",
    "type": "Poison",
    "elements": [
      "Air"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "Lancer en ligne",
      "2 lancer/tour",
      "1 lancer/cible",
      "1 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 850,
        "max": 925,
        "cc": false,
        "condition": "Ennemi - Fin de tour"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 850,
        "max": 925,
        "cc": false,
        "condition": "Ennemi - Fin de tour"
      }
    ]
  },
  {
    "id": "12948",
    "name": "Piège Funeste",
    "level": 159,
    "pa": 3,
    "range": "1–6",
    "type": "Piège",
    "elements": [
      "Terre"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "2 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Terre",
        "min": 125,
        "max": 140,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Piège",
        "element": "Terre",
        "min": 197,
        "max": 212,
        "cc": false,
        "condition": "2 ennemis dans la zone d'effet"
      },
      {
        "kind": "Piège",
        "element": "Terre",
        "min": 269,
        "max": 284,
        "cc": false,
        "condition": "3 ennemis dans la zone d'effet"
      },
      {
        "kind": "Piège",
        "element": "Terre",
        "min": 341,
        "max": 356,
        "cc": false,
        "condition": "4 ennemis dans la zone d'effet"
      },
      {
        "kind": "Piège",
        "element": "Terre",
        "min": 413,
        "max": 428,
        "cc": false,
        "condition": "5 ennemis dans la zone d'effet"
      }
    ]
  },
  {
    "id": "14742",
    "name": "Effraction",
    "level": 135,
    "pa": 2,
    "range": "1–6",
    "type": "Attaque",
    "elements": [
      "Feu"
    ],
    "critChance": 21,
    "details": [
      "3 lancer/tour",
      "2 lancer/cible",
      "2 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Feu",
        "min": 79,
        "max": 86,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Feu",
        "min": 118,
        "max": 125,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12914",
    "name": "Piège Répulsif",
    "level": 164,
    "pa": 2,
    "range": "1–7",
    "type": "Piège",
    "elements": [
      "Air"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "2 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Air",
        "min": 440,
        "max": 496,
        "cc": false,
        "condition": ""
      }
    ]
  },
  {
    "id": "12920",
    "name": "Piège Effroyable",
    "level": 140,
    "pa": 2,
    "range": "1–7",
    "type": "Piège",
    "elements": [
      "Terre"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "2 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Terre",
        "min": 97,
        "max": 104,
        "cc": false,
        "condition": ""
      }
    ]
  },
  {
    "id": "12910",
    "name": "Piège d'Immobilisation",
    "level": 169,
    "pa": 3,
    "range": "1–6",
    "type": "Utilitaire",
    "elements": [],
    "critChance": null,
    "details": [
      "PO modifiable",
      "Lancer en ligne",
      "4 tour(s) de relance",
      "1 cumul"
    ],
    "effects": []
  },
  {
    "id": "14314",
    "name": "Fosse Commune",
    "level": 145,
    "pa": 3,
    "range": "1–6",
    "type": "Utilitaire",
    "elements": [],
    "critChance": null,
    "details": [
      "PO modifiable",
      "3 tour(s) de relance"
    ],
    "effects": []
  },
  {
    "id": "12938",
    "name": "Extorsion",
    "level": 174,
    "pa": 3,
    "range": "1–3",
    "type": "Attaque",
    "elements": [
      "Terre"
    ],
    "critChance": 26,
    "details": [
      "3 lancer/tour",
      "2 lancer/cible",
      "2 cumul"
    ],
    "effects": [
      {
        "kind": "Vol",
        "element": "Terre",
        "min": 122,
        "max": 133,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Vol",
        "element": "Terre",
        "min": 165,
        "max": 179,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12947",
    "name": "Perquisition",
    "level": 150,
    "pa": 2,
    "range": "0–6",
    "type": "Attaque",
    "elements": [
      "Feu"
    ],
    "critChance": 21,
    "details": [
      "3 lancer/tour",
      "2 lancer/cible"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Feu",
        "min": 71,
        "max": 79,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Feu",
        "min": 107,
        "max": 114,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12911",
    "name": "Arnaque",
    "level": 179,
    "pa": 3,
    "range": "1–6",
    "type": "Attaque",
    "elements": [
      "Air"
    ],
    "critChance": 26,
    "details": [
      "Lancer en ligne",
      "3 lancer/tour",
      "2 lancer/cible",
      "2 cumul"
    ],
    "effects": [
      {
        "kind": "Vol",
        "element": "Air",
        "min": 645,
        "max": 701,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Vol",
        "element": "Air",
        "min": 763,
        "max": 838,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12937",
    "name": "Larcin",
    "level": 155,
    "pa": 4,
    "range": "0–4",
    "type": "Attaque",
    "elements": [
      "Eau"
    ],
    "critChance": 31,
    "details": [
      "2 lancer/tour",
      "2 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Eau",
        "min": 147,
        "max": 161,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Eau",
        "min": 197,
        "max": 215,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12934",
    "name": "Pillage",
    "level": 184,
    "pa": 3,
    "range": "1–4",
    "type": "Attaque",
    "elements": [
      "Eau"
    ],
    "critChance": 26,
    "details": [
      "3 lancer/tour",
      "2 lancer/cible",
      "2 cumul"
    ],
    "effects": [
      {
        "kind": "Vol",
        "element": "Eau",
        "min": 118,
        "max": 129,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Vol",
        "element": "Eau",
        "min": 161,
        "max": 176,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12917",
    "name": "Attaque Mortelle",
    "level": 160,
    "pa": 4,
    "range": "1–2",
    "type": "Attaque",
    "elements": [
      "Terre"
    ],
    "critChance": 31,
    "details": [
      "3 lancer/tour",
      "2 lancer/cible"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 179,
        "max": 197,
        "cc": false,
        "condition": "Allié / Ennemi - Cible avec PDV >= 50%"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 237,
        "max": 258,
        "cc": true,
        "condition": "Allié / Ennemi - Cible avec PDV >= 50%"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 219,
        "max": 241,
        "cc": false,
        "condition": "Allié / Ennemi - Cible avec PDV < 50%"
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 284,
        "max": 309,
        "cc": true,
        "condition": "Allié / Ennemi - Cible avec PDV < 50%"
      }
    ]
  },
  {
    "id": "12905",
    "name": "Fourberie",
    "level": 189,
    "pa": 4,
    "range": "0–3",
    "type": "Attaque",
    "elements": [
      "Feu"
    ],
    "critChance": 31,
    "details": [
      "2 lancer/tour",
      "2 cumul"
    ],
    "effects": [
      {
        "kind": "Vol",
        "element": "Feu",
        "min": 122,
        "max": 136,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Vol",
        "element": "Feu",
        "min": 165,
        "max": 183,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12940",
    "name": "Injection Toxique",
    "level": 165,
    "pa": 5,
    "range": "1–5",
    "type": "Poison",
    "elements": [
      "Air"
    ],
    "critChance": 36,
    "details": [
      "5 tour(s) de relance",
      "2 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 701,
        "max": 776,
        "cc": false,
        "condition": "Allié / Ennemi - Début de tour"
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 838,
        "max": 912,
        "cc": true,
        "condition": "Allié / Ennemi - Début de tour"
      }
    ]
  },
  {
    "id": "12908",
    "name": "Peur",
    "level": 194,
    "pa": 2,
    "range": "2–8",
    "type": "Utilitaire",
    "elements": [],
    "critChance": null,
    "details": [
      "Lancer en ligne",
      "3 lancer/tour"
    ],
    "effects": []
  },
  {
    "id": "12945",
    "name": "Méprise",
    "level": 170,
    "pa": 3,
    "range": "0–4",
    "type": "Attaque",
    "elements": [
      "Neutre"
    ],
    "critChance": null,
    "details": [
      "Lancer en ligne",
      "1 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Neutre",
        "min": 28,
        "max": 28,
        "cc": false,
        "condition": "Allié / Ennemi / autour du lanceur / son invocation"
      }
    ]
  },
  {
    "id": "12942",
    "name": "Piège de Dérive",
    "level": 198,
    "pa": 2,
    "range": "1–6",
    "type": "Piège",
    "elements": [
      "Feu"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "2 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Feu",
        "min": 86,
        "max": 93,
        "cc": false,
        "condition": ""
      }
    ]
  },
  {
    "id": "12918",
    "name": "Piège Insidieux",
    "level": 175,
    "pa": 2,
    "range": "1–6",
    "type": "Piège",
    "elements": [
      "Air"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "1 lancer/tour",
      "1 cumul"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Air",
        "min": 329,
        "max": 347,
        "cc": false,
        "condition": "Ennemi - Fin de tour"
      },
      {
        "kind": "Piège",
        "element": "Air",
        "min": 329,
        "max": 347,
        "cc": false,
        "condition": "Ennemi - Fin de tour"
      }
    ]
  },
  {
    "id": "12931",
    "name": "Piège Scélérat",
    "level": 137,
    "pa": 2,
    "range": "1–7",
    "type": "Piège",
    "elements": [
      "Eau"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "2 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Eau",
        "min": 86,
        "max": 93,
        "cc": false,
        "condition": ""
      }
    ]
  },
  {
    "id": "12941",
    "name": "Piège à Fragmentation",
    "level": 180,
    "pa": 4,
    "range": "1–6",
    "type": "Piège",
    "elements": [
      "Feu"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "1 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Feu",
        "min": 197,
        "max": 212,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Piège",
        "element": "Feu",
        "min": 125,
        "max": 140,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Piège",
        "element": "Feu",
        "min": 122,
        "max": 136,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Piège",
        "element": "Feu",
        "min": 158,
        "max": 172,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Piège",
        "element": "Feu",
        "min": 194,
        "max": 208,
        "cc": false,
        "condition": ""
      }
    ]
  },
  {
    "id": "12903",
    "name": "Concentration de Chakra",
    "level": 142,
    "pa": 3,
    "range": "1–6",
    "type": "Attaque",
    "elements": [
      "Air"
    ],
    "critChance": null,
    "details": [
      "Lancer en ligne",
      "3 tour(s) de relance",
      "1 cumul"
    ],
    "effects": [
      {
        "kind": "Vol",
        "element": "Air",
        "min": 403,
        "max": 403,
        "cc": false,
        "condition": "Ennemi / autour du lanceur / son invocation"
      }
    ]
  },
  {
    "id": "14741",
    "name": "Manigance",
    "level": 185,
    "pa": 2,
    "range": "0–5",
    "type": "Utilitaire",
    "elements": [],
    "critChance": null,
    "details": [
      "PO modifiable",
      "2 lancer/tour",
      "1 lancer/cible",
      "2 cumul"
    ],
    "effects": []
  },
  {
    "id": "12921",
    "name": "Piège Mortel",
    "level": 147,
    "pa": 3,
    "range": "1–8",
    "type": "Piège",
    "elements": [
      "Terre"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "Lancer en ligne",
      "2 lancer/tour"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Terre",
        "min": 165,
        "max": 179,
        "cc": false,
        "condition": "Allié / Ennemi - Cible avec PDV >= 50%"
      },
      {
        "kind": "Piège",
        "element": "Terre",
        "min": 201,
        "max": 219,
        "cc": false,
        "condition": "Allié / Ennemi - Cible avec PDV < 50%"
      }
    ]
  },
  {
    "id": "12950",
    "name": "Calamité",
    "level": 190,
    "pa": 4,
    "range": "1–8",
    "type": "Piège",
    "elements": [
      "Eau"
    ],
    "critChance": null,
    "details": [
      "PO modifiable",
      "1 lancer/tour",
      "4 cumul"
    ],
    "effects": [
      {
        "kind": "Piège",
        "element": "Eau",
        "min": 169,
        "max": 183,
        "cc": false,
        "condition": ""
      }
    ]
  },
  {
    "id": "12909",
    "name": "Fourvoiement",
    "level": 152,
    "pa": 4,
    "range": "0–5",
    "type": "Attaque",
    "elements": [
      "Air"
    ],
    "critChance": 31,
    "details": [
      "2 lancer/tour",
      "2 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 776,
        "max": 850,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Air",
        "min": 912,
        "max": 1006,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "12949",
    "name": "Perfidie",
    "level": 195,
    "pa": 6,
    "range": "1–1",
    "type": "Attaque",
    "elements": [
      "Terre"
    ],
    "critChance": 36,
    "details": [
      "3 lancer/tour",
      "2 lancer/cible",
      "4 cumul"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 226,
        "max": 241,
        "cc": false,
        "condition": ""
      },
      {
        "kind": "Dégât",
        "element": "Terre",
        "min": 273,
        "max": 287,
        "cc": true,
        "condition": ""
      }
    ]
  },
  {
    "id": "14312",
    "name": "Dérobade",
    "level": 157,
    "pa": 2,
    "range": "0–5",
    "type": "Utilitaire",
    "elements": [],
    "critChance": null,
    "details": [
      "PO modifiable",
      "3 tour(s) de relance",
      "1 cumul"
    ],
    "effects": []
  },
  {
    "id": "14313",
    "name": "Marque Mortuaire",
    "level": 200,
    "pa": 2,
    "range": "1–6",
    "type": "Attaque",
    "elements": [
      "Neutre"
    ],
    "critChance": null,
    "details": [
      "2 lancer/tour",
      "1 lancer/cible"
    ],
    "effects": [
      {
        "kind": "Dégât",
        "element": "Neutre",
        "min": 28,
        "max": 28,
        "cc": false,
        "condition": "Allié / Ennemi / autour du lanceur / son invocation"
      }
    ]
  }
];
