import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {TEAM_FIFTY_AUDITED,chooseTeamFiftyPlan,teamFiftyDiagnostic} from "../src/team-audited-fifty-plan.js";
import {combatReportText} from "../src/team-combat-log.js";
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
 assert.equal(chooseTeamFiftyPlan(references(t100),t100,strategy)?.enabled,true,
  "First 50 turns of 100-round team session must reuse tested rotation");
 const targetShort=targetFor(0,40);
 assert.equal(chooseTeamFiftyPlan(references(targetShort),targetShort,strategy),null);
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


test("User's 49-turn reference matches Sram distance 3 and Sacrier distance 1; AUTOMATIC 100-tour plan plays the improved 50-turn rotation", {timeout:300000},()=>{
 const target=targetFor(0,100);
 const contexts=references(target,b=>{if(b.classId==="sram")b.distance=3;});
 const plan=chooseTeamFiftyPlan(contexts,target,strategy);
 assert.equal(plan?.enabled,true,"Sram at distance 3 must use the audited legal rotation");
 let auto=null;
 for(let t=1;t<=50;t++){
  auto=optimizeTeamTurn(contexts,target,()=>{},auto,strategy);
  assert.equal(auto.turns.length,t);
  assert.equal(auto.session.teamFiftyPlan?.enabled,true,"Plan deactivated at T"+t);
  for(const actor of auto.turns.at(-1).actors){
   const cls=contexts.find(c=>c.build.id===actor.id).settings.classId;
   assert.deepEqual(actor.actions.map(a=>a.name),TEAM_FIFTY_AUDITED[cls][t-1],
    "Wrong rotation for "+cls+" T"+t);
  }
 }
 assert.equal(R(auto.theoretical),560130.7);
 assert.equal(auto.session.teamFiftyRejection,null);
 assert.match(combatReportText(auto),/Rotation optimisée 50 tours : ACTIVE/);
 console.log("USER_REAL_BUILD_FIFTY "+JSON.stringify({
  sramDistance:3,sacriDistance:1,turns:50,damage:R(auto.theoretical),
  baselineUserLog:547656.7,difference:R(auto.theoretical-547656.7)
 }));
});

test("Sram distances 1 to 3 were audited; Sacrier at distance 2 is incompatible with melee spells",()=>{
 const target=targetFor(0,100);
 for(const distance of [1,2,3]){
  const team=references(target,b=>{if(b.classId==="sram")b.distance=distance;});
  assert.ok(chooseTeamFiftyPlan(team,target,strategy),
   "Sram distance "+distance+" was verified through the manual engine");
  assert.equal(teamFiftyDiagnostic(team,target,strategy),null);
 }
 const sacri2=references(target,b=>{if(b.classId==="sacrieur")b.distance=2;});
 assert.equal(chooseTeamFiftyPlan(sacri2,target,strategy),null);
 assert.match(teamFiftyDiagnostic(sacri2,target,strategy),/distance 2/);
 const modifiedStats=references(target,b=>{
  if(b.classId==="sram")b.stats={...b.stats,agility:b.stats.agility+10};
 });
 assert.equal(chooseTeamFiftyPlan(modifiedStats,target,strategy),null);
 assert.match(teamFiftyDiagnostic(modifiedStats,target,strategy),/caractéristiques/);
});


test("Unused variants changed for Sacrier/Karuta/Matryoshka do not reject the 50-turn team champion", {timeout:300000},()=>{
 const target=targetFor(0,100);
 const changed=[];
 const contexts=references(target,build=>{
  const required=new Set(TEAM_FIFTY_AUDITED[build.classId]);
  // The full optimized sequence, not just the opening, defines requirements.
  const used=new Set(TEAM_FIFTY_AUDITED[build.classId].flat());
  let edits=0;
  for(const [i,pair] of CLASSES[build.classId].pairs.entries()){
   if(pair.some(n=>used.has(n)))continue;
   const alternate=pair.find(n=>n!==build.variants[i]);
   if(!alternate)continue;
   const prior=build.variants[i];
   build.variants[i]=alternate;
   changed.push({classId:build.classId,index:i,from:prior,to:alternate});
   if(++edits>=3)break;
  }
  assert.ok(edits>=1,"Need at least one irrelevant variant pair in "+build.classId);
 });
 assert.ok(changed.some(x=>x.classId==="sacrieur"));
 assert.ok(chooseTeamFiftyPlan(contexts,target,strategy),
  "Unrelated variants must not reject an otherwise matching 50-round plan");
 assert.equal(teamFiftyDiagnostic(contexts,target,strategy),null);
 let previous=null;
 for(let t=1;t<=50;t++){
  previous=optimizeTeamTurn(contexts,target,()=>{},previous,strategy);
  assert.equal(previous.session.teamFiftyPlan?.enabled,true,"T"+t+" blocked");
  for(const a of previous.turns.at(-1).actors){
   const cls=contexts.find(c=>c.build.id===a.id).settings.classId;
   assert.deepEqual(a.actions.map(x=>x.name),TEAM_FIFTY_AUDITED[cls][t-1],
    cls+" T"+t+" differed with alternative unused variants");
  }
 }
 assert.equal(R(previous.theoretical),560130.7);
 assert.match(combatReportText(previous),/Rotation optimisée 50 tours : ACTIVE/);
 console.log("USER_DIFFERENT_UNUSED_VARIANTS_OK "+JSON.stringify({
  changed,damage:R(previous.theoretical),turns:previous.turns.length
 }));
});

test("A required variant still blocks safely with the precise missing spell, not a vague mismatch",()=>{
 const target=targetFor(0,100);
 const variants=["Pacte de Sang","Carnage","Furie","Désolation","Assaut"];
 for(const forbidden of variants){
  const team=references(target,build=>{
   if(build.classId!=="sacrieur")return;
   const group=CLASSES.sacrieur.pairs.findIndex(pair=>pair.includes(forbidden));
   assert.ok(group>=0);
   build.variants[group]=CLASSES.sacrieur.pairs[group].find(name=>name!==forbidden);
  });
  const message=teamFiftyDiagnostic(team,target,strategy);
  assert.ok(message?.includes(forbidden),"Expected precise reason for "+forbidden+"; got "+message);
  assert.equal(chooseTeamFiftyPlan(team,target,strategy),null);
  const fallback=optimizeTeamTurn(team,target,()=>{},null,strategy);
  assert.equal(fallback.session.teamFiftyPlan,null);
  assert.match(combatReportText(fallback),new RegExp(forbidden));
 }
});
