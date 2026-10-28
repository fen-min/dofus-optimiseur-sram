import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn,cleanTeamTarget} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {chooseTeamTenOpening,teamTenCurrentPlan,TEAM_TEN_AUDITED} from "../src/team-audited-ten-plan.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const makeContexts=()=>INITIAL_BUILDS.map(original=>{
 const build=normalizeBuild(original);
 // The user-provided combat log can cast melee weapon Manthache and
 // 1-1 Carnage; saved player distance is therefore 1 for both.
 if(["sacrieur","sram"].includes(build.classId))build.distance=1;
 return createTeamContext(build,target);
});
const strategy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const R=n=>Math.round(n*10)/10;

test("Long mode selects validated 10-round team DPS when it wins on current builds",()=>{
 const ctx=makeContexts();
 const plan=chooseTeamTenOpening(ctx,target,strategy,playSequentialTeam);
 assert.ok(plan, "Verified team opening should be selected");
 assert.equal(plan.id,"audited-team-ten-pacte-v1");
 assert.equal(plan.baseline,101690);
 assert.equal(plan.projected,107212.1);
 assert.equal(plan.projectedGain,5522.1);
});

test("Automatic 10-round team replay matches manual audited damage and Pacte refreshes", {timeout:200000},()=>{
 const contexts=makeContexts();
 let previous=null;
 for(let i=0;i<10;i++){
  previous=optimizeTeamTurn(contexts,target,()=>{},previous,strategy);
  assert.equal(previous.turns.length,i+1);
  const t=previous.turns.at(-1);
  assert.equal(t.actors.length,3);
  for(const actor of t.actors){
   const cls=contexts.find(c=>c.build.id===actor.id).settings.classId;
   assert.deepEqual(actor.actions.map(a=>a.name),TEAM_TEN_AUDITED[cls][i],
    "Team DPS route did not win at T"+(i+1)+" for "+cls);
   assert.ok(actor.spent<=actor.availablePA+.01);
   if(cls==="sacrieur")assert.ok(
    actor.health.hp>=actor.health.maxHp*.5,"Unsafe Sacrier T"+(i+1));
  }
  assert.ok(previous.session.teamTenPlan.enabled);
 }
 assert.equal(R(previous.theoretical),107212.1);
 assert.equal(previous.session.teamTenPlan.projectedGain,5522.1);
 console.log("TEAM_AUDITED_AUTOMATIC_TEN "+JSON.stringify({
  total:previous.theoretical,baseline:previous.session.teamTenPlan.baseline,
  gain:previous.session.teamTenPlan.projectedGain,
  actors:Object.fromEntries(previous.members.map(m=>[m.character,m.estimated]))
 }));
});

test("After T10 choose fresh dynamic rotation, not a forced ten-turn loop",{timeout:90000},()=>{
 const ctx=makeContexts();
 let previous=null;
 for(let i=0;i<11;i++)previous=optimizeTeamTurn(ctx,target,()=>{},previous,strategy);
 assert.equal(previous.turns.length,11);
 assert.ok(previous.turns[10].actors.every(a=>a.spent<=a.availablePA+.01));
 assert.ok(previous.turns[10].actors.every(a=>!a.log.plan.includes("DPS équipe vérifié")));
 assert.ok(previous.theoretical>107212.1);
});

test("Replaying with different current build or HP/strategy settings preserves dynamic fallback",()=>{
 const ctx=makeContexts();
 assert.equal(chooseTeamTenOpening(ctx,target,{...strategy,mode:"fast"},playSequentialTeam),null);
 assert.equal(chooseTeamTenOpening(ctx,target,{...strategy,minHpPercent:70},playSequentialTeam),null);
 assert.equal(chooseTeamTenOpening(ctx.slice(0,2),target,strategy,playSequentialTeam),null);
 const ranged=makeContexts();
 ranged.find(x=>x.settings.classId==="sacrieur").settings.distance=2;
 assert.equal(chooseTeamTenOpening(ranged,target,strategy,playSequentialTeam),null,
  "Carnage at range 2 should reject the team plan");
 const changed=makeContexts();
 const p=chooseTeamTenOpening(changed,target,strategy,playSequentialTeam);
 const entry={ctx:changed[0],state:null,currentPA:14};
 assert.equal(teamTenCurrentPlan(entry,p,strategy),null);
});

test("Manual mode remains independent of team-optimized actions",()=>{
 const ctx=makeContexts(),sram=ctx.find(x=>x.settings.classId==="sram");
 const spell=sram.spells.find(s=>s.name==="Arnaque");
 const result=playSequentialTeam(ctx,target,()=>{},{oneRound:true,
  manualOverrides:{[sram.build.id]:[spell.id]}});
 const actor=result.turns[0].actors.find(x=>x.id===sram.build.id);
 assert.deepEqual(actor.actions.map(x=>x.name),["Arnaque"]);
 assert.equal(result.session.teamTenPlan,null);
});
