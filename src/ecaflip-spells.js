/**
 * Écaflip — DOFUS 3.7 (source: https://dofus-grimoire.fr/classes/ecaflip/).
 * Twenty-two pairs, all 44 names from Karuta's screenshot.
 * Only the documented damage rows below participate in DPS calculations;
 * non-modeled utility/randomness is deliberately NOT assigned made-up damage.
 */
export const ECAFLIP_SOURCE="https://dofus-grimoire.fr/classes/ecaflip/";
export const ECAFLIP_PAIRS=[
 ["Réflexes","Lapement"],["Yams","Langue Râpeuse"],["Topkaj","Griffe Joueuse"],
 ["Pile ou Face","Fanfaronnade"],["Bonne Pioche","Redistribution"],
 ["Bond du Félin","Entrechat"],["Jass","Infortune"],["Perception","Prédation"],
 ["Baraka","Toupet"],["Château de Cartes","Bonne Étoile"],
 ["Blakjak","Destin d'Ecaflip"],["Roulette","Tarot d'Ecaflip"],
 ["Belote","Péril"],["Tromperie","Tout ou Rien"],
 ["Pelotage","Griffe de Ceangal"],["Griffe Invocatrice","Caresse Invocatrice"],
 ["Esprit Félin","Kraps"],["Odorat","Roue de la Fortune"],
 ["Coussinets","Feulement"],["Seconde Chance","Neuf Vies"],
 ["Félintion","Mésaventure"],["Bluff","Rekop"]
];
export const ECAFLIP_KARUTA_VARIANTS=[
 "Lapement","Yams","Griffe Joueuse","Pile ou Face",
 "Redistribution","Bond du Félin","Infortune","Prédation",
 "Baraka","Château de Cartes","Destin d'Ecaflip","Roulette",
 "Belote","Tout ou Rien","Griffe de Ceangal","Griffe Invocatrice",
 "Kraps","Roue de la Fortune","Feulement","Neuf Vies","Félintion","Rekop"
];
// Rangs 200 vérifiés sur la page de référence, hors dommages secondaires
// conditionnels. Absence de définition = sort montré, mais non chiffré.
const DATA={
 "Yams":{pa:2,e:"Eau",n:[3,18],c:[21,21],cc:5,r:[0,6],turn:3,target:2,card:["club",2],randomCrit:true,criticalRateBuff:{normal:[3,18],critical:21,duration:3,stacks:3}},
 "Baraka":{pa:3,e:"Eau",n:[27,30],c:[35,35],cc:10,r:[0,6],turn:3,target:2,card:["club",3],playSuit:"club"},
 "Félintion":{pa:4,e:"Eau",n:[33,36],c:[43,43],cc:15,r:[1,6],turn:2,card:["club",4]},
 "Griffe Joueuse":{pa:4,e:"Eau",n:[31,35],c:[42,42],cc:15,r:[1,6],turn:2,card:["club",4],line:true},
 "Infortune":{pa:5,e:"Eau",n:[41,45],c:[54,54],cc:20,r:[1,7],turn:1,card:["club",5],conditional:"Dégâts différés si aucun critique adverse : non comptés"},
 "Kraps":{pa:3,e:"Eau",n:[28,30],c:[34,34],cc:10,r:[0,6],turn:2,card:["club",3],critDamageBuff:29,critDamageBuffOnCrit:34},
 "Réflexes":{pa:2,e:"Air",n:[14,17],c:[20,20],cc:5,r:[0,6],turn:3,target:2,card:["spade",2]},
 "Jass":{pa:3,e:"Air",n:[26,29],c:[35,35],cc:10,r:[0,6],turn:3,target:2,card:["spade",3],playSuit:"spade"},
 "Coussinets":{pa:4,e:"Air",n:[35,38],c:[46,46],cc:15,r:[1,6],turn:2,card:["spade",4]},
 "Fanfaronnade":{pa:4,e:"Air",n:[28,32],c:[38,38],cc:20,r:[0,6],turn:1,card:["spade",4]},
 "Toupet":{pa:5,e:"Air",n:[44,48],c:[58,58],cc:20,r:[1,5],turn:1,card:["spade",5],conditional:"Effet différé non compté"},
 "Griffe de Ceangal":{pa:3,e:"Air",n:[27,29],c:[33,33],cc:10,r:[1,4],turn:2,card:["spade",3],line:true},
 "Péril":{pa:5,e:"Feu",n:[43,47],c:[56,56],cc:20,r:[1,8],turn:1,card:["heart",5],conditional:"Dégâts conditionnels après soin non comptés"},
 "Feulement":{pa:4,e:"Feu",n:[30,34],c:[41,41],cc:15,r:[1,5],turn:2,card:["heart",4],line:true},
 "Rekop":{pa:4,e:"Eau",n:[0,0],c:[0,0],cc:10,r:[1,6],turn:1,rekop:true,consumeHand:true},
 "Tout ou Rien":{pa:3,e:"Eau",n:[16,18],c:[21,21],cc:10,r:[0,3],turn:1,cooldown:2,playHand:true,restoreTable:true,conditional:"Dégâts dans le meilleur élément, soins/zone non chiffrés"},
 "Bonne Pioche":{pa:1,r:[0,0],turn:3,self:true,refundPA:1,randomDraw:1},
 "Redistribution":{pa:1,r:[0,0],turn:1,self:true,refundPA:1,randomDraw:4,playHand:true,cooldown:0},
 "Griffe Invocatrice":{pa:3,r:[1,4],self:true,cooldown:4,buff:{stat:"Puissance",value:90,duration:4,stacks:1},conditional:"Chaton : son IA, ses dommages et sa durée restent non simulés"},
 "Château de Cartes":{pa:3,r:[0,6],self:true,cooldown:3,playHand:true},
 "Roulette":{pa:1,r:[0,0],self:true,turn:1,refundPA:1,randomDraw:0},
 "Pile ou Face":{pa:2,e:"Terre",n:[18,18],c:[22,22],cc:5,r:[0,6],turn:3,target:2,card:["diamond",2],refundPA:1,conditional:"Face/Pile : +1 PA ou +1 PM supplémentaire non anticipé"},
 "Belote":{pa:3,e:"Terre",n:[27,30],c:[36,36],cc:10,r:[0,6],turn:3,target:2,card:["diamond",3],playSuit:"diamond"},
 "Lapement":{pa:4,e:"Terre",n:[32,36],c:[43,43],cc:15,r:[0,5],turn:2,card:["diamond",4],conditional:"Retrait PA/PM selon Pile ou Face non valorisé"},
 "Destin d'Ecaflip":{pa:5,e:"Terre",n:[42,46],c:[55,55],cc:20,r:[1,6],turn:1,card:["diamond",5],conditional:"Dégâts conditionnels supplémentaires sur critique adverse non simulés"}

};
const levels=[
 [1,95],[1,100],[1,105],[1,110],[5,115],[10,120],[15,125],[20,130],
 [25,135],[30,140],[35,145],[40,150],[45,155],[50,160],[55,165],[60,170],
 [65,175],[70,180],[75,185],[80,190],[85,195],[90,200]
];
const baseAttr={Air:"agility",Eau:"chance",Feu:"intelligence",Terre:"strength"};
function scaleLine(value,element,crit,stats){
 const stat=stats?.[baseAttr[element]];
 const power=stats?.power;
 const flat=stats?.flatDamage?.[element];
 if(!Number.isFinite(stat)||!Number.isFinite(power)||!Number.isFinite(flat))return null;
 const unbuffed=Math.floor(value*(100+stat+power)/100+1e-9)+flat+(crit?(stats.criticalDamage||0):0);
 return Math.max(0,Math.floor(unbuffed*(1+(stats.spellDamagePercent||0)/100)+1e-9));
}
const cardName={club:"Trèfle",spade:"Pique",heart:"Cœur",diamond:"Carreau"};
export const ECAFLIP_SPELLS=ECAFLIP_PAIRS.flatMap((pair,i)=>pair.map((name,j)=>{
 const raw=DATA[name]||{},element=raw.e||null;
 const done=!!raw.n&&!(raw.n[0]===0&&raw.n[1]===0)&&!raw.rekop;
 const passive=raw.rekop?false:raw.self===true||!done;
 return {
  id:"eca-"+i+"-"+j,name,pa:raw.pa||3,minRange:raw.r?.[0]??0,
  range:raw.r?.[1]??6,lineOnly:raw.line||false,los:!raw.self,
  maxPerTurn:raw.turn||1,perTarget:raw.target||raw.turn||1,
  cooldown:raw.cooldown||0,element,
  min:raw.n?.[0]??0,max:raw.n?.[1]??0,
  critMin:raw.c?.[0]??0,critMax:raw.c?.[1]??0,
  baseDamage:raw.n?(raw.n[0]+raw.n[1])/2:0,
  critChance:(raw.cc||0)/100,nonDirect:passive,isTrap:false,
  target:raw.self?"self":done||raw.rekop?"enemy":"self",
  variantGroup:i,ecaflip:true,drawCard:raw.card||null,
  playSuit:raw.playSuit||null,playHand:!!raw.playHand,
  restoreTable:!!raw.restoreTable,ecaflipRekop:!!raw.rekop,
  ecaflipRandomDraw:raw.randomDraw||0,refundPA:raw.refundPA||0,
  ecaflipCriticalRateBuff:raw.criticalRateBuff||null,
  ecaflipCritDamageOnCrit:raw.critDamageBuffOnCrit||0,
  conditionalDamage:raw.conditional||"",ecaflipCritDamageBuff:raw.critDamageBuff||0,
  modelingConfidence:done?"verified-base-damage":raw.rekop?"poker-dependent":"non-modeled",
  status:{...(raw.buff?{buff:raw.buff}:{}),...((raw.randomDraw||passive&&!raw.rekop&&!raw.playHand&&!raw.buff)?{unsupported:true}:{})},
  utility:raw.conditional||(!done&&!raw.rekop?"Effet non chiffré : éviter de fabriquer un DPS de substitution":""),
  cardSource:raw.card?("Pioche "+raw.card[1]+" de "+cardName[raw.card[0]]):"",
  classId:"ecaflip"
 };
}));
export function prepareEcaflipSpellDamage(spell,stats){
 if(!spell.ecaflip||spell.ecaflipRekop)return spell;
 const output={...spell,status:JSON.parse(JSON.stringify(spell.status||{}))};
 const e=output.element;
 if(e&&output.modelingConfidence==="verified-base-damage"){
  const fields=[output.min,output.max,output.critMin,output.critMax].map((n,i)=>scaleLine(n,e,i>=2,stats));
  if(fields.every(v=>v!==null)){
   [output.min,output.max,output.critMin,output.critMax]=fields;
   output.critChance=Math.min(1,Math.max(0,output.critChance+(stats.critical||0)/100));
   output.damageSource="active-build-stats";
   return output;
  }
 }
 output.damageSource="non-modeled";
 return output;
}
export const ECAFLIP_CATALOG=ECAFLIP_SPELLS.map((spell,index)=>{
 const pairIndex=Math.floor(index/2);
 const raw=DATA[spell.name]||{};
 return {
  id:spell.id,name:spell.name,level:levels[pairIndex][index%2],
  pa:spell.pa,range:raw.r?raw.r[0]+"–"+raw.r[1]:"Non précisée",
  type:spell.nonDirect?"Utilitaire":"Attaque",
  elements:spell.element?[spell.element]:[],
  details:[
   "Source : Dofus Grimoire 3.7",
   ...(spell.drawCard?[spell.cardSource]:[]),
   ...(spell.conditionalDamage?[spell.conditionalDamage]:[]),
   ...(spell.modelingConfidence==="non-modeled"?["Dégâts ou aléatoire non simulés"]:[])
  ],
  effects:spell.modelingConfidence==="verified-base-damage"?[
   {cc:false,element:spell.element,min:raw.n[0],max:raw.n[1],kind:"Dommages base"},
   {cc:true,element:spell.element,min:raw.c[0],max:raw.c[1],kind:"Dommages base"}
  ]:[],
  critChance:raw.cc||0
 };
});
if(ECAFLIP_PAIRS.length!==22||ECAFLIP_SPELLS.length!==44||ECAFLIP_KARUTA_VARIANTS.some((n,i)=>!ECAFLIP_PAIRS[i].includes(n)))
 throw Error("Ecaflip: variantes/catégories incohérentes");
