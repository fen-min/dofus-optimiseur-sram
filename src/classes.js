import {SIM_SPELLS,VARIANT_PAIRS,DEFAULT_VARIANTS,SRAM_SCREENSHOT_VARIANTS} from "./sim-spells.js?v=1.8";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS,SACRIER_SOURCE} from "./sacrier-spells.js";
import {SACRIER_CATALOG,SACRIER_VARIANTS} from "./sacrier-catalog.js";
import {SRAM_CATALOG} from "./sram-catalog.js?v=1.8";
import {SOURCE_URL} from "./spells.js";
import {SACRIER_AIR_REFERENCE_STATS,SRAM_AIR_REFERENCE_STATS,sanitizeCharacterStats} from "./character-stats.js?v=1.8";
export const CLASSES={
 sram:{id:"sram",name:"Sram",glyph:"☽",color:"#b6a0ff",element:"Air",catalog:SRAM_CATALOG,spells:SIM_SPELLS,pairs:VARIANT_PAIRS,defaultVariants:DEFAULT_VARIANTS,source:SOURCE_URL,model:"Sram expérimental"},
 sacrieur:{id:"sacrieur",name:"Sacrieur",glyph:"◆",color:"#fb9a91",element:"Air",catalog:SACRIER_CATALOG,spells:SACRIER_SPELLS,pairs:SACRIER_VARIANTS,defaultVariants:SACRIER_DEFAULT_VARIANTS,source:SACRIER_SOURCE,model:"Sacrieur expérimental · Souffrance / PV non simulés"}
};
export const INITIAL_BUILDS=[
 {id:"sram-air-pvm",classId:"sram",character:"Matryoshka",name:"Air PvM 200 Low Cost",level:200,element:"Air",source:SOURCE_URL,variants:SRAM_SCREENSHOT_VARIANTS.slice(),ap:12,turns:10,distance:3,stats:SRAM_AIR_REFERENCE_STATS,calibration:{}},
 {id:"sacri-air-pvm",classId:"sacrieur",character:"Mon Sacrieur",name:"Air PvM 200 Low Cost",level:200,element:"Air",source:SACRIER_SOURCE,variants:SACRIER_DEFAULT_VARIANTS.slice(),ap:12,turns:10,distance:2,stats:SACRIER_AIR_REFERENCE_STATS,calibration:{}}
];
export function normalizeBuild(b,index=0){
 const cls=CLASSES[b?.classId]||CLASSES.sram;
 // Migrer uniquement l'ancien preset DofusBook inchangé du build Sram
 // de référence. Ne jamais écraser les variantes personnalisées du joueur.
 const isReferenceSram=String(b?.id)==="sram-air-pvm"&&cls.id==="sram"
  &&(!b?.source||b.source===SOURCE_URL);
 const oldDefaults=!Array.isArray(b?.variants)
  ||(b.variants.length===DEFAULT_VARIANTS.length&&
   b.variants.every((name,i)=>name===DEFAULT_VARIANTS[i]));
 const selectedVariants=isReferenceSram&&oldDefaults?SRAM_SCREENSHOT_VARIANTS:b?.variants;
 return {
 id:String(b?.id||"build-"+index),
 classId:cls.id,character:(isReferenceSram&&(!b?.character||b.character==="Mon Sram")?"Matryoshka":String(b?.character||"Mon "+cls.name)).slice(0,48),
 name:String(b?.name||"Nouveau build").slice(0,60),
 level:Math.max(1,Math.min(200,+b?.level||200)),
 element:["Air","Terre","Feu","Eau","Multi"].includes(b?.element)?b.element:"Air",
 source:typeof b?.source==="string" && /^https:\/\/www\.dofusbook\.net\/desktop\/fr\/equipement\//.test(b.source)?b.source:cls.source,
 variants:cls.pairs.map((p,i)=>p.includes(selectedVariants?.[i])?selectedVariants[i]:cls.defaultVariants[i]),
 ap:Math.max(6,Math.min(20,+b?.ap||12)),turns:Math.max(1,Math.min(10,+b?.turns||10)),
 distance:Number.isFinite(+b?.distance)?Math.max(0,Math.min(30,+b.distance)):(cls.id==="sacrieur"?2:3),
 // Migration automatique de l'ancien build Sacrieur par défaut.
 // Ne pas attribuer les stats de cette capture aux nouveaux builds arbitraires.
 stats:sanitizeCharacterStats(b?.stats||
    (String(b?.id)==="sacri-air-pvm"&&b?.classId==="sacrieur"&&(!b?.source||b.source===SACRIER_SOURCE)
     ?SACRIER_AIR_REFERENCE_STATS:null)||
    (String(b?.id)==="sram-air-pvm"&&b?.classId==="sram"&&(!b?.source||b.source===SOURCE_URL)
     ?SRAM_AIR_REFERENCE_STATS:null)),
 calibration:b?.calibration&&typeof b.calibration==="object"?b.calibration:{}
 };
}
