import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild,CLASSES} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {planKarutaKittenMaintenance} from "../src/team-sequential.js";
import {chooseTeamTenOpening} from "../src/team-audited-ten-plan.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {initialState,castSpell,endTurn} from "../src/engine.js";

const target=(res=0,crit=true,rounds=100)=>cleanTeamTarget({
 hp:1e12,turns:rounds,criticals:crit,
 resistances:{Air:res,Terre:res,Feu:res,Eau:res,Neutre:res}
});
const karuta=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="ecaflip-karuta-eau"));
const team=t=>INITIAL_BUILDS.map(b=>createTeamContext(normalizeBuild(b),t));
const names=x=>x?.actions?.map(a=>a.name);
function entry(ctx,state){
 return {ctx,state,currentPA:state.pa};
}
test("Outdated 10-turn team template cannot override persistent kittens in a 100-turn team",()=>{
 const t=target();
 const contexts=team(t);
 const choice=chooseTeamTenOpening(contexts,t,
  {mode:"long",horizon:100,minHpPercent:50},
  playSequentialTeam);
 assert.equal(choice,null,"A 10T historical preset must not prevent 100T kitten buffs");
});
test("Karuta: altered resistances and criticals still offer a summon in team auto fallback",()=>{
 for(const [res,critical] of [[20,true],[0,false],[45,false]]){
  const t=target(res,critical),ctx=createTeamContext(karuta,t);
  const state=initialState(ctx.settings);
  const opening=planKarutaKittenMaintenance(entry(ctx,state));
  assert.ok(opening,"No kitten with res "+res+" crit "+critical);
  assert.equal(opening.actions[0].id,
   ctx.spells.find(s=>s.name==="Griffe Invocatrice").id);
  assert.match(opening.label,/Chatons/);
  let result=playSequentialTeam([ctx],t,()=>{},{oneRound:true,
   manualOverrides:{[ctx.build.id]:opening.actions.map(a=>a.id)}});
  assert.equal(result.turns[0].actors[0].actions[0].name,"Griffe Invocatrice");
  assert.equal(result.session.actors[0].state.buffs.find(
   x=>x.key==="Griffe Invocatrice")?.amount,90);
 }
});
test("Karuta: changed Power stat still gets first, second and third kitten in team fallback",()=>{
 const t=target(24,true),changed=structuredClone(karuta);
 changed.stats.power+=40;
 const ctx=createTeamContext(changed,t),griffe=ctx.spells.find(
  s=>s.name==="Griffe Invocatrice");
 let state=initialState(ctx.settings);
 for(let t=1;t<=9;t++){
  const result=planKarutaKittenMaintenance(entry(ctx,state));
  if([1,5,9].includes(t)){
   assert.ok(result,"Missing kitten plan T"+t);
   assert.equal(String(result.actions[0].id),String(griffe.id));
   for(const action of result.actions){
    const sp=ctx.spells.find(s=>String(s.id)===String(action.id));
    state=castSpell(state,sp,ctx.settings);
   }
   assert.equal(state.invocations.filter(x=>x.kind==="Chaton Enragé").length,
    [1,5,9].indexOf(t)+1);
  }else assert.equal(result,null);
  state=endTurn(state,ctx.settings);
 }
 assert.equal(state.buffs.find(b=>b.key==="Griffe Invocatrice").amount,270);
 assert.equal(planKarutaKittenMaintenance(entry(ctx,state)),null);
});
test("Karuta: no illegal summons when other variant equipped or summon slots exhausted",()=>{
 const t=target(15),changed=structuredClone(karuta);
 const slot=CLASSES.ecaflip.pairs.findIndex(pair=>pair.includes("Griffe Invocatrice"));
 assert.ok(slot>=0);
 changed.variants[slot]="Caresse Invocatrice";
 const ctx=createTeamContext(changed,t);
 assert.equal(planKarutaKittenMaintenance(entry(ctx,initialState(ctx.settings))),null);
 const small=structuredClone(karuta);
 small.stats.summons=1;
 const context=createTeamContext(small,t);
 let s=initialState(context.settings);
 const griffe=context.spells.find(x=>x.name==="Griffe Invocatrice");
 s=castSpell(s,griffe,context.settings);
 for(let i=0;i<4;i++)s=endTurn(s,context.settings);
 assert.equal(planKarutaKittenMaintenance(entry(context,s)),null);
});
test("Fast and long TEAM simulation with nonzero enemy resist must summon T1", {timeout:120000},()=>{
 const t=target(20,true),contexts=team(t);
 for(const mode of ["fast","long"]){
  const r=optimizeTeamTurn(contexts,t,()=>{},null,{
   mode,horizon:10,minHpPercent:40
  });
  const actor=r.turns[0].actors.find(a=>a.character==="Karuta");
  assert.ok(actor,"Karuta missing from team");
  assert.equal(actor.actions[0]?.name,"Griffe Invocatrice",
   "Team mode "+mode+" must summon when persistent buff is needed");
  assert.ok(actor.spent<=actor.availablePA);
 }
});
test("30 turns can use kitten setup, 15-turn attack rotation is unaffected",()=>{
 const long=createTeamContext(karuta,target(15,true,30));
 const short=createTeamContext(karuta,target(15,true,15));
 assert.ok(planKarutaKittenMaintenance(entry(long,initialState(long.settings))));
 assert.equal(planKarutaKittenMaintenance(entry(short,initialState(short.settings))),null);
});

