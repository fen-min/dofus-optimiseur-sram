/**
 * Long-horizon team decision helper.
 * Forecasts are private to the current decision: only the chosen CURRENT
 * actor turn is committed by playSequentialTeam. Manual mode never calls this.
 */
import {cleanSettings,eligible,castSpell,endTurn,optimizeFromState} from "./engine.js?v=3.26";

export const DEFAULT_TEAM_STRATEGY=Object.freeze({mode:"long",horizon:10,effort:"balanced"});
export function cleanTeamStrategy(raw={}){
 const obj=raw&&typeof raw==="object"?raw:{};
 const horizon=Number(obj.horizon);
 return {
  mode:obj.mode==="fast"?"fast":"long",
  horizon:Number.isInteger(horizon)?Math.max(3,Math.min(10,horizon)):10,
  effort:["quick","balanced","deep"].includes(obj.effort)?obj.effort:"balanced"
 };
}
const isSelected=(spell,ctx)=>spell.isWeapon||ctx.settings.variants?.[spell.variantGroup]===spell.name;
const round=n=>Math.round((Number(n)||0)*10)/10;
const id=x=>String(x.id);
const teamPA=spell=>{
 const b=spell.status?.teamBuff||spell.status?.allyBuff;
 return ["PA","AP","ACTIONPOINTS"].includes(String(b?.stat||"").toUpperCase())&&
  Number(b?.value)>0?b:null;
};
const scoreAllyDamage=entry=>{
 const opts=entry.ctx.spells.filter(sp=>isSelected(sp,entry.ctx)&&
   !sp.status?.unsupported&&!sp.nonDirect&&!sp.isTrap&&!sp.status?.poison&&sp.pa>0&&sp.max>0);
 const ap=Math.max(1,Number(entry.currentPA)||Number(entry.ctx.settings.ap)||12);
 return Math.max(0,...opts.map(s=>{
  const chance=entry.ctx.settings.criticals?(s.critChance||0):0;
  const damage=(s.min+s.max)/2*(1-chance)+(s.critMin+s.critMax)/2*chance;
  const res=entry.ctx.settings.resistances?.[s.element]||0;
  return Math.max(0,damage)*(1-res/100)/s.pa*ap;
 }));
};
function supportValue(before,after,actions,ctx,following,horizon){
 let value=0;
 const first=Math.max(1,before.enemyDebuff?.expires>=before.turn?before.enemyDebuff.multiplier:1);
 const second=Math.max(first,after.enemyDebuff?.expires>=after.turn?after.enemyDebuff.multiplier:1);
 if(second>first){
  const remaining=Math.min(horizon,Math.max(0,(after.enemyDebuff?.expires||0)-before.turn+1));
  // All following allies are still to act this round. Future allied attacks
  // are proxies (never booked as actual damage).
  value+=following.reduce((sum,ally)=>sum+scoreAllyDamage(ally),0)*(second/first-1)*
   (1+Math.max(0,remaining-1)*0.45);
 }
 for(const action of actions){
  const spell=ctx.spells.find(s=>id(s)===String(action.id));
  const buff=teamPA(spell);
  if(!buff)continue;
  const duration=Math.min(horizon,Math.max(1,Number(buff.duration)||1));
  value+=following.reduce((sum,ally)=>{
   const accepted=["allies","team","all","others"].includes(buff.targets||"allies");
   return sum+(accepted?scoreAllyDamage(ally)*
    Math.min(1,Number(buff.value)/(Number(ally.currentPA)||Number(ally.ctx.settings.ap)||12))*0.65:0);
  },0)*(1+Math.max(0,duration-1)*0.45);
 }
 return value;
}
function replayPrefix(seed,prefix,ctx){
 let s=seed;
 for(const spell of prefix){
  if(!spell||!eligible(spell,s,ctx.settings))return null;
  s=castSpell(s,spell,ctx.settings);
 }
 return s;
}
function fullTurn(ctx,seed,prefix){
 const partial=replayPrefix(seed,prefix,ctx);
 if(!partial)return null;
 const t=seed.turn;
 const config=cleanSettings({...ctx.settings,turns:t,
  apByTurn:{...ctx.settings.apByTurn,[t]:seed.pa},beamWidth:4,refreshTimedBuffs:false});
 const result=optimizeFromState(config,ctx.spells,partial);
 const turn=result.turns[t-1];
 return turn?.actions||null;
}
function prefixCandidates(entry,limit){
 const {ctx,state}=entry;
 const selected=ctx.spells.filter(s=>isSelected(s,ctx)&&eligible(s,state,ctx.settings));
 const prioritized=selected.map(s=>{
  let score=0;
  if(s.status?.vulnerability)score+=500;
  if(teamPA(s))score+=450;
  if(s.status?.buff)score+=300;
  if(s.ecaflipCriticalRateBuff||s.ecaflipCritDamageBuff)score+=360;
  if(s.ecaflipRekop||s.playSuit||s.restoreTable)score+=400;
  if(s.drawCard)score+=110;
  if(s.isWeapon)score+=65;
  if(s.max>0)score+=s.max/Math.max(1,s.pa)*0.3;
  return {spell:s,score};
 }).sort((a,b)=>b.score-a.score);
 // Keep space for a low-cost direct spell even if there are many buffs.
 const prefixes=prioritized.slice(0,limit).map(({spell})=>[spell]);
 if(ctx.settings.classId==="ecaflip"){
  const yams=selected.find(x=>x.name==="Yams");
  if(yams&&state.pa>=2*yams.pa)prefixes.push([yams,yams]);
  const todo=["Yams","Kraps","Griffe Joueuse","Infortune"]
   .filter(name=>!state.ecaHand?.some(c=>c.suit==="club"&&c.rank===
    ({Yams:2,Kraps:3,"Griffe Joueuse":4,Infortune:5}[name])))
   .map(name=>selected.find(x=>x.name===name));
  if(todo.length&&todo.every(Boolean)&&todo.reduce((n,s)=>n+s.pa,0)<=state.pa)
   prefixes.push(todo);
  const hand=state.ecaHand||[];
  if([2,3,4,5].every(rank=>hand.some(card=>card.suit==="club"&&card.rank===rank))){
   const seq=["Baraka","Tout ou Rien","Rekop"].map(name=>selected.find(x=>x.name===name));
   if(seq.every(Boolean)&&seq.reduce((n,s)=>n+s.pa,0)<=state.pa)prefixes.push(seq);
  }
 }
 return prefixes;
}
/**
 * Compare real simulations of the actor's next H turns, plus an explicitly
 * approximate contribution for ally vulnerability and PA grants.
 * High search effort changes breadth, not the number of turns actually played.
 */
