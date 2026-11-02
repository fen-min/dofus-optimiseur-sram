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
const target=cleanTeamTarget({turns:10,hp:1e12,criticals:true,
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
 return current.sort((a,b)=>b.state.total-a.state.total)[0];
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
const records=[],start=Date.now();
for(const {pct,floor} of points)for(const variant of ["Pacte de Sang","Mutilation"]){
 const ctx=makeCtx(pct,variant);
 const current=automatic(ctx,floor),found=beam(ctx,floor);
 if(!found){console.log("SACRI_BEAM_NONE "+JSON.stringify({pct,floor,variant}));continue;}
 const replay=verifyManual(ctx,found,floor);
 const report={pct,floor,variant,auto3:R(current.total),
  beam3:R(replay.theoretical),delta3:R(replay.theoretical-current.total),
  rotation:found.rotations,endingHp:R(found.state.sacrierHealth.hp/
    found.state.sacrierHealth.maxHp*100)};
 records.push(report);
 console.log("SACRI_BEAM_COMPARE "+JSON.stringify(report));
}
console.log("SACRI_BEAM_FINAL "+JSON.stringify({count:records.length,
 elapsedSeconds:R((Date.now()-start)/1000),records}));
