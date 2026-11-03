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