test("All THREE characters: real team turn-by-turn with 20% resistance summons on T1 T5 T9", {timeout:180000},()=>{
 const t=target(20,true),contexts=team(t),policy={
  mode:"long",horizon:10,minHpPercent:40
 };
 let previous=null;
 for(let turn=1;turn<=9;turn++){
  previous=optimizeTeamTurn(contexts,t,()=>{},previous,policy);
  assert.equal(previous.turns.length,turn);
  assert.equal(previous.turns[turn-1].actors.length,3);
  const actor=previous.turns.at(-1).actors.find(x=>x.character==="Karuta");
  const kittens=previous.session.actors.find(x=>x.id==="ecaflip-karuta-eau")
   .state.invocations.filter(x=>x.kind==="Chaton Enragé").length;
  const expected=turn<5?1:turn<9?2:3;
  assert.equal(kittens,expected,"Unexpected living kittens T"+turn);
  assert.equal(actor.actions.some(a=>a.name==="Griffe Invocatrice"),
   [1,5,9].includes(turn),"Unexpected Griffe at turn "+turn);
  assert.ok(previous.turns.at(-1).actors.every(a=>a.spent<=a.availablePA));
 }
 // Independently replay the real automatic rotations via manualOverrides.
 let manual=null;
 for(const round of previous.turns){
  const overrides=Object.fromEntries(round.actors.map(a=>{
   const ctx=contexts.find(x=>x.build.id===a.id);
   return [a.id,a.actions.map(action=>{
    const spell=ctx.spells.find(s=>s.name===action.name);
    assert.ok(spell,"Manual replay missing "+action.name);
    return spell.id;
   })];
  }));
  manual=playSequentialTeam(contexts,t,()=>{},{previous:manual,oneRound:true,
   manualOverrides:overrides});
 }
 assert.ok(Math.abs(previous.theoretical-manual.theoretical)<.2);
 assert.equal(manual.session.actors.find(x=>x.id==="ecaflip-karuta-eau").state
  .buffs.find(x=>x.key==="Griffe Invocatrice").amount,270);
});


test("30 consecutive TEAM turns: six kittens with Sram and Sacrier", {timeout:300000},()=>{
 const t=target(20,true,30),contexts=team(t),policy={mode:"long",horizon:10,minHpPercent:50};
 const schedule=[1,5,9,13,17,21];
 let previous=null;
 for(let turn=1;turn<=30;turn++){
  previous=optimizeTeamTurn(contexts,t,()=>{},previous,policy);
  assert.equal(previous.turns.length,turn,"One round per click");
  const actors=previous.turns.at(-1).actors;
  assert.equal(actors.length,3);
  assert.ok(actors.every(a=>a.spent<=a.availablePA));
  const karuta=actors.find(a=>a.character==="Karuta");
  assert.equal(karuta.actions.some(a=>a.name==="Griffe Invocatrice"),
   schedule.includes(turn),"Wrong Griffe timing T"+turn);
  const state=previous.session.actors.find(a=>a.id==="ecaflip-karuta-eau").state;
  const living=state.invocations.filter(x=>x.kind==="Chaton Enragé").length;
  const expected=Math.min(6,Math.floor((turn-1)/4)+1);
  assert.equal(living,expected,"Wrong number of kittens T"+turn);
  assert.equal(state.buffs.find(b=>b.key==="Griffe Invocatrice")?.amount,90*expected,
   "Wrong kitten-linked Power T"+turn);
 }
 assert.equal(previous.finished,true);
});
