import {SRAM_CATALOG} from "./sram-catalog.js";
import {SOURCE_URL} from "./spells.js";

export const VARIANT_PAIRS=Array.from({length:SRAM_CATALOG.length/2},(_,i)=>[SRAM_CATALOG[2*i].name,SRAM_CATALOG[2*i+1].name]);
export const DEFAULT_VARIANTS=[
"Truanderie","Sournoiserie","Toxines","Cruauté","Invisibilité","Comploteur",
"Piège Sournois","Épidémie","Piège Funeste","Piège Répulsif","Piège d'Immobilisation",
"Extorsion","Arnaque","Attaque Mortelle","Injection Toxique","Peur","Piège Insidieux",
"Piège Scélérat","Manigance","Piège Mortel","Fourvoiement","Marque Mortuaire"
];
const EXTRA={
"Arnaque":{buff:{stat:"Air",value:40,duration:3,stacks:2},target:"enemy"},
"Extorsion":{buff:{stat:"Terre",value:40,duration:3,stacks:2}},
"Pillage":{buff:{stat:"Eau",value:40,duration:3,stacks:2}},
"Fourberie":{buff:{stat:"Feu",value:40,duration:3,stacks:2}},
"Truanderie":{buff:{stat:"Puissance",value:80,duration:3,stacks:2}},
"Manigance":{target:"self",buff:{stat:"Dommages",value:20,duration:3,stacks:1}},
"Invisibilité":{target:"self",invisible:1,utility:"Invisible jusqu'à la fin du tour de la cible (modèle simplifié)"},
"Brume":{target:"self",utility:"Zone de dissimulation : nécessite une carte"},
"Double":{target:"tile",utility:"Invocation de placement : déplacement non simulé"},
"Comploteur":{target:"tile",summon:{delay:3},utility:"Dégâts uniquement si le double meurt au contact"},
"Concentration de Chakra":{target:"enemy",onTrap:true,utility:"Vol Air déclenché sur la cible sous concentration lorsque les pièges touchent"},
"Coupe-gorge":{target:"enemy",vulnerability:1.10,vulnerabilityTurns:1},
"Marque Mortuaire":{target:"enemy",vulnerability:1.02,vulnerabilityTurns:1,utility:"Vulnérabilité liée aux déclenchements de pièges"},
"Poisse":{target:"enemy",utility:"Vol de vie et minimisation des effets de la cible"},
"Arsenic":{target:"enemy",poison:{phase:"start",duration:2}},
"Toxines":{target:"enemy",poison:{phase:"end",duration:2}},
"Épidémie":{target:"enemy",poison:{phase:"end",duration:1},utility:"Propagation multi-cible non calculée"},
"Injection Toxique":{target:"enemy",poison:{phase:"start",duration:3}},
"Piège Insidieux":{poisonOnTrap:{phase:"end",duration:1}},
"Peur":{target:"enemy",move:2,utility:"Repousse de 2 cases (sans obstacle)"},
"Dérobade":{target:"self",utility:"Protection et désengagement (aucun bonus DPS direct)"},
"Méprise":{target:"enemy",utility:"Échange de place avec la cible ; carte nécessaire"},
"Piège d'Immobilisation":{target:"tile",utility:"Piège retrait PM, sans dégât direct"},
"Fosse Commune":{target:"tile",utility:"Piège de contrôle, sans dégât direct"},
"Sournoiserie":{move:3},
"Perfidie":{spendTrapCharges:true},
"Chausse-trappe":{spendTrapCharges:true}
};
const SELF_NO_DAMAGE=new Set(["Invisibilité","Brume","Double","Dérobade","Manigance","Piège d'Immobilisation","Fosse Commune","Peur","Méprise","Marque Mortuaire","Concentration de Chakra"]);
const DAMAGE_RATIO={Air:25,Terre:4.5,Eau:4.5,Feu:4.5,Neutre:4.5};
function firstDamageRows(cat){
 const raw=cat.effects.filter(e=>!e.cc);
 // Conditional lines (charges, low HP, multiple targets) are ALTERNATIVES,
 // not additional damage lines. Status-dependent multi-hit needs manual review.
 return raw.length?raw[0]:null;
}
function parseLimit(d,rx,fallback){const x=d.find(s=>rx.test(s));return x?+x.match(rx)[1]:fallback;}
export const SIM_SPELLS=SRAM_CATALOG.map((cat,index)=>{
 const x=EXTRA[cat.name]||{};
 const row=firstDamageRows(cat);
 let critical=cat.effects.find(e=>e.cc&&e.element===row?.element);
 const isTrap=cat.type==="Piège"||["Piège d'Immobilisation","Fosse Commune"].includes(cat.name);
 const nonDirect=SELF_NO_DAMAGE.has(cat.name);
 const po=cat.range.match(/(\d+)[–-](\d+)/);
 const min=nonDirect?0:(row?.min||0),max=nonDirect?0:(row?.max||0);
 let maxPerTurn=parseLimit(cat.details,/(\d+) lancer\/tour/,cat.details.some(s=>/relance/.test(s))?1:2);
 const critChance=cat.critChance===null?0:cat.critChance/100;
 return {
 id:cat.id,name:cat.name,pa:cat.pa,minRange:po?+po[1]:0,range:po?+po[2]:0,
 lineOnly:cat.details.includes("Lancer en ligne"),
 los:!(isTrap||["Manigance","Invisibilité","Brume"].includes(cat.name)),
 maxPerTurn,perTarget:parseLimit(cat.details,/(\d+) lancer\/cible/,maxPerTurn),
 cooldown:parseLimit(cat.details,/(\d+) tour\(s\) de relance/,0),
 element:row?.element||cat.elements[0]||null,
 min,max,critMin:nonDirect?0:critical?.min??min,critMax:nonDirect?0:critical?.max??max,
 critChance,baseDamage:row?Math.max(1,((row.min+row.max)/2)/(DAMAGE_RATIO[row.element]||5)):0,
 isTrap,nonDirect,target:isTrap?"tile":(x.target||"enemy"),variantGroup:Math.floor(index/2),icon:isTrap?"◇":cat.type==="Poison"?"☣":cat.type==="Utilitaire"?"✦":"⚔",
 status:x,utility:x.utility||"",damagePrecision:nonDirect?"non-direct":(row&&cat.effects.filter(e=>!e.cc).length>1?"conditionnel":"direct"),
 source:SOURCE_URL
 };
});
export const SUPPORTED_COUNT=SIM_SPELLS.length;
