/**
 * Tactical range-and-AOE reference for the independent multi-target assistant.
 * Verified masks were checked against Dofus Grimoire 3.7 / OpenDofusDB.
 * All other spells explicitly use a conservative UNVERIFIED single-cell mask.
 * This is an abstract orthogonal grid, not a complete DOFUS rules implementation.
 *
 * spell names belong to separate classes; fallback is intentionally cautious.
 */
export const GEOMETRY_SOURCE={
 sram:"https://dofus-grimoire.fr/classes/sram/",
 sacrieur:"https://dofus-grimoire.fr/classes/sacrieur/"
};
export const MASK_LABELS={
 single:"Une case",cross1:"Croix de 1 (centre inclus)",crossNoCenter:"Croix de 1 (sans centre)",
 cross2:"Croix de 2",square1:"Carré de 1",circle2:"Cercle de 2",
 circle3:"Cercle de 3",diagonal1:"Diagonales de 1",line2:"Ligne de 2",
 casterLine:"Ligne depuis le lanceur",ring2:"Anneau de 2",
 half1:"Demi-cercle de 1",cross3NoCenter:"Croix de 3 sans centre"
};
const item=(mask,mode="cell",confidence="verified",notes="")=>({mask,mode,confidence,notes});
const known={
 sram:{
  "Fourvoiement":item("crossNoCenter","cell","verified","Croix orthogonale de 1 sans la case visée. La case centrale peut être vide ; ne touche pas le Sram."),
  "Fourberie":item("ring2","cell","verified","Anneau autour de la case visée ; le vol de vie et le vol d'Intelligence ne sont pas entièrement simulés."),
  "Épidémie":item("single","enemy","verified","Le poison est posé sur une cible ; il se propage aux ennemis voisins dans un cercle de 2 à la fin de leur tour (simplifié)."),
  "Brume":item("circle3","cell","verified","Aura et invisibilité, pas de dégâts directs ; emplacements des alliés non modélisés."),
  "Comploteur":item("crossNoCenter","free","verified","Invocation sur une case libre, dégâts à sa disparition : nécessite le placement du Double."),
  "Piège Sournois":item("cross1","free","verified","Zone de piège, dégâts seulement lors d'un déclenchement réel."),
  "Piège Répulsif":item("cross1","free","verified","Zone de piège, repoussement non simulé."),
  "Piège Insidieux":item("cross1","free","approximate","Zone de déclenchement à vérifier, poison/attirance pas entièrement simulés."),
  "Piège à Fragmentation":item("circle3","free","verified","Déclenchement et dégâts par anneaux non simulés."),
  "Piège Mortel":item("single","free","verified","Piège mono-cellule ; dégâts seulement au déclenchement."),
  "Piège Funeste":item("single","free","verified","Piège mono-cellule ; bonus selon les ennemis voisins non simulé."),
  "Fosse Commune":item("single","free","verified","Piège mono-cellule ; effet de Pesanteur non simulé."),
  "Piège de Dérive":item("cross1","free","approximate","Zone de pose indicative ; poussée réelle non simulée."),
  "Piège Fangeux":item("cross1","free","approximate","Zone de déclenchement indicative."),
  "Piège Scélérat":item("single","free","verified","Piège monocellule et attirance en zone."),
  "Piège d'Immobilisation":item("circle2","free","approximate","Aire de retrait de PM indicative ; zone précise à confirmer."),
  "Fourvoiement##self":item("crossNoCenter","cell"),
  "Peur":item("single","enemy","verified","Pousse jusqu'à la case visée : la nouvelle position n'est pas déduite automatiquement."),
  "Arnaque":item("single","enemy","verified","Vol de vie et d'Agilité sur une cible."),
  "Manigance":item("single","self","verified","Bonus du Sram, aucun dégât direct."),
  "Invisibilité":item("single","self","verified","Effet personnel, non chiffré."),
  "Double":item("single","free","verified","Invocation sur une case libre, mouvement/échange non automatisés.")
 },
 sacrieur:{
  "Furie":item("cross1","cell","verified","Croix de 1, sans dégâts au lanceur."),
  "Douleur Cuisante":item("cross2","cell","verified","Croix de 2, sans dégâts au lanceur."),
  "Carnage":item("line2","cell","verified","Deux cases en ligne dans l'axe de visée ; coût en PV non déduit."),
  "Fulgurance":item("casterLine","cell","verified","Ligne lanceur → case visée ; téléportation non simulée."),
  "Bain de Sang":item("square1","selfArea","verified","Carré de 1 centré sur le Sacrieur ; vol de vie non simulé."),
  "Condensation":item("circle2","cell","verified","Cercle de 2, attirance non simulée."),
  "Dissolution":item("cross1","cell","verified","Croix de 1, vol de vie et vol de Fuite non simulés."),
  "Désolation":item("half1","cell","verified","Demi-cercle de 1, orientation approximée selon la visée."),
  "Décimation":item("diagonal1","cell","verified","Croix diagonale de 1, érosion/vulnérabilité par cible simplifiée."),
  "Hécatombe":item("diagonal1","cell","verified","Diagonales de 1 ; soins reçus conditionnels non modélisés."),
  "Aversion":item("cross1","cell","verified","Croix de 1, repoussement non simulé."),
  "Immolation":item("circle2","cell","verified","Cercle de 2, coût en PV non simulé."),
  "Afflux":item("cross3NoCenter","selfArea","verified","Croix de 3 centrée sur le Sacrieur, attire vers lui ; attirance non simulée."),
  "Assaut":item("single","enemy","verified","Échange de position et dommages sur une cible ; échange non simulé."),
  "Mutilation":item("single","self","verified","Bonus de Puissance et sacrifice de PV (PV non calculés)."),
  "Berserk":item("single","self","verified","Etat personnel conditionné aux PV/Souffrance non simulés."),
  "Pacte de Sang":item("single","self","verified","Bonus Vitalité/Puissance, PV non simulés.")
 }
};
export const geometryFor=(spell,classId)=>{
 const value=known[classId]?.[spell?.name];
 if(value)return {...value,source:GEOMETRY_SOURCE[classId],name:spell.name};
 const trap=!!spell?.isTrap||spell?.target==="tile";
 const self=spell?.target==="self";
 return {
  mask:"single",mode:self?"self":trap?"free":"enemy",
  confidence:"unverified",source:GEOMETRY_SOURCE[classId]||"",
  name:spell?.name||"",notes:trap?"La pose est illustrée sur une case ; le déclenchement n'est pas simulé.":"Géométrie exacte non validée : une seule case par prudence."
 };
};
export function inMask(origin,p,mask,hero=origin){
 const x=p.x-origin.x,y=p.y-origin.y,ax=Math.abs(x),ay=Math.abs(y),d=ax+ay;
 switch(mask){
  case "cross1":return d<=1;
  case "crossNoCenter":return d===1;
  case "cross2":return (x===0||y===0)&&d<=2;
  case "cross3NoCenter":return (x===0||y===0)&&d>=1&&d<=3;
  case "square1":return Math.max(ax,ay)<=1;
  case "circle2":return d<=2;
  case "circle3":return d<=3;
  case "diagonal1":return ax===1&&ay===1;
  case "ring2":return d===2;
  case "line2":{
   const vx=Math.abs(origin.x-hero.x),vy=Math.abs(origin.y-hero.y);
   if(vx>=vy){const dir=Math.sign(origin.x-hero.x)||1;return y===0&&x*dir>=0&&x*dir<=1;}
   const dir=Math.sign(origin.y-hero.y)||1;return x===0&&y*dir>=0&&y*dir<=1;
  }
  case "casterLine":{
   if(hero.x!==origin.x&&hero.y!==origin.y)return false;
   if(hero.x===origin.x){const d=Math.sign(origin.y-hero.y);return p.x===hero.x&&(p.y-hero.y)*d>=1&&(p.y-hero.y)*d<=Math.abs(origin.y-hero.y);}
   const d=Math.sign(origin.x-hero.x);
   return p.y===hero.y&&(p.x-hero.x)*d>=1&&(p.x-hero.x)*d<=Math.abs(origin.x-hero.x);
  }
  case "half1":{
   const dx=origin.x-hero.x,dy=origin.y-hero.y;
   if(Math.abs(dx)>=Math.abs(dy))return d<=1&&x*Math.sign(dx||1)>=0;
   return d<=1&&y*Math.sign(dy||1)>=0;
  }
  default:return d===0;
 }
}
export const profileCoverage=(spells,classId)=>{
 const profiles=spells.map(s=>geometryFor(s,classId));
 return {total:profiles.length,verified:profiles.filter(p=>p.confidence==="verified").length,
  approximate:profiles.filter(p=>p.confidence==="approximate").length,
  unverified:profiles.filter(p=>p.confidence==="unverified").length};
};
