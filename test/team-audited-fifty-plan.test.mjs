import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {TEAM_FIFTY_AUDITED,chooseTeamFiftyPlan} from "../src/team-audited-fifty-plan.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const targetFor=(res=0,turns=50)=>cleanTeamTarget({
 turns,hp:1_000_000_000_000,criticals:true,
 resistances:{Air:res,Terre:res,Feu:res,Eau:res,Neutre:res}
});
const references=(target,change=()=>{})=>INITIAL_BUILDS.map(build=>{
 const b=normalizeBuild(build);
 if(["sram","sacrieur"].includes(b.classId))b.distance=1;
 change(b);
 return createTeamContext(b,target);
});
const strategy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const R=n=>Math.round(Number(n)*10)/10;

test("Automatic optimizer adopts fully verified 50-turn manual champion and produces exactly 560130.7 DPS total", {timeout:300000},()=>{
 const target=targetFor(),contexts=references(target);
 assert.equal(chooseTeamFiftyPlan(contexts,target,strategy)?.enabled,true);
 let auto=null,manual=null;
 for(let round=1;round<=50;round++){
  const overrides={};
  for(const c of contexts){
   overrides[c.build.id]=TEAM_FIFTY_AUDITED[c.settings.classId][round-1].map(name=>{
    const spell=c.spells.find(s=>s.name===name);
    assert.ok(spell,"Spell not equipped: "+name);
    return String(spell.id);
   });
  }
  manual=playSequentialTeam(contexts,target,()=>{},{previous:manual,oneRound:true,
   manualOverrides:overrides});
  auto=optimizeTeamTurn(contexts,target,()=>{},auto,strategy);
  assert.equal(auto.turns.length,round);
  assert.equal(auto.session.teamFiftyPlan?.enabled,true,"Auto plan disabled at T"+round);
  for(const actor of auto.turns.at(-1).actors){
   const cls=contexts.find(c=>c.build.id===actor.id).settings.classId;
   assert.deepEqual(actor.actions.map(a=>a.name),TEAM_FIFTY_AUDITED[cls][round-1],
    "Auto/manual disagreement T"+round+" class "+cls);
   assert.ok(actor.spent<=actor.availablePA+1e-5,"PA overflow T"+round);
   if(cls==="sacrieur"){
    const state=auto.session.actors.find(x=>x.id===actor.id).state;
    assert.ok(sacrierHealthAboveFloor(state,50),"Unsafe Sacrier T"+round);
   }
  }
  assert.equal(auto.theoretical,manual.theoretical,"Total changed T"+round);
 }
 assert.equal(R(auto.theoretical),560130.7);
 assert.equal(auto.finished,true);
 assert.deepEqual(Object.fromEntries(auto.members.map(m=>[m.character,R(m.estimated)])),{
  "Mon Sacrieur":147989.1,"Karuta":252514.1,"Matryoshka":159627.5
 });
 console.log("TEAM_AUTO_50_MANUAL_PARITY "+JSON.stringify({
  damage:auto.theoretical,turns:50,actors:auto.members.map(x=>({name:x.character,damage:x.estimated}))
 }));
});

test("One changed turn of PA disables the champion and reverts to dynamic team optimization",()=>{
 const target=targetFor(),contexts=references(target);
 const first=optimizeTeamTurn(contexts,target,()=>{},null,strategy);
 assert.equal(first.session.teamFiftyPlan?.enabled,true);
 const ecaId=contexts.find(c=>c.settings.classId==="ecaflip").build.id;
 const second=optimizeTeamTurn(contexts,target,()=>{},first,strategy,{[ecaId]:11});
 assert.equal(second.session.teamFiftyPlan?.enabled,false);
 assert.equal(second.turns.length,2);
 const third=optimizeTeamTurn(contexts,target,()=>{},second,strategy);
 assert.equal(third.session.teamFiftyPlan?.enabled,false);
 assert.equal(third.turns.length,3);
});

test("Benchmark not forced onto different HP floors, target conditions, builds or turns",()=>{
 const t=targetFor(),contexts=references(t);
 assert.equal(chooseTeamFiftyPlan(contexts,t,{...strategy,mode:"fast"}),null);
 assert.equal(chooseTeamFiftyPlan(contexts,t,{...strategy,minHpPercent:60}),null);
 const t100=targetFor(0,100);
 assert.equal(chooseTeamFiftyPlan(references(t100),t100,strategy),null);
 const t20=targetFor(20,50);
 assert.equal(chooseTeamFiftyPlan(references(t20),t20,strategy),null);
 assert.equal(chooseTeamFiftyPlan(references(t,b=>{if(b.classId==="sacrieur")b.distance=2;}),t,strategy),null);
 assert.equal(chooseTeamFiftyPlan(references(t,b=>{if(b.classId==="ecaflip")b.stats={...b.stats,chance:b.stats.chance+1};}),t,strategy),null);
 const modified=contexts.map(c=>c.settings.classId==="sacrieur"?
  {...c,settings:{...c.settings,sacrierStartingHpPercent:60}}:c);
 assert.equal(chooseTeamFiftyPlan(modified,t,strategy),null);
 const fallback=optimizeTeamTurn(references(t20),t20,()=>{},null,strategy);
 assert.equal(fallback.session.teamFiftyPlan,null);
});

test("Pure manual team mode never activates the automatic 50-turn preset",()=>{
 const t=targetFor(),contexts=references(t);
 const noSpells=Object.fromEntries(contexts.map(c=>[c.build.id,[]]));
 const result=playSequentialTeam(contexts,t,()=>{},{oneRound:true,manualOverrides:noSpells});
 assert.equal(result.session.teamFiftyPlan,null);
});
