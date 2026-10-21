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
   // Approximation initiale : +50 puissance, 3 états successifs jusqu'à 150.
   // L'état et le sacrifice de PV ne sont PAS encore simulés de manière fidèle.
   status.buff={stat:"Puissance",value:50,duration:10,stacks:1,ramp:50,max:150};
   utility="Puissance progressive de Mutilation ; coût PV et Coagulation non simulés";
 }
 if(cat.name==="Berserk")utility="État Berserk avec changement de PV et dommages : non chiffré";
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
