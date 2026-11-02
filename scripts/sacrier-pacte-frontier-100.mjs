/**
 * Independent 3-round Sacrier beam search at each requested starting HP.
 * Every move is a real engine cast. Search heuristics rank candidate states
 * but ALL reported damage comes from replay, not heuristic scores.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
import {playSequentialTeam} from "../src/team-sequential.js";

const R=n=>Math.round((Number(n)||0)*10)/10;
const base=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="sacri-air-pvm"));
const variantsSlot=CLASSES.sacrieur.pairs.findIndex(x=>x.includes("Pacte de Sang"));
const points=[{pct:30,floor:20},{pct:40,floor:20},{pct:60,floor:50},
 {pct:70,floor:50},{pct:80,floor:50}];
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
function makeCtx(pct,name){
 const build=structuredClone(base);
 build.variants[variantsSlot]=name;
 const ctx=createTeamContext(build,target);
 ctx.settings.sacrierStartingHpPercent=pct;
 return ctx;
}
function buffValue(s){
 const remain=10-s.turn+1;
 return (s.buffs||[]).reduce((sum,b)=>{
  const n=Math.max(0,Math.min(3,remain,Number(b.until)-s.turn+1));
  if(!n)return sum;
  if(b.stat==="Puissance")return sum+n*Math.max(0,b.amount)*1.5;
  if(b.stat==="Dommages finaux")return sum+n*Math.max(0,b.amount)*28;
  if(["Air","Eau","Terre","Feu"].includes(b.stat))return sum+n*b.amount*1.1;
  return sum;
 },0);
}
function score(s){return s.total+buffValue(s);}
function distinct(states,width){
 const choices=new Map();
 for(const entry of states){
  const s=entry.state;
  const fingerprint=JSON.stringify([s.turn,s.pa,s.used,s.ready,
   s.buffs.map(b=>[b.key,b.until,b.amount]),s.sacrierHealth?.hp,
   s.sacrierHealth?.maxHp,s.mutilationStage,s.berserkActive]);
  const previous=choices.get(fingerprint);
  if(!previous||score(s)>score(previous.state))choices.set(fingerprint,entry);
 }
 return [...choices.values()].sort((a,b)=>score(b.state)-score(a.state)).slice(0,width);
}
function turnCandidates(ctx,seed,floor){
 const active=ctx.spells.filter(s=>(s.isWeapon||
  ctx.settings.variants?.[s.variantGroup]===s.name)&&
  !s.status?.unsupported&&
  (s.min>0||s.lifeSteal||s.status?.buff||s.status?.berserk||s.status?.vulnerability));
 let frontier=[{state:seed,path:[]}],finished=[...frontier];
 const limit=7;
 for(let depth=0;depth<limit;depth++){
  const expanded=[];
  for(const row of frontier){
   for(const spell of active){
    if(!eligible(spell,row.state,ctx.settings))continue;
    const next=castSpell(row.state,spell,ctx.settings);
    if(!sacrierCastAboveFloor(row.state,spell,next,floor))continue;
    expanded.push({state:next,path:[...row.path,spell.name]});
   }
  }
  if(!expanded.length)break;
  frontier=distinct(expanded,34);
  finished.push(...frontier);
 }
 const endings=[];
 for(const row of distinct(finished,50)){
  const next=endTurn(row.state,ctx.settings);
  if(!sacrierHealthAboveFloor(next,floor))continue;
  endings.push({state:next,path:row.path});
 }
 return distinct(endings,9);
}
function beam(ctx,floor){
 let current=[{state:initialState(ctx.settings),rotations:[]}];
 for(let turn=1;turn<=3;turn++){
  const generated=[];
  for(const seed of current)for(const option of turnCandidates(ctx,seed.state,floor))
   generated.push({state:option.state,rotations:[...seed.rotations,option.path]});
  current=distinct(generated,12);
  if(!current.length)return null;
 }
 return current.sort((a,b)=>b.state.total-a.state.total).slice(0,10);
}
function automatic(ctx,floor){
 const strategy={mode:"long",horizon:10,minHpPercent:floor};
 let previous=null;
 for(let i=0;i<3;i++)previous=optimizeTeamTurn([ctx],target,()=>{},previous,strategy);
 return {total:previous.theoretical,rotations:previous.turns.map(t=>
  t.actors[0].actions.map(a=>a.name)),result:previous};
}
function verifyManual(ctx,path,floor){
 let previous=null;
 for(const names of path.rotations){
  const ids=names.map(name=>{
   const spell=ctx.spells.find(s=>s.name===name);assert.ok(spell,name);
   return spell.id;
  });
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[ctx.build.id]:ids}});
  assert.ok(sacrierHealthAboveFloor(previous.session.actors[0].state,floor));
 }
 assert.ok(Math.abs(previous.theoretical-path.state.total)<0.21,
  "Independent manual replay differs from HP beam engine: "+
  previous.theoretical+" vs "+path.state.total);
 return previous;
}

/**
 * Top 18 three-turn states: independently verify the first three rounds,
 * then score their actual 15-turn and 100-turn continuations.
 * Unlike a 3-turn-only winner, the final winner is selected using real
 * 100-turn DPS (with the identical true 12 PA game states).
 */
