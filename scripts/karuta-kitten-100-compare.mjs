/**
 * Compare the same validated 15-turn Karuta reference with 0/1/2/3
 * Griffe kitten summons, then real adaptive decisions through turn 100.
 * Manually replay ALL 100 turns and verify damage/AP and summon-linked
 * Power (cap +270) at each checkpoint.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {KARUTA_FIFTEEN_ROUNDS} from "../src/karuta-fifteen-plan.js";
const mode=process.argv[2]||"NONE";
const schedules={
 NONE:[],ONE:[1],TWO:[1,5],THREE:[1,5,9]
};
assert.ok(schedules[mode],"Unknown mode");
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Eau:0,Terre:0,Feu:0,Neutre:0}});
const build=normalizeBuild(INITIAL_BUILDS.find(x=>x.id==="ecaflip-karuta-eau"));
const ctx=createTeamContext(build,target),id=ctx.build.id;
const R=n=>Math.round((Number(n)||0)*10)/10;
const ids=names=>names.map(name=>{
 const spell=ctx.spells.find(s=>s.name===name);
 assert.ok(spell,"Unrecognized "+name);
 return String(spell.id);
});
const strategy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
let previous=null;const checkpoints={},power={},kittens={},first15=[];
for(let t=1;t<=100;t++){
 if(t<=15){
  let names=KARUTA_FIFTEEN_ROUNDS[t-1].slice();
  if(schedules[mode].includes(t)){
   const i=names.lastIndexOf("Sceptre du Roi Joueur");
   assert.ok(i>=0,"No weapon slot to swap on T"+t);
   names[i]="Griffe Invocatrice";
  }
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[id]:ids(names)}});
  first15.push(names);
 }else previous=optimizeTeamTurn([ctx],target,()=>{},previous,strategy);
 const a=previous.turns.at(-1).actors[0];
 assert.ok(a.spent<=12&&a.availablePA===12);
 const state=previous.session.actors[0].state;
 const living=state.invocations.filter(s=>s.kind==="Chaton Enragé").length;
 const amount=state.buffs.filter(b=>b.key==="Griffe Invocatrice")
  .reduce((v,b)=>v+b.amount,0);
 assert.ok(amount<=270,"Power cap exceeded T"+t);
 assert.equal(amount,90*Math.min(3,living));
 if([1,3,5,9,10,13,15,20,30,50,75,100].includes(t)){
  checkpoints[t]=R(previous.theoretical);power[t]=amount;kittens[t]=living;
 }
}
let manual=null;
for(let t=1;t<=100;t++){
 const names=previous.turns[t-1].actors[0].actions.map(a=>a.name);
 manual=playSequentialTeam([ctx],target,()=>{},{previous:manual,
  oneRound:true,manualOverrides:{[id]:ids(names)}});
 assert.ok(manual.turns.at(-1).actors[0].spent<=12);
}
assert.equal(manual.turns.length,100);
assert.ok(Math.abs(previous.theoretical-manual.theoretical)<.2);
console.log("KARUTA_KITTEN_100_FINAL "+JSON.stringify({
 mode,schedule:schedules[mode],damage100:R(previous.theoretical),
 mean:R(previous.theoretical/100),checkpoints,
 power,kittens,first15,replayed:R(manual.theoretical),
 notes:"Target fixed resistance 0%; no enemies hit or kill kittens; kitten autonomous attacks not simulated."
}));
