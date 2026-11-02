/**
 * Karuta MANUAL DPS experiment: legal simulated spells, variants, PA,
 * criticals, cards, buffs and cooldowns across 1 / 3 / 10 / 15 / 100 turns.
 * Every reported winning trajectory is independently replayed through
 * playSequentialTeam manualOverrides. No extra PA/buff/damage is fabricated.
 *
 * Scenarios:
 *   ALL      all equipped simulated spells, including active Griffe buff
 *   NOPREP   no purely non-damaging preparatory buff spell
 *   NOSTAT   no spell known to grant active offensive-stat buffs or
 *            set up a card-combo buff; unavoidable gear passives remain.
 * Beam search is heuristic, NOT proof of global maximal DPS.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {KARUTA_FIFTEEN_ROUNDS} from "../src/karuta-fifteen-plan.js";

const duration=Number(process.argv[2]||3);
assert.ok([1,3,10,15,100].includes(duration),"Choose 1/3/10/15/100 turns");
const args=process.argv.slice(3);
const modeName=args.find(x=>["ALL","NOPREP","NOSTAT"].includes(x))||"ALL";
const target=cleanTeamTarget({turns:duration,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const build=normalizeBuild(INITIAL_BUILDS.find(x=>x.id==="ecaflip-karuta-eau"));
const ctx=createTeamContext(build,target);
assert.equal(ctx.settings.ap,12);
const selected=sp=>sp.isWeapon||ctx.settings.variants?.[sp.variantGroup]===sp.name;
const usable=ctx.spells.filter(sp=>selected(sp)&&!sp.status?.unsupported&&
 (sp.min>0||sp.ecaflipRekop||sp.playHand||sp.playSuit||sp.drawCard||
  sp.status?.buff||sp.ecaflipCriticalRateBuff||sp.ecaflipCritDamageBuff||
  sp.restoreTable||sp.isWeapon));
const reasonNoStat=sp=>{
 if(sp.status?.buff||sp.ecaflipCriticalRateBuff||sp.ecaflipCritDamageBuff||
  sp.ecaflipCritResistanceShred||sp.playSuit||sp.playHand||sp.restoreTable)
  return true;
 // Four-card hands and a staged table are excluded in the no-stat-bonus
 // case, rather than pretending their buffs are suppressed.
 return false;
};
const modes={
 ALL:usable,
 NOPREP:usable.filter(sp=>!(sp.nonDirect&&sp.status?.buff)),
 NOSTAT:usable.filter(sp=>!reasonNoStat(sp))
};
const allowed=modes[modeName];
const R=n=>Math.round((Number(n)||0)*10)/10;
const format=path=>path.map(turn=>turn.map(id=>ctx.spells.find(sp=>String(sp.id)===id)?.name||id));
const sig=s=>JSON.stringify([s.turn,s.pa,s.used,s.ready,
 s.buffs?.map(b=>[b.key,b.stat,b.amount,b.until]),
 s.ecaHand,s.ecaTable,s.turquoiseProcs,s.enemyCriticalShreds,
 s.dots,s.charges,s.enemyDebuff,s.position,s.visible,s.invo​​cations]);
const projected=(s,weight)=>{
 const remain=duration-s.turn+1;
 if(remain<=0)return 0;
 let bonus=0;
 for(const b of s.buffs||[]){
  const t=Math.max(0,Math.min(remain,b.until-s.turn+1));
  if(!t)continue;
  if(["Puissance","Air","Eau","Terre","Feu"].includes(b.stat))bonus+=t*b.amount*.55;
  else if(b.stat==="Critique")bonus+=t*b.amount*4.5;
  else if(b.stat==="Dommages Critiques")bonus+=t*b.amount*5;
  else if(b.stat==="Dommages finaux")bonus+=t*b.amount*10;
  else if(b.stat==="Dommages")bonus+=t*b.amount*2.2;
 }
 const club=new Set((s.ecaHand||[]).filter(c=>c.suit==="club").map(c=>c.rank));
 return weight*(bonus+(s.ecaHand?.length||0)*65+(s.ecaTable?.length||0)*15+
  (club.size>=3?1200*(club.size-2):0));
};
function unique(rows,limit,score){
 const best=new Map();
 for(const row of rows){
  const key=sig(row.state);
  const old=best.get(key);
  if(!old||row.state.total>old.state.total)best.set(key,row);
 }
 return [...best.values()].sort((a,b)=>score(b)-score(a)).slice(0,limit);
}
const counts={casts:0,turns:0,replays:0,invalid:0};
function expand(seed,config){
 let frontier=[{state:seed.state,actions:[]}],all=[];
 const depth=config.depth;
 for(let d=0;d<=depth;d++){
  all.push(...frontier);
  if(d===depth)break;
  const next=[];
  for(const row of frontier){
   for(const sp of allowed){
    if(!eligible(sp,row.state,ctx.settings))continue;
    try{
     const after=castSpell(row.state,sp,ctx.settings);
     counts.casts++;
     next.push({state:after,actions:[...row.actions,String(sp.id)]});
    }catch{counts.invalid++;}
   }
  }
  if(!next.length)break;
  frontier=unique(next,config.width,x=>x.state.total+projected(x.state,config.weight));
 }
 return unique(all,config.keep,x=>x.state.total+projected(x.state,config.weight))
  .map(x=>({state:endTurn(x.state,ctx.settings),
   rotations:[...seed.rotations,x.actions]}));
}
function run(config){
 let frontier=[{state:initialState(ctx.settings),rotations:[]}];
 for(let t=1;t<=duration;t++){
  const expanded=[];
  for(const candidate of frontier){
   assert.equal(candidate.state.turn,t);
   expanded.push(...expand(candidate,config));
   counts.turns++;
  }
  frontier=unique(expanded,config.seeds,
   x=>x.state.total+projected(x.state,config.weight));
  assert.ok(frontier.length,"No legal plans for "+modeName+" T"+t);
  if([1,3,10,15,50,100].includes(t))
   console.log("KARUTA_MANUAL_PROGRESS "+JSON.stringify({
    mode:modeName,duration,turn:t,weight:config.weight,
    top:R(frontier[0].state.total),explored:counts.casts
   }));
 }
 return frontier.sort((a,b)=>b.state.total-a.state.total);
}
function replay(rotations){
 counts.replays++;
 let previous=null;
 for(let t=0;t<duration;t++){
  const names=rotations[t]||[];
  for(const id of names){
   const sp=ctx.spells.find(s=>String(s.id)===String(id));
   assert.ok(sp&&selected(sp)&&allowed.includes(sp),
    "Disallowed variant/buff in manual scenario: "+id);
  }
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[ctx.build.id]:names}});
  const actor=previous.turns[t].actors[0];
  assert.equal(actor.availablePA,12);
  assert.ok(actor.spent<=12+1e-6,"Illegal PA T"+(t+1));
  assert.deepEqual(actor.actions.map(a=>a.name),
   names.map(id=>ctx.spells.find(sp=>String(sp.id)===String(id)).name));
 }
 return {total:R(previous.theoretical),
  damageByRound:previous.turns.map(r=>R(r.actors[0].damage)),
  pa:previous.turns.map(r=>r.actors[0].spent),
  buffsByTurn:previous.turns.map(r=>r.actors[0].log?.effects||[]),
  actions:previous.turns.map(r=>r.actors[0].actions.map(a=>a.name))};
}
console.log("KARUTA_MANUAL_CONFIG "+JSON.stringify({
 scenario:modeName,duration,character:ctx.build.character,pa:ctx.settings.ap,
 crit:ctx.settings.criticals,dofusTurquoise:ctx.settings.dofusTurquoise,
 variants:ctx.settings.variants,
 included:allowed.map(s=>({name:s.name,pa:s.pa,nonDirect:s.nonDirect,
  buff:!!(s.status?.buff||s.ecaflipCriticalRateBuff||s.ecaflipCritDamageBuff||
   s.ecaflipCritResistanceShred||s.playSuit||s.playHand)})),
 excluded:usable.filter(sp=>!allowed.includes(sp)).map(s=>s.name),
 unavailable:ctx.spells.filter(sp=>selected(sp)&&sp.status?.unsupported)
  .map(s=>s.name)
}));
const configs=duration===100?
 [{weight:.8,width:20,depth:7,keep:2,seeds:1}]:
 duration>=15?
 [{weight:0,width:45,depth:8,keep:4,seeds:5},
  {weight:1.2,width:45,depth:8,keep:4,seeds:5}]:
 [{weight:0,width:80,depth:9,keep:6,seeds:8},
  {weight:.8,width:80,depth:9,keep:6,seeds:8},
  {weight:2.2,width:80,depth:9,keep:6,seeds:8}];
const candidates=[];
for(const config of configs){
 const top=run(config);
 candidates.push(...top.slice(0,3).map(row=>({...row,heuristic:config.weight})));
}
if(modeName!=="NOSTAT"&&duration<=15){
 const known=KARUTA_FIFTEEN_ROUNDS.slice(0,duration).map(turn=>
  turn.map(name=>String(ctx.spells.find(s=>s.name===name)?.id||"")));
 if(known.every(turn=>turn.every(id=>allowed.some(s=>String(s.id)===id)))){
  try{
   const report=replay(known);
   candidates.push({state:{total:report.total},rotations:known,heuristic:"audited"});
  }catch(e){console.log("KARUTA_MANUAL_REFERENCE_ISSUE "+String(e.message||e));}
 }
}
candidates.sort((a,b)=>b.state.total-a.state.total);
let winner=null;
for(const row of candidates.slice(0,9)){
 try{
  const actual=replay(row.rotations);
  assert.ok(Math.abs(actual.total-row.state.total)<.15,
   "Independent manual replay mismatch "+actual.total+" vs "+row.state.total);
  if(!winner||actual.total>winner.report.total)
   winner={report:actual,rotations:row.rotations,from:row.heuristic};
 }catch(e){console.log("KARUTA_MANUAL_REPLAY_ERROR "+String(e.message||e));}
}
assert.ok(winner,"no verified manual rotation");
console.log("KARUTA_MANUAL_FINAL "+JSON.stringify({
 duration,scenario:modeName,total:winner.report.total,
 average:R(winner.report.total/duration),
 firstTurns:winner.report.actions.slice(0,Math.min(15,duration)),
 damageByRound:winner.report.damageByRound,
 spellsByTurn:winner.report.actions,
 spendPA:winner.report.pa,
 createdBy:winner.from,checks:counts,
 notice:"Best tested among bounded deterministic beams, not global proof. Crits are EXPECTED, not guaranteed. Target has infinite HP, no enemy attacks; no invented buffs."
}));