const t0=Date.now();
const policy=floor=>({mode:"long",horizon:10,minHpPercent:floor});
function finish(ctx,first,floor,lastTurn=15){
 let previous=null,valid=true,minHp=100,summary={};
 const three=first?.rotations||[];
 for(let t=1;t<=lastTurn;t++){
  try{
   if(t<=three.length){
    const ids=three[t-1].map(name=>{
     const sp=ctx.spells.find(s=>s.name===name);
     assert.ok(sp,"Unknown spell "+name);return sp.id;
    });
    previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
     manualOverrides:{[ctx.build.id]:ids},teamStrategy:policy(floor)});
   }else previous=optimizeTeamTurn([ctx],target,()=>{},previous,policy(floor));
  }catch(e){
   return {valid:false,error:String(e.message||e),turn:t};
  }
  const act=previous.turns.at(-1).actors[0];
  assert.ok(act.spent<=act.availablePA+.001);
  const state=previous.session.actors[0].state;
  const hp=state.sacrierHealth.hp/state.sacrierHealth.maxHp*100;
  minHp=Math.min(minHp,hp);
  if(!sacrierHealthAboveFloor(state,floor)){
   valid=false;break;
  }
  if([3,10,15,30,50,100].includes(t))summary[t]=R(previous.theoretical);
 }
 return {valid,total:R(previous.theoretical),minHp:R(minHp),summary};
}
const all=[];
for(const {pct,floor} of points){
 const ctx=makeCtx(pct,"Pacte de Sang");
 const candidates=beam(ctx,floor);
 assert.ok(candidates?.length,"no Pacte beam candidate "+pct);
 const qualified=[];
 for(const [i,path] of candidates.entries()){
  const replay=verifyManual(ctx,path,floor);
  assert.ok(Math.abs(replay.theoretical-path.state.total)<.2);
  const result=finish(ctx,path,floor,15);
  const row={i,pct,first:path.rotations,three:R(path.state.total),fifteen:result};
  qualified.push({path,row});
  console.log("PACTE_FRONTIER_15 "+JSON.stringify(row));
 }
 const finalist=qualified.filter(x=>x.row.fifteen.valid)
  .sort((a,b)=>b.row.fifteen.total-a.row.fifteen.total).slice(0,2);
 // Compare top 15-round paths over the full 100-turn fight.
 const finals=[];
 for(const {row,path} of finalist){
  const result=finish(ctx,path,floor,100);
  const output={pct,floor,i:row.i,first:row.first,three:row.three,
   fifteen:row.fifteen.total,hundred:result};
  finals.push(output);
  console.log("PACTE_FRONTIER_100 "+JSON.stringify(output));
 }
 const winner=finals.filter(x=>x.hundred.valid)
  .sort((a,b)=>b.hundred.total-a.hundred.total)[0]||null;
 console.log("PACTE_FRONTIER_WINNER "+JSON.stringify({pct,floor,winner}));
 all.push({pct,floor,winner});
}
console.log("PACTE_FRONTIER_FINAL "+JSON.stringify({
 seconds:R((Date.now()-t0)/1000),all
}));
