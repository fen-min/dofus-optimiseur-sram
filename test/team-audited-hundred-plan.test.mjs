import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn,recalculateTeamCurrentTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {TEAM_FIFTY_AUDITED,chooseTeamFiftyPlan,chooseTeamHundredPlan} from "../src/team-audited-fifty-plan.js";
import {TEAM_HUNDRED_AUDITED,TEAM_HUNDRED_META} from "../src/team-audited-hundred-data.js";
import {combatReportText} from "../src/team-combat-log.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const R=n=>Math.round(Number(n)*10)/10;
const target=turns=>cleanTeamTarget({turns,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const policy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const contexts=(t,mutate=()=>{})=>INITIAL_BUILDS.map(raw=>{
 const b=normalizeBuild(raw);
 if(b.classId==="sacrieur")b.distance=1;
 if(b.classId==="sram")b.distance=3;
 mutate(b);
 return createTeamContext(b,t);
});
const selected=(ctx,spell)=>spell?.isWeapon===true||
 ctx.settings.variants?.[spell.variantGroup]===spell.name;

test("Real chronological team optimizer and independent manual replay agree on ALL 100 audited rounds", {timeout:300000},()=>{
 const t=target(100),team=contexts(t);
 assert.equal(TEAM_HUNDRED_AUDITED.sacrieur.length,100);
 assert.equal(TEAM_HUNDRED_AUDITED.ecaflip.length,100);
 assert.equal(TEAM_HUNDRED_AUDITED.sram.length,100);
 assert.equal(chooseTeamHundredPlan(team,t,policy)?.enabled,true);
 let auto=null,manual=null,minHp=100;
 for(let turn=1;turn<=100;turn++){
  const overrides={};
  for(const c of team){
   const names=TEAM_HUNDRED_AUDITED[c.settings.classId][turn-1];
   overrides[c.build.id]=names.map(name=>{
    const sp=c.spells.find(x=>x.name===name);
    assert.ok(sp,"Missing 100-round spell "+name);
    assert.ok(selected(c,sp),"Unselected variant "+name);
    return String(sp.id);
   });
  }
  manual=playSequentialTeam(team,t,()=>{},{previous:manual,oneRound:true,
   manualOverrides:overrides});
  auto=optimizeTeamTurn(team,t,()=>{},auto,policy);
  assert.equal(auto.turns.length,turn);
  assert.equal(auto.session.teamFiftyPlan?.id,"team-audited-hundred-v1");
  assert.equal(auto.session.teamFiftyPlan?.enabled,true,
   "100-round route disabled unexpectedly at T"+turn);
  assert.equal(auto.theoretical,manual.theoretical,"Automatic vs manual damage at T"+turn);
  for(const actor of auto.turns.at(-1).actors){
   const cls=team.find(c=>c.build.id===actor.id)?.settings.classId;
   assert.ok(cls);
   assert.deepEqual(actor.actions.map(a=>a.name),TEAM_HUNDRED_AUDITED[cls][turn-1],
    "100-round manual route not used for "+cls+" on T"+turn);
   assert.ok(actor.spent<=actor.availablePA+.00001,"AP overflow on T"+turn);
   assert.equal(actor.availablePA,12);
   assert.equal(actor.safetyWarning,undefined);
   if(cls==="sacrieur"){
    const state=auto.session.actors.find(a=>a.id===actor.id).state;
    assert.ok(sacrierHealthAboveFloor(state,50),"Sacrier below 50% at T"+turn);
    minHp=Math.min(minHp,100*state.sacrierHealth.hp/state.sacrierHealth.maxHp);
   }
  }
  const eca=auto.session.actors.find(x=>
   team.find(c=>c.build.id===x.id)?.settings.classId==="ecaflip").state;
  const alive=(eca.invocations||[]).filter(x=>x.kind==="Chaton Enragé").length;
  const power=(eca.buffs||[]).filter(b=>b.key==="Griffe Invocatrice")
   .reduce((sum,b)=>sum+b.amount,0);
  assert.ok(alive<=6,"More than 6 kittens alive T"+turn);
  assert.ok(power<=270,"Power cap +270 exceeded T"+turn);
  assert.equal(power,90*Math.min(alive,3),"Kitten stack mismatch T"+turn);
 }
 assert.equal(auto.finished,true);
 assert.equal(R(auto.theoretical),TEAM_HUNDRED_META.damage);
 assert.equal(R(manual.theoretical),TEAM_HUNDRED_META.damage);
 assert.ok(minHp>=50-1e-6);
 assert.deepEqual(Object.fromEntries(auto.members.map(m=>[m.character,R(m.estimated)])),
  TEAM_HUNDRED_META.perCharacter);
 assert.match(combatReportText(auto),/Rotation optimisée 100 tours : ACTIVE/);
 console.log("OMBRE100_TEAM_AUTO_MANUAL_VERIFIED "+JSON.stringify({
  damage:R(auto.theoretical),minSacrierHp:R(minHp),
  byCharacter:TEAM_HUNDRED_META.perCharacter,
  kittens:"+270 Power cap / six summons",rounds:100
 }));
});

test("Exactly 50 rounds still use the ORIGINAL 50-round champion and its exact 560130.7 score", {timeout:300000},()=>{
 const t=target(50),team=contexts(t);
 assert.equal(chooseTeamHundredPlan(team,t,policy),null);
 assert.equal(chooseTeamFiftyPlan(team,t,policy)?.enabled,true);
 let auto=null;
 for(let round=1;round<=50;round++){
  auto=optimizeTeamTurn(team,t,()=>{},auto,policy);
  assert.equal(auto.session.teamFiftyPlan?.id,"team-audited-fifty-v1");
  for(const actor of auto.turns.at(-1).actors){
   const cls=team.find(c=>c.build.id===actor.id)?.settings.classId;
   assert.deepEqual(actor.actions.map(a=>a.name),TEAM_FIFTY_AUDITED[cls][round-1]);
  }
 }
 assert.equal(R(auto.theoretical),560130.7);
 assert.match(combatReportText(auto),/Rotation optimisée 50 tours : ACTIVE/);
});

test("100-round route requires the exact verified builds, target, minimum HP and every spell actually selected",()=>{
 const t=target(100),valid=contexts(t);
 assert.ok(chooseTeamHundredPlan(valid,t,policy));
 assert.equal(chooseTeamHundredPlan(valid,target(50),policy),null);
 assert.equal(chooseTeamHundredPlan(valid,t,{...policy,minHpPercent:60}),null);
 assert.equal(chooseTeamHundredPlan(valid,t,{...policy,mode:"fast"}),null);
 const changedTarget=cleanTeamTarget({...t,resistances:{...t.resistances,Air:20}});
 assert.equal(chooseTeamHundredPlan(contexts(changedTarget),changedTarget,policy),null);
 assert.equal(chooseTeamHundredPlan(contexts(t,b=>{
  if(b.classId==="sram")b.distance=1;
 }),t,policy),null,"Sram distance 1 has not been 100-round audited");
 assert.ok(chooseTeamFiftyPlan(contexts(t,b=>{
  if(b.classId==="sram")b.distance=1;
 }),t,policy),"Original 50-round route still available");
 const missingRequired=contexts(t,b=>{
  if(b.classId!=="sacrieur")return;
  const group=CLASSES.sacrieur.pairs.findIndex(p=>p.includes("Carnage"));
  b.variants[group]=CLASSES.sacrieur.pairs[group].find(s=>s!=="Carnage");
 });
 assert.equal(chooseTeamHundredPlan(missingRequired,t,policy),null);
 assert.equal(chooseTeamFiftyPlan(missingRequired,t,policy),null);
 const altered=contexts(t,b=>{
  if(b.classId==="ecaflip")b.stats={...b.stats,chance:b.stats.chance+1};
 });
 assert.equal(chooseTeamHundredPlan(altered,t,policy),null);
});

test("Unrelated equipped variants never reject the 100-round route",()=>{
 const t=target(100),edits=[];
 const team=contexts(t,b=>{
  const needed=new Set(TEAM_HUNDRED_AUDITED[b.classId].flat());
  for(const [i,pair] of CLASSES[b.classId].pairs.entries()){
   if(pair.some(name=>needed.has(name)))continue;
   const alternate=pair.find(name=>name!==b.variants[i]);
   if(!alternate)continue;
   edits.push([b.classId,i]);
   b.variants[i]=alternate;break;
  }
 });
 assert.equal(edits.length,3);
 assert.equal(chooseTeamHundredPlan(team,t,policy)?.enabled,true);
});

test("Recalculate PA at T51 replaces the current round, preserving T1-T50 and safely switching to dynamic mode", {timeout:300000},()=>{
 const t=target(100),team=contexts(t);
 let auto=null;
 for(let i=1;i<=51;i++)auto=optimizeTeamTurn(team,t,()=>{},auto,policy);
 const original=structuredClone(auto.turns.slice(0,50));
 assert.equal(auto.session.teamFiftyPlan?.enabled,true);
 const ecaId=team.find(c=>c.settings.classId==="ecaflip").build.id;
 const changed=recalculateTeamCurrentTurn(team,t,()=>{},auto,policy,{[ecaId]:11});
 assert.equal(changed.turns.length,51);
 assert.deepEqual(changed.turns.slice(0,50),original);
 assert.equal(changed.turns[50].actors.find(a=>a.id===ecaId).availablePA,11);
 assert.equal(changed.session.teamFiftyPlan?.enabled,false);
 const subsequent=optimizeTeamTurn(team,t,()=>{},changed,policy);
 assert.equal(subsequent.turns.length,52);
 assert.equal(subsequent.session.teamFiftyPlan?.enabled,false);
 assert.deepEqual(subsequent.turns.slice(0,50),original);
});
