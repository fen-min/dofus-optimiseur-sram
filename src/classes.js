import {SIM_SPELLS,VARIANT_PAIRS,DEFAULT_VARIANTS} from "./sim-spells.js";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS,SACRIER_SOURCE} from "./sacrier-spells.js";
import {SACRIER_CATALOG,SACRIER_VARIANTS} from "./sacrier-catalog.js";
import {SRAM_CATALOG} from "./sram-catalog.js";
import {SOURCE_URL} from "./spells.js";
export const CLASSES={
 sram:{id:"sram",name:"Sram",glyph:"☽",color:"#b6a0ff",element:"Air",catalog:SRAM_CATALOG,spells:SIM_SPELLS,pairs:VARIANT_PAIRS,defaultVariants:DEFAULT_VARIANTS,source:SOURCE_URL,model:"Sram expérimental"},
 sacrieur:{id:"sacrieur",name:"Sacrieur",glyph:"◆",color:"#fb9a91",element:"Air",catalog:SACRIER_CATALOG,spells:SACRIER_SPELLS,pairs:SACRIER_VARIANTS,defaultVariants:SACRIER_DEFAULT_VARIANTS,source:SACRIER_SOURCE,model:"Sacrieur expérimental · Souffrance / PV non simulés"}
};
export const INITIAL_BUILDS=[
 {id:"sram-air-pvm",classId:"sram",character:"Mon Sram",name:"Air PvM 200 Low Cost",level:200,element:"Air",source:SOURCE_URL,variants:DEFAULT_VARIANTS.slice(),ap:12,turns:10,calibration:{}},
 {id:"sacri-air-pvm",classId:"sacrieur",character:"Mon Sacrieur",name:"Air PvM 200 Low Cost",level:200,element:"Air",source:SACRIER_SOURCE,variants:SACRIER_DEFAULT_VARIANTS.slice(),ap:12,turns:10,calibration:{}}
];
export function normalizeBuild(b,index=0){
 const cls=CLASSES[b?.classId]||CLASSES.sram;
 return {
 id:String(b?.id||"build-"+index),
 classId:cls.id,character:String(b?.character||"Mon "+cls.name).slice(0,48),
 name:String(b?.name||"Nouveau build").slice(0,60),
 level:Math.max(1,Math.min(200,+b?.level||200)),
 element:["Air","Terre","Feu","Eau","Multi"].includes(b?.element)?b.element:"Air",
 source:typeof b?.source==="string" && /^https:\/\/www\.dofusbook\.net\/desktop\/fr\/equipement\//.test(b.source)?b.source:cls.source,
 variants:cls.pairs.map((p,i)=>p.includes(b?.variants?.[i])?b.variants[i]:cls.defaultVariants[i]),
 ap:Math.max(6,Math.min(20,+b?.ap||12)),turns:Math.max(1,Math.min(10,+b?.turns||10)),
 calibration:b?.calibration&&typeof b.calibration==="object"?b.calibration:{}
 };
}
