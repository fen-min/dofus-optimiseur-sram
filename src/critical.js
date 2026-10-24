/**
 * DOFUS Critical: a spell's base rate and a build's displayed Critical add.
 * Crit chance can reach 100%; no artificial 95% ceiling.
 * The in-game character sheet is an aggregate: an equipped Turquoise's
 * permanent +10% is ALREADY included in stats.critical and must not be added.
 */
export function theoreticalCriticalRate(spell,state){
 if(!spell||!(Number(spell.critChance)>0))return 0;
 const buffs=(state?.buffs||[]).filter(b=>b.until>=(state?.turn||1));
 const extra=buffs.reduce((n,b)=>n+(b.stat==="Critique"?Number(b.amount)||0:0),0);
 return Math.max(0,Math.min(1,Number(spell.critChance)+extra/100));
}
export function effectiveCriticalRate(spell,state,settings={}){
 const rate=theoreticalCriticalRate(spell,state);
 // Guaranteed criticals are guaranteed regardless of "probable crits" UI.
 return rate>=1-1e-9?1:(settings.criticals===true||settings.classId==="ecaflip"?rate:0);
}
export function activeTurquoiseBonus(state){
 return Math.min(10,(state?.turquoiseProcs||[]).filter(p=>p.until>=(state?.turn||1))
  .reduce((sum,p)=>sum+(Number(p.value)||0),0));
}
export function registerTurquoiseCritical(state,rate){
 if(!Number.isFinite(rate)||rate<=0)return;
 const room=Math.max(0,10-activeTurquoiseBonus(state));
 const gain=Math.min(rate,room);
 if(gain<=0)return;
 state.turquoiseProcs??=[];
 state.turquoiseProcs.push({value:gain,until:state.turn+2});
}
