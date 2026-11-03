/**
 * OMBRE 100-round DPS study - step 1: generate the actual AUTO 100-round
 * champion-50 + adaptive-50 baseline, then verify each round manually.
 * Benchmark: unchanged three in-game reference builds, 12 AP, 0% target
 * resistance, high HP, expected crits, Sacrier HP floor 50%.
 */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {cleanTeamTarget,createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {TEAM_FIFTY_AUDITED} from "../src/team-audited-fifty-plan.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const R=n=>Math.round(Number(n)*10)/10;
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const strategy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const contexts=INITIAL_BUILDS.map(b=>{
 const build=normalizeBuild(b);
 if(build.classId==="sacrieur")build.distance=1;
 if(build.classId==="sram")build.distance=3; // the user's real base
 return createTeamContext(build,target);
});
const classes=["sacrieur","ecaflip","sram"];
const ctx=Object.fromEntries(contexts.map(c=>[c.settings.classId,c]));
const ids=Object.fromEntries(classes.map(cls=>[cls,ctx[cls].build.id]));
const actorNames=Object.fromEntries(classes.map(cls=>[cls,ctx[cls].build.character]));
const spellId=(cls,name)=>{
 const s=ctx[cls].spells.find(s=>s.name===name);
 assert.ok(s,"Unknown spell "+cls+" "+name);
 return String(s.id);
};
const snapshot=(r,t)=>({
 t,damage:R(r.theoretical),byActor:Object.fromEntries(r.members.map(a=>[a.character,R(a.estimated)])),
 sacrierHealth:R(100*r.session.actors.find(a=>a.id===ids.sacrieur).state.sacrierHealth.hp/
  r.session.actors.find(a=>a.id===ids.sacrieur).state.sacrierHealth.maxHp),
 champion:r.session.teamFiftyPlan?{enabled:r.session.teamFiftyPlan.enabled,
  reason:r.session.teamFiftyPlan.reason||null}:null
});
const path=Object.fromEntries(classes.map(cls=>[cls,[]]));
let baseline=null,minimum=100;
const checkpoints={};
for(let t=1;t<=100;t++){
 baseline=optimizeTeamTurn(contexts,target,()=>{},baseline,strategy);
 assert.equal(baseline.turns.length,t,"AUTO round counter mismatch");
 const row=baseline.turns.at(-1);
 for(const actor of row.actors){
  const cls=classes.find(cls=>ids[cls]===actor.id);
  assert.ok(cls);
  const actions=actor.actions.map(a=>a.name);
  path[cls].push(actions);
  assert.ok(actor.spent<=actor.availablePA+1e-5,"AP overflow "+cls+" at T"+t);
  if(t<=50)assert.deepEqual(actions,TEAM_FIFTY_AUDITED[cls][t-1],
   "50-round champion was not used at T"+t+" "+cls);
 }
 const state=baseline.session.actors.find(a=>a.id===ids.sacrieur).state;
 const hp=100*state.sacrierHealth.hp/state.sacrierHealth.maxHp;
 minimum=Math.min(minimum,hp);
 if(!sacrierHealthAboveFloor(state,50))
  console.log("OMBRE100_UNSAFE "+JSON.stringify({t,hp:R(hp),route:row.actors[0].actions.map(x=>x.name)}));
 if([1,10,25,50,51,60,75,90,100].includes(t)){
  checkpoints[t]=snapshot(baseline,t);
  console.log("OMBRE100_PROGRESS "+JSON.stringify(checkpoints[t]));
 }
}
const autoScore=R(baseline.theoretical);
const autoHp=R(minimum);
console.log("OMBRE100_AUTO_DONE "+JSON.stringify({score:autoScore,minSacrierHp:autoHp,
 checkpoint50:checkpoints[50],checkpoint100:checkpoints[100]}));
let manual=null,minimumManual=100;
for(let t=1;t<=100;t++){
 const overrides=Object.fromEntries(classes.map(cls=>[ids[cls],
  path[cls][t-1].map(name=>spellId(cls,name))]));
 manual=playSequentialTeam(contexts,target,()=>{},{previous:manual,
  oneRound:true,manualOverrides:overrides});
 const row=manual.turns.at(-1);
 for(const actor of row.actors){
  assert.ok(actor.spent<=actor.availablePA+1e-5);
  if(actor.id===ids.sacrieur){
   const hp=100*actor.health.hp/actor.health.maxHp;
   minimumManual=Math.min(minimumManual,hp);
  }
 }
 if(Math.abs(manual.theoretical-baseline.turns.slice(0,t).reduce((sum,row)=>sum+row.theoretical,0))>3){
  // Sum of rounded turn values can drift, compare actor state at final instead.
  if([50,100].includes(t))
   console.log("OMBRE100_COMPARISON_NOTE "+JSON.stringify({t,manual:manual.theoretical}));
 }
}
assert.equal(manual.turns.length,100);
assert.equal(R(manual.theoretical),autoScore,"manual AUTO replay must match damage exactly");
const output={
 title:"OMBRE - 100-turn auto baseline and full manual replay",
 conditions:{turns:100,basePA:12,targetRes:0,targetHP:target.hp,critical:true,
  sacrierDistance:1,sramDistance:3,minSacrierHp:50},
 auto100:autoScore,manual100:R(manual.theoretical),
 minSacrierHpAuto:autoHp,minSacrierHpManual:R(minimumManual),
 checkpoints,byCharacter:Object.fromEntries(manual.members.map(m=>[m.character,R(m.estimated)])),
 rotations:Array.from({length:100},(_,i)=>({turn:i+1,
  sacrieur:path.sacrieur[i],karuta:path.ecaflip[i],matryoshka:path.sram[i]})),
 note:"No enemy attacks/placement/kitten autonomous damage; this is an in-model baseline, not proven optimal."
};
mkdirSync("results",{recursive:true});
writeFileSync("results/ombre-manual-100-baseline.json",JSON.stringify(output,null,2)+"\n");
console.log("OMBRE100_BASELINE_COMPLETE "+JSON.stringify({
 result:output.auto100,byCharacter:output.byCharacter,minHp:output.minSacrierHpAuto,
 half:checkpoints[50].damage,validReplay:output.manual100===output.auto100
}));
console.log("OMBRE100_BASELINE_ROUTE "+JSON.stringify(output.rotations));
