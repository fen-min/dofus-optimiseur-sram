/**
 * Read-only handoff from OMBRE's ACTIVE calibrated build to the embedded
 * multi-target mode. Separate from single-target assistant state and history.
 * JSON payload is a structured clone of the exact settings/spell rows passed
 * to the ordinary OMBRE optimizer (no second DofusBook calculation).
 */
export const MULTI_CONTEXT_KEY="ombre-multi-context-v2";
const safeParse=s=>{try{return JSON.parse(s)}catch{return null}};
export function getMultiContext(storage,id){
 const all=safeParse(storage.getItem(MULTI_CONTEXT_KEY))||{};
 return id&&Object.prototype.hasOwnProperty.call(all,id)?all[id]:null;
}
export function saveMultiContext(storage,build,settings,spells){
 if(!build?.id||!Array.isArray(spells)||!settings)throw Error("Build OMBRE incomplet");
 const all=safeParse(storage.getItem(MULTI_CONTEXT_KEY))||{};
 const next={
  build:{id:build.id,classId:build.classId,character:build.character,
   name:build.name,level:build.level,source:build.source},
  settings:JSON.parse(JSON.stringify(settings)),
  spells:JSON.parse(JSON.stringify(spells)),
  stats:build.stats?JSON.parse(JSON.stringify(build.stats)):null,
  damageOrigin:"Valeurs des sorts calibrées dans OMBRE / DofusBook",
  updatedAt:new Date().toISOString()
 };
 // Avoid replaying a live encounter on no-op updates: compare relevant data.
 const previous=all[build.id];
 const signature=JSON.stringify([next.build,next.settings,next.spells,next.stats]);
 if(previous?.signature===signature)return false;
 next.signature=signature;
 all[build.id]=next;
 storage.setItem(MULTI_CONTEXT_KEY,JSON.stringify(all));
 return true;
}
