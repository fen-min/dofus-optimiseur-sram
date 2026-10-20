# OMBRE — Optimiseur expérimental Sram Air (DOFUS 3.7)

Prototype navigateur pour **12 PA**, **5 tours**, **dégâts cumulés**, sur le build partagé :
[SRAM AIR PVM 200 LOW COST sur DofusBook](https://www.dofusbook.net/desktop/fr/equipement/16093814-db/sorts).

![État du projet](https://img.shields.io/badge/état-prototype%20expérimental-8e7be8) ![Sans dépendances](https://img.shields.io/badge/dépendances-aucune-6bc9b2)

## Lancer sans installation

1. Décompresser le dossier.
2. Depuis ce dossier, exécuter `python -m http.server 8000` (ou `npm run serve`).
3. Ouvrir `http://localhost:8000` dans le navigateur.

> Les modules JavaScript ES doivent être servis en HTTP : ne pas ouvrir directement `index.html` en `file://`.

## Mettre sur GitHub Pages

1. Créer un **nouveau dépôt** GitHub, par exemple `dofus-optimiseur-sram`, puis y ajouter tous les fichiers de ce dossier en conservant l'arborescence.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Deploy from a branch**.
3. Sélectionner `main` et `/ (root)`, puis enregistrer.
4. L'adresse attendue sera `https://<votre-compte>.github.io/dofus-optimiseur-sram/` si le nom du dépôt est celui de l'exemple.

La disponibilité de GitHub Pages dépend des paramètres du compte et de la visibilité du dépôt.

## Fonctionnalités v0.1

- Recherche par *beam search* sur 1 à 5 tours : compare **des centaines/milliers de séquences** dans le même budget de PA.
- Dégâts immédiats, poisons différés, effets d'Arnaque (+100 Agilité), relance d'Injection Toxique, limites de lancer.
- Vérifications élémentaires de distance, d'alignement et de ligne de vue (constantes, sans carte tactique).
- Résistance Air (%) et coups critiques probables.
- Pièges déclenchés facultatifs (un scénario hypothétique sans simulation de carte).
- Possibilité de modifier les dégâts DofusBook sort par sort, puis sauvegarde locale.
- Résultats par tour, histogramme, copie texte de la rotation.
- Fonctionne sans clé API ni serveur.

## Important — ce que le moteur ne sait **pas** encore faire

**Les chiffres affichés sont des estimations du modèle, pas des prédictions vérifiées du jeu.**

- Le lien DofusBook est une **référence** : pas d'import automatique des équipements ou caractéristiques (aucune API publique fiable d'import confirmée).
- Les valeurs de dégâts de départ proviennent de l'onglet sorts du build, vu avec les effets calculés et « Mêlée » sélectionné ; les stats n'ont pas été récupérées de façon sûre. **Corrige les valeurs dans l'onglet Dégâts des sorts.**
- La durée du vol d'Agilité est un paramètre **à confirmer en jeu** (2 tours par défaut comme hypothèse de calcul).
- Toxines est modélisé comme un poison de 2 occurrences, augmenté de **112 dégâts calculés** par déclenchement de piège (au plus une charge par tour et cinq en tout). Ce dernier facteur est une **approximation dérivée de la fiche**, et peut être faux selon les buffs et la nature exacte des charges.
- Les effets des poisons sont calculés en fin / début de tour adverse, avec la durée observée sur DofusBook (1 occurrence Épidémie, 3 Injection, 2 Toxines) ; leur persistance et les conditions précises ne sont pas confirmées.
- Pas de propagation multi-cible, pas de résistance fixe, pas d'érosion, pas de ligne de vue par tour, pas de changement de position, pas de IA adverse, pas de déplacement du Double.
- Poser un piège ne prouve pas qu'il se déclenche : la case doit être atteinte par l'ennemi. Un interrupteur permet de faire un **scénario hypothétique** de déclenchement systématique.
- Le moteur **n'explore pas toutes** les combinaisons possibles (beam search). Il affiche la meilleure combinaison **trouvée dans les branches explorées**, et pas une preuve d'optimum global.
- Le modèle ne fait aucune approximation utile de **survie**. Invisibilité n'est pas optimisée en mode DPS pur, contrairement à un véritable plan tactique.
- La disponibilité des sorts dépend de leurs variantes : seuls Toxines, Fourvoiement et Piège Insidieux sont optimisés ici, plus leurs options de désactivation.

## Tests

```sh
node --test
```

## Sources du modèle

- [DofusBook — Sram Air PvM lvl 200](https://www.dofusbook.net/desktop/fr/equipement/16093814-db/sorts)
- [Dofus Grimoire — Sram, mise à jour 3.7](https://dofus-grimoire.fr/classes/sram/)
- [Dofus pour les Noobs — mise à jour 3.7](https://www.dofuspourlesnoobs.com/mise-a-jour-307.html)

## Suite conseillée

1. Valider l'échelonnement des dégâts (Agilité et coups critiques) sur 2-3 attaques en jeu.
2. Vérifier précisément durées et triggers des poisons dans le journal de combat.
3. Intégrer une grille de cases avec obstacles, portées, pièges et mouvements.
4. Implémenter les sorts restants, les variantes et un moteur multi-cibles.
5. Importer des données via une source fiable et consentie ou via un fichier JSON exporté par l'utilisateur.

Projet de fan, non affilié à Ankama. Aucune illustration ni ressource propriétaire incluse.
## Catalogue complet des sorts (v0.2)

L'onglet **Dégâts des sorts** recense les **44 sorts de classe Sram** figurant dans la page DofusBook liée : leurs PA, niveaux, portées, éléments, limitations de lancer et lignes de dégâts chiffrées, y compris les effets conditionnels (charges, états, etc.). On peut rechercher par nom, filtrer par élément et par type (attaque, poison, piège, invocation, utilitaire).

**Distinction importante :** 44 sorts sont affichés comme **référence**, mais seuls les **7 sorts explicitement modélisés** participent actuellement à l'optimiseur expérimental. Les corrections de dégâts de ces 7 sorts sont conservées localement. Aucun autre sort ne doit être considéré comme pris en charge par le moteur jusqu'à modélisation et tests.

Les chiffres affichés sont ceux calculés dans le contexte de cette fiche DofusBook, **pas des dommages de base universels**. Les effets de différentes charges, états, coups critiques ou zones peuvent être alternatifs et ne doivent pas être additionnés. L'application n'importe pas automatiquement de futures mises à jour du site.
