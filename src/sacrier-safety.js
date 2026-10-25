/**
 * Sacrieur PvM safety guard.
 * The health floor is a percentage of CURRENT maximum HP, including the
 * temporary Vitality granted by Pacte de Sang. Enemy damage is not modeled.
 */
export const DEFAULT_SACRIER_MIN_HP_PERCENT=50;
export function cleanSacrierMinHpPercent(value,fallback=DEFAULT_SACRIER_MIN_HP_PERCENT){
 if(value===undefined||value===null||value==="")return fallback;
 const n=Number(value);
 return Number.isFinite(n)?Math.round(Math.max(0,Math.min(100,n))):fallback;
}
export function sacrierHealthAboveFloor(state,percent=DEFAULT_SACRIER_MIN_HP_PERCENT){
 const hp=state?.sacrierHealth;
 if(!hp)return true;
 return hp.hp+1e-7>=hp.maxHp*cleanSacrierMinHpPercent(percent)/100;
}
/**
 * Test the lowest estimated health reached DURING the cast as well as after.
 * HP sacrifice is resolved before life steal: checking only the completed
 * spell could conceal a dangerous temporary dip under the configured floor.
 */
export function sacrierCastAboveFloor(before,spell,after,percent=DEFAULT_SACRIER_MIN_HP_PERCENT){
 if(!sacrierHealthAboveFloor(after,percent))return false;
 const hp=before?.sacrierHealth;
 if(!hp)return true;
 const cost=Number(spell?.status?.hpCostPercent)||0;
 const coagulation=spell?.status?.mutilation&&before.mutilationStage>0;
 const endingBerserk=spell?.status?.berserk&&before.berserkActive;
 if(cost>0&&!coagulation&&!endingBerserk){
  const paid=Math.min(hp.hp-1,Math.max(1,Math.floor(hp.hp*cost/100)));
  if(hp.hp-paid+1e-7<hp.maxHp*cleanSacrierMinHpPercent(percent)/100)return false;
 }
 return true;
}
