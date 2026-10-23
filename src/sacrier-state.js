/**
 * Sacrieur PV/Souffrance — estimation PvM monocible.
 * In a live fight, enemy damage, shields and allies change the trajectory.
 * All values here are predictions based on the modeled self-cost and life-steal.
 *
 * Verified reference: Dofus Grimoire 3.7 (suffering thresholds / final bonuses).
 * Losses from self-cast Sacrieur spells use a fraction of CURRENT HP.
 * Never apply the character's agility/power twice to DofusBook damage lines.
 */
export const SUFFERING_FINAL_BONUS=[0,1,3,5,9,14,19,23,26,28,30];

export function sufferingLevel(hp,maxHp){
 if(!Number.isFinite(hp)||!Number.isFinite(maxHp)||maxHp<=0)return 0;
 return Math.max(0,Math.min(10,Math.ceil((1-Math.max(0,Math.min(hp,maxHp))/maxHp)*10-1e-9)));
}
export function sufferingFinalBonus(hp,maxHp){
 return SUFFERING_FINAL_BONUS[sufferingLevel(hp,maxHp)];
}
export function initialSacrierHealth(maxHp,currentPercent=100){
 if(!Number.isFinite(maxHp)||maxHp<=0)return null;
 const max=Math.max(1,Math.round(maxHp));
 const pct=Number.isFinite(currentPercent)?Math.max(1,Math.min(100,currentPercent)):100;
 const hp=Math.max(1,Math.min(max,Math.round(max*pct/100)));
 return {hp,maxHp:max,suffering:sufferingLevel(hp,max)};
}
export function sacrificeHealth(state,percent){
 if(!state||!Number.isFinite(percent)||percent<=0)return state;
 const paid=Math.min(state.hp-1,Math.max(1,Math.floor(state.hp*percent/100)));
 const hp=Math.max(1,state.hp-paid);
 return {...state,hp,suffering:sufferingLevel(hp,state.maxHp)};
}
export function restoreHealth(state,amount){
 if(!state||!Number.isFinite(amount)||amount<=0)return state;
 const hp=Math.min(state.maxHp,state.hp+Math.floor(amount));
 return {...state,hp,suffering:sufferingLevel(hp,state.maxHp)};
}