export function planLongTeamTurn(entry,following=[],strategy=DEFAULT_TEAM_STRATEGY,fastPlan=null){
 const config=cleanTeamStrategy(strategy);
 const {ctx,state}=entry;
 if(config.mode==="fast"||config.horizon<2||state.turn>=ctx.settings.turns)return fastPlan;
 const specs={quick:{prefixes:2,beam:2},balanced:{prefixes:4,beam:3},deep:{prefixes:8,beam:5}}[config.effort];
 const horizon=Math.min(config.horizon,ctx.settings.turns-state.turn+1);
 if(horizon<=1)return fastPlan;
 const options=new Map();
 const add=actions=>{
  if(!actions)return;
  const key=actions.map(a=>id(a)).join("|");
  if(!options.has(key))options.set(key,actions);
 };
 add(fastPlan?.actions||[]);
 for(const prefix of prefixCandidates(entry,specs.prefixes)){
  try{add(fullTurn(ctx,state,prefix));}catch{/* Unmodeled combination: ignore. */}
 }
 if(!options.size)return fastPlan;
 let best=null;
 const forecastSettings=cleanSettings({...ctx.settings,
  turns:state.turn+horizon-1,beamWidth:specs.beam,refreshTimedBuffs:false});
 for(const actions of options.values()){
  let after=state,legal=true;
  for(const action of actions){
   const spell=ctx.spells.find(sp=>id(sp)===id(action));
   if(!spell||!eligible(spell,after,ctx.settings)){legal=false;break;}
   after=castSpell(after,spell,ctx.settings);
  }
  if(!legal)continue;
  let forecast=0;
  try{
   const ended=endTurn(after,ctx.settings);
   forecast=optimizeFromState(forecastSettings,ctx.spells,ended).total-state.total;
  }catch{continue;}
  const allyValue=supportValue(state,after,actions,ctx,following,horizon);
  const value=forecast+allyValue;
  if(!best||value>best.value+.01)best={
   value,actions,label:"DPS équipe · vision "+horizon+" tours",settings:ctx.settings
  };
 }
 return best?{actions:best.actions,label:best.label,settings:ctx.settings}:fastPlan;
}
