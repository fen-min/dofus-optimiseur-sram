import {SACRIER_CATALOG,SACRIER_VARIANTS} from "./sacrier-catalog.js";
export const SACRIER_SOURCE="https://www.dofusbook.net/desktop/fr/equipement/20072789-db/sorts";
// Air PvM defaults: one and only one selected spell per variant pair.
// These are starting preferences, not a representation of in-game presets.
export const SACRIER_DEFAULT_VARIANTS=[
"Furie","Hémorragie","Supplice","Stase","Attirance","Mutilation",
"Épée Vorace","Fulgurance","Assaut","Transposition","Condensation","Hostilité",
"Couronne d'Épines","Transfusion","Carnage","Désolation","Sacrifice",
"Bain de Sang","Hécatombe","Libation","Berserk","Folie Sanguinaire"
];
const ratio={Air:27,Eau:5,Feu:5,Terre:5,Neutre:5};
const control=new Set(["Attirance","Perfusion","Transposition","Fluctuation","Couronne d'Épines","Pilori","Transfusion","Liens du Sang","Sacrifice","Pénitence","Libation","Châtiment","Rituel de Jashin","Pacte de Sang"]);
const nonDirect=new Set(["Mutilation","Berserk",...control,"Épée Vorace","Épée Dansante"]);
const personal=new Set(["Mutilation","Berserk","Libation","Fluctuation","Couronne d'Épines","Pacte de Sang"]);
function parseLimit(details,regex,otherwise){const item=details.find(x=>regex.test(x));return item?Number(item.match(regex)[1]):otherwise;}
export const SACRIER_SPELLS=SACRIER_CATALOG.map(cat=>{
 const variantGroup=SACRIER_VARIANTS.findIndex(pair=>pair.includes(cat.name));
 if(variantGroup<0)throw new Error("Variante Sacrieur absente : "+cat.name);
 // The first non-critical calculated damage line is not necessarily total area damage.
 const dmg=cat.effects.find(x=>!x.cc);
 const crit=cat.effects.find(x=>x.cc&&x.element===dmg?.element);
 const isUtility=nonDirect.has(cat.name);
 const po=cat.range.match(/(\d+)[–-](\d+)/);
 const min=dmg&&!isUtility?dmg.min:0,max=dmg&&!isUtility?dmg.max:0;
 const status={};
 let utility="";
 if(cat.name==="Mutilation"){
   // Rang 3 (niveau 200) : +150 Puissance dès le lancer.
   // La progression 1/3 → 3/3 détermine Coagulation, PAS un buff qui augmente de 50/tour.
   status.buff={stat:"Puissance",value:150,duration:10,stacks:1};
   status.hpCostPercent=10;
   status.mutilation=true;
   utility="Rang 3 : -10% PV, +150 Puissance, Mutilation 1/3→3/3 ; relance : Coagulation 15/25% PV max. PV et bouclier non calculés.";
 }
 if(cat.name==="Pacte de Sang"){
   // Rang 2 confirmé par capture en jeu (21 octobre 2026).
   // Seule la Puissance est valorisée par le modèle DPS actuel.
   // Vitalité est suivie comme état temporaire, sans calcul de PV max / actuels.
   status.buff={stat:"Puissance",value:100,duration:3,stacks:1};
   status.extraBuffs=[{stat:"Vitalité",value:25,unit:"%",duration:3,stacks:1}];
   utility="Pacte de Sang : +100 Puissance et +25 % Vitalité pendant 3 tours (rang 2). La Vitalité ne modifie pas encore les PV simulés.";
 }
 if(cat.name==="Furie"){
   // Confirmé par la capture du jeu : +3 % finaux pendant 3 tours, 2 cumuls.
   status.buff={stat:"Dommages finaux",unit:"%",value:3,duration:3,stacks:2};
   utility="Bonus vérifié : +3 % de dommages finaux pendant 3 tours, cumul max 2 (+6 %). Dégâts en zone non simulés.";
 }
 if(cat.name==="Nervosité"){
   // Rang 2 : +7% de chances de critique pendant 3 tours.
   status.buff={stat:"Critique",unit:"%",value:7,duration:3,stacks:2};
   utility="Rang 2 : frappe Eau en zone et +7% Critique pendant 3 tours (jusqu’à 2 lancers par tour).";
 }
 if(cat.name==="Douleur Cuisante"){
   // Rang 2 : +60 Puissance 3 tours, le bonus suit les dégâts du sort.
   status.buff={stat:"Puissance",value:60,duration:3,stacks:2};
   utility="Rang 2 : frappe Feu en zone et +60 Puissance pendant 3 tours (2 lancers par tour).";
 }
 if(cat.name==="Berserk"){
   status.hpCostPercent=70;
   status.conditionalBonus={stat:"Dommages aux sorts",value:10,unit:"%",condition:"Souffrance ≥ 6"};
   utility="Rang 2 : -70% PV, Intaclable, +10% dommages aux sorts, soins reçus ×30%. État retiré si Souffrance ≤ 5 ou relance. Non simulé sans PV.";
 }
 if(["Carnage","Déchaînement","Immolation","Entaille"].includes(cat.name))status.hpCostPercent=10;
 if(cat.name==="Libation")status.hpCostPercent=30;
 if(cat.name==="Châtiment")status.hpCostPercent=15;
 if(cat.name==="Décimation"){
   status.vulnerability=1.03;
   status.vulnerabilityTurns=1; // hypothèse de durée à confirmer pour la cible.
   utility="Rang 2 : +3% dommages subis par les ennemis en zone. Durée provisoirement 1 tour dans le moteur.";
 }
 if(cat.name==="Bain de Sang"){
   status.buff={stat:"Tacle",value:15,duration:1,stacks:1};
   utility="Rang 2 : +15 Tacle par cible dans la zone, durant 1 tour. Une seule cible prise en compte."; 
 }
 if(cat.name==="Désolation")utility="Vol Air en zone et -3 PM pendant 1 tour ; retrait et soin non intégrés au DPS.";
 if(cat.name==="Transfusion")utility="Rang 3 : dommages Neutre équivalents à 10% des PV du lanceur et transfert de PV alliés ; nécessite le module PV.";
 if(cat.name==="Punition")utility="Dégâts du meilleur élément et Neutre à hauteur de 30% des PV érodés ; nécessite le module de PV érodés.";
 if(cat.name==="Folie Sanguinaire")utility="Vole de la vie dans le meilleur élément en zone non dégressive ; nécessite le calcul du meilleur élément.";
 if(cat.name==="Libation")utility="Coût en PV et montée de Souffrance : non chiffrés";
 if(personal.has(cat.name))status.target="self";
 if(cat.type==="Invocation")utility="Invocation : dommages autonomes non pris en compte";
 if(control.has(cat.name)&&!utility)utility="Positionnement, survie ou soutien ; effet DPS non chiffré sans carte et PV";
 const lineOnly=cat.details.includes("Lancer en ligne");
 const target=status.target|| (cat.type==="Invocation"?"tile":isUtility?"self":"enemy");
 return {
 id:cat.id,name:cat.name,pa:cat.pa,
 minRange:po?Number(po[1]):0,range:po?Number(po[2]):isUtility?0:1,
 lineOnly,los:target==="enemy" && !cat.details.includes("Sans ligne de vue"),
 maxPerTurn:parseLimit(cat.details,/(\d+) lancer\/tour/,cat.type==="Utilitaire"?1:2),
 perTarget:parseLimit(cat.details,/(\d+) lancer\/cible/,2),
 cooldown:parseLimit(cat.details,/(\d+) tour\(s\) de relance/,0),
 element:dmg?.element||null,min,max,
 critMin:crit&&!isUtility?crit.min:min,critMax:crit&&!isUtility?crit.max:max,
 critChance:Math.max(0,(cat.critChance||0)/100),
 baseDamage:dmg&&dmg.element?(min+max)/2/(ratio[dmg.element]||5):0,
 nonDirect:isUtility,isTrap:false,target,variantGroup,
 icon:cat.type==="Invocation"?"♟":isUtility?"✦":"⚔",
 status,utility,damagePrecision:cat.effects.filter(x=>!x.cc).length>1?"conditionnel":"direct",
 classId:"sacrieur",
 };
});
if(SACRIER_SPELLS.length!==44||SACRIER_DEFAULT_VARIANTS.some((s,i)=>!SACRIER_VARIANTS[i].includes(s)))throw new Error("Paires Sacrieur invalides");
