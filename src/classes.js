import {SIM_SPELLS,VARIANT_PAIRS,DEFAULT_VARIANTS,SRAM_SCREENSHOT_VARIANTS} from "./sim-spells.js?v=1.8";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS,SACRIER_SOURCE} from "./sacrier-spells.js?v=3.2";
import {SACRIER_CATALOG,SACRIER_VARIANTS} from "./sacrier-catalog.js";
import {SRAM_CATALOG} from "./sram-catalog.js?v=1.8";
import {ECAFLIP_SOURCE,ECAFLIP_PAIRS,ECAFLIP_KARUTA_VARIANTS,ECAFLIP_SPELLS,ECAFLIP_CATALOG} from "./ecaflip-spells.js?v=3.24";
import {SOURCE_URL} from "./spells.js";
import {normalizedWeaponId} from "./weapons.js?v=3.22";
import {SACRIER_AIR_REFERENCE_STATS,SRAM_AIR_REFERENCE_STATS,ECAFLIP_KARUTA_STATS,sanitizeCharacterStats} from "./character-stats.js?v=3.20";
export const CLASSES={
 sram:{id:"sram",name:"Sram",glyph:"☽",color:"#b6a0ff",element:"Air",catalog:SRAM_CATALOG,spells:SIM_SPELLS,pairs:VARIANT_PAIRS,defaultVariants:DEFAULT_VARIANTS,source:SOURCE_URL,model:"Sram expérimental"},
 sacrieur:{id:"sacrieur",name:"Sacrieur",glyph:"◆",color:"#fb9a91",element:"Air",catalog:SACRIER_CATALOG,spells:SACRIER_SPELLS,pairs:SACRIER_VARIANTS,defaultVariants:SACRIER_DEFAULT_VARIANTS,source:SACRIER_SOURCE,model:"Sacrieur expérimental · PV / Souffrance estimés · dégâts du build actif"},
 ecaflip:{id:"ecaflip",name:"Écaflip",glyph:"♣",color:"#86cbd2",element:"Eau",catalog:ECAFLIP_CATALOG,spells:ECAFLIP_SPELLS,pairs:ECAFLIP_PAIRS,defaultVariants:ECAFLIP_KARUTA_VARIANTS,source:ECAFLIP_SOURCE,model:"Écaflip Eau · cartes et Rekop estimés · RNG non simulé"}
};
export const INITIAL_BUILDS=[
 {id:"sram-air-pvm",classId:"sram",character:"Matryoshka",name:"Air PvM 200 Low Cost",level:200,element:"Air",source:SOURCE_URL,variants:SRAM_SCREENSHOT_VARIANTS.slice(),weapon:"manthache",ap:12,turns:10,distance:3,stats:SRAM_AIR_REFERENCE_STATS,calibration:{}},
 {id:"sacri-air-pvm",classId:"sacrieur",character:"Mon Sacrieur",name:"Air PvM 200 Low Cost",level:200,element:"Air",source:SACRIER_SOURCE,variants:SACRIER_DEFAULT_VARIANTS.slice(),weapon:"manthache",ap:12,turns:10,distance:2,stats:SACRIER_AIR_REFERENCE_STATS,calibration:{}},
 {id:"ecaflip-karuta-eau",classId:"ecaflip",character:"Karuta",name:"Eau Critique 200",level:200,element:"Eau",source:ECAFLIP_SOURCE,variants:ECAFLIP_KARUTA_VARIANTS.slice(),weapon:"sceptre-roi-joueur",dofusTurquoise:true,ap:12,turns:10,distance:2,stats:ECAFLIP_KARUTA_STATS,calibration:{}}
];
export function normalizeBuild(b,index=0){
 const cls=CLASSES[b?.classId]||CLASSES.sram;
 // Migrer uniquement l'ancien preset DofusBook inchangé du build Sram
 // de référence. Ne jamais écraser les variantes personnalisées du joueur.
 const isReferenceSram=String(b?.id)==="sram-air-pvm"&&cls.id==="sram"
  &&(!b?.source||b.source===SOURCE_URL);
 // Migration de la Manthache pour le Sacrieur de référence déjà sauvegardé.
 // Une arme explicitement absente (null) ou différente est toujours respectée.
 const isReferenceSacrier=String(b?.id)==="sacri-air-pvm"&&cls.id==="sacrieur"
  &&(!b?.source||b.source===SACRIER_SOURCE);
 const isReferenceEcaflip=String(b?.id)==="ecaflip-karuta-eau"&&cls.id==="ecaflip"
  &&(!b?.source||b.source===ECAFLIP_SOURCE);
 const oldDefaults=!Array.isArray(b?.variants)
  ||(b.variants.length===DEFAULT_VARIANTS.length&&
   b.variants.every((name,i)=>name===DEFAULT_VARIANTS[i]));
 // The user's canonical Sacrieur reference build originally shipped with
 // Mutilation. Switch ONLY its unchanged preset to Pacte de Sang (the user's
 // preferred variant). Preserve all customized variant selections.
 const legacyReferenceSacrier=isReferenceSacrier&&(
  !Array.isArray(b?.variants)||
  (b.variants.length===SACRIER_DEFAULT_VARIANTS.length&&
   b.variants.every((name,i)=>name===SACRIER_DEFAULT_VARIANTS[i])));
 const pactePreset=legacyReferenceSacrier?SACRIER_DEFAULT_VARIANTS.map((name,i)=>
  SACRIER_VARIANTS[i].includes("Pacte de Sang")?"Pacte de Sang":name):null;
 const selectedVariants=isReferenceSram&&oldDefaults?SRAM_SCREENSHOT_VARIANTS:
  pactePreset||b?.variants;
 return {
 id:String(b?.id||"build-"+index),
 classId:cls.id,character:(isReferenceSram&&(!b?.character||b.character==="Mon Sram")?"Matryoshka":String(b?.character||"Mon "+cls.name)).slice(0,48),
 name:String(b?.name||"Nouveau build").slice(0,60),
 level:Math.max(1,Math.min(200,+b?.level||200)),
 element:["Air","Terre","Feu","Eau","Multi"].includes(b?.element)?b.element:"Air",
 source:typeof b?.source==="string" && (/^https:\/\/www\.dofusbook\.net\/desktop\/fr\/equipement\//.test(b.source)||b.source===ECAFLIP_SOURCE)?b.source:cls.source,
 variants:cls.pairs.map((p,i)=>p.includes(selectedVariants?.[i])?selectedVariants[i]:cls.defaultVariants[i]),
 weapon:b?.weapon===undefined?(isReferenceEcaflip?"sceptre-roi-joueur":(isReferenceSram||isReferenceSacrier)?"manthache":null):normalizedWeaponId(b.weapon),
 dofusTurquoise:b?.dofusTurquoise===undefined?isReferenceEcaflip:b.dofusTurquoise===true,
 ap:Math.max(6,Math.min(20,+b?.ap||12)),turns:Math.max(1,Math.min(10,+b?.turns||10)),
 distance:Number.isFinite(+b?.distance)?Math.max(0,Math.min(30,+b.distance)):(cls.id==="sacrieur"?2:3),
 // Migration automatique de l'ancien build Sacrieur par défaut.
 // Ne pas attribuer les stats de cette capture aux nouveaux builds arbitraires.
 stats:sanitizeCharacterStats(b?.stats||
    (isReferenceEcaflip?ECAFLIP_KARUTA_STATS:null)||
    (String(b?.id)==="sacri-air-pvm"&&b?.classId==="sacrieur"&&(!b?.source||b.source===SACRIER_SOURCE)
     ?SACRIER_AIR_REFERENCE_STATS:null)||
    (String(b?.id)==="sram-air-pvm"&&b?.classId==="sram"&&(!b?.source||b.source===SOURCE_URL)
     ?SRAM_AIR_REFERENCE_STATS:null)),
 calibration:b?.calibration&&typeof b.calibration==="object"?b.calibration:{}
 };
}
