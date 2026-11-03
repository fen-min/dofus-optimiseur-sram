import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {cleanTeamTarget,createTeamContext,optimizeTeamTurn,recalculateTeamCurrentTurn} from "../src/team-core.js";
import {TEAM_FIFTY_AUDITED} from "../src/team-audited-fifty-plan.js";

const target=turns=>cleanTeamTarget({turns,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const context=(t,count=3)=>(count===2?
 [INITIAL_BUILDS[0],INITIAL_BUILDS[2]]:INITIAL_BUILDS.slice(0,count)).map(b=>{
 const build=normalizeBuild(b);
 if(build.classId==="sacrieur"||build.classId==="sram")build.distance=1;
 return createTeamContext(build,t);
});
const fast={mode:"fast",horizon:5,minHpPercent:50};
const long={mode:"long",horizon:100,minHpPercent:50,effort:"deep"};
const run=(team,t,policy,rounds)=>{
 let previous=null;
 for(let i=0;i<rounds;i++)previous=optimizeTeamTurn(team,t,()=>{},previous,policy);
 return previous;
};

test("Recalculer le tour en cours: PA can change without restarting or mutating previous rounds", {timeout:300000},()=>{
 const t=target(6),team=context(t,2);
 const original=run(team,t,fast,3);
 const before=structuredClone(original);
 assert.equal(original.session.beforeCurrentRound.turn,3);
 const eca=team.find(c=>c.settings.classId==="ecaflip").build.id;
 const newer=recalculateTeamCurrentTurn(team,t,()=>{},original,fast,{[eca]:9});
 assert.equal(newer.turns.length,3);
 assert.deepEqual(newer.turns.slice(0,2),original.turns.slice(0,2),
  "T1 and T2 must not be touched");
 assert.equal(newer.turns.at(-1).actors.find(a=>a.id===eca).availablePA,9);
 assert.equal(newer.session.actors.find(a=>a.id===eca).state.turn,4);
 assert.equal(newer.session.beforeCurrentRound.turn,3);
 assert.deepEqual(original,before,"Recalculate cannot alter stored original");
 const next=optimizeTeamTurn(team,t,()=>{},newer,fast);
 assert.equal(next.turns.length,4,"Continue on T4 rather than restart");
 assert.deepEqual(next.turns.slice(0,2),original.turns.slice(0,2));
});

test("Repeated recalculation starts from the same pre-turn checkpoint, never double-counts damage", {timeout:300000},()=>{
 const t=target(5),team=context(t,2),original=run(team,t,fast,2);
 const eca=team.find(c=>c.settings.classId==="ecaflip").build.id;
 const originalPA=original.turns.at(-1).actors.find(a=>a.id===eca).availablePA;
 const changed=recalculateTeamCurrentTurn(team,t,()=>{},original,fast,{[eca]:8});
 const restored=recalculateTeamCurrentTurn(team,t,()=>{},changed,fast,{[eca]:originalPA});
 assert.equal(restored.turns.length,2);
 assert.deepEqual(restored.turns,original.turns);
 assert.equal(restored.theoretical,original.theoretical);
 assert.deepEqual(restored.session.actors,original.session.actors);
});

test("Latest round can be recalculated even when the combat already ended", {timeout:300000},()=>{
 const t=target(2),team=context(t,1);
 const completed=run(team,t,fast,2);
 assert.equal(completed.finished,true);
 const id=team[0].build.id;
 const updated=recalculateTeamCurrentTurn(team,t,()=>{},completed,fast,{[id]:10});
 assert.equal(updated.turns.length,2);
 assert.equal(updated.finished,true);
 assert.equal(updated.turns.at(-1).actors[0].availablePA,10);
 assert.deepEqual(updated.turns[0],completed.turns[0]);
});

test("The 100-tour team mode uses the manually optimized 50-turn opening; changing PA safely drops it", {timeout:300000},()=>{
 const t=target(100),team=context(t,3);
 const original=optimizeTeamTurn(team,t,()=>{},null,long);
 assert.equal(original.session.teamFiftyPlan?.enabled,true);
 for(const actor of original.turns[0].actors){
  const cls=team.find(c=>c.build.id===actor.id).settings.classId;
  assert.deepEqual(actor.actions.map(a=>a.name),TEAM_FIFTY_AUDITED[cls][0]);
 }
 const eca=team.find(c=>c.settings.classId==="ecaflip").build.id;
 const changed=recalculateTeamCurrentTurn(team,t,()=>{},original,long,{[eca]:11});
 assert.equal(changed.turns.length,1);
 assert.equal(changed.turns[0].actors.find(a=>a.id===eca).availablePA,11);
 assert.equal(changed.session.teamFiftyPlan?.enabled,false);
 const back=recalculateTeamCurrentTurn(team,t,()=>{},changed,long,{[eca]:12});
 assert.equal(back.session.teamFiftyPlan?.enabled,true,
  "Replaying from original checkpoint can restore the matching champion");
 assert.equal(back.theoretical,original.theoretical);
 assert.deepEqual(back.turns,original.turns);
 const next=optimizeTeamTurn(team,t,()=>{},changed,long);
 assert.equal(next.turns.length,2);
 assert.equal(next.session.teamFiftyPlan.enabled,false);
});

test("Missing checkpoint and changed target fail without overwriting existing results",()=>{
 const t=target(3),team=context(t,2);
 const original=optimizeTeamTurn(team,t,()=>{},null,fast);
 assert.throws(()=>recalculateTeamCurrentTurn(team,t,()=>{},null,fast),/Aucun tour/);
 const noCheckpoint=structuredClone(original);
 delete noCheckpoint.session.beforeCurrentRound;
 assert.throws(()=>recalculateTeamCurrentTurn(team,t,()=>{},noCheckpoint,fast),/Aucun tour/);
 assert.throws(()=>recalculateTeamCurrentTurn(team,target(4),()=>{},original,fast),/cible/i);
 assert.equal(original.turns.length,1);
});


test("100-tour session reproduces all 50 optimized rounds before returning to dynamic mode", {timeout:300000},()=>{
 const t=target(100),team=context(t,3);
 let previous=null;
 for(let turn=1;turn<=50;turn++){
  previous=optimizeTeamTurn(team,t,()=>{},previous,long);
  assert.equal(previous.turns.length,turn);
  assert.equal(previous.session.teamFiftyPlan?.enabled,true,
   "Missing audited 50-round route T"+turn);
 }
 assert.equal(previous.theoretical,560130.7,
  "100-turn mode must match full optimized 50-turn damage");
 const fifty=structuredClone(previous.turns);
 const next=optimizeTeamTurn(team,t,()=>{},previous,long);
 assert.equal(next.turns.length,51);
 assert.equal(next.session.teamFiftyPlan?.enabled,false);
 assert.deepEqual(next.turns.slice(0,50),fifty,
  "T51 dynamic fallback must not rewrite any previous round");
});
