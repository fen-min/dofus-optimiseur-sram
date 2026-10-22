import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeam,cleanTeamMemberOptions} from "../src/team-core.js";
import {initialState,castSpell,endTurn,eligible,refreshExpiredBuffs,cleanSettings} from "../src/engine.js";
const sacrier=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");

test("Sacrier Pacte de Sang refreshes precisely when the three-turn power buff expires",()=>{
 const target={turns:10};
 const ctx=createTeamContext(sacrier,target,{
  support:"Pacte de Sang",forceOpeningBuff:true,refreshTimedBuffs:true
 });
 const result=optimizeTeam([ctx],target);
 const casts=result.turns.flatMap(t=>t.actors[0].actions
  .filter(a=>a.name==="Pacte de Sang").map(a=>({turn:t.number,refreshed:a.autoRefreshed})));
 assert.deepEqual(casts,[
  {turn:1,refreshed:false},{turn:4,refreshed:true},
  {turn:7,refreshed:true},{turn:10,refreshed:true}
 ]);
 assert.ok(result.turns.every(t=>t.actors[0].spent<=ctx.settings.ap));
 assert.equal(result.members[0].refreshTimedBuffs,undefined); // not exposed in summary
});

test("Buff maintenance off keeps the previous optimizer behavior",()=>{
 const target={turns:10};
 const ctx=createTeamContext(sacrier,target,{
  support:"Pacte de Sang",forceOpeningBuff:true,refreshTimedBuffs:false
 });
 assert.equal(ctx.settings.refreshTimedBuffs,false);
 const result=optimizeTeam([ctx],target);
 const casts=result.turns.flatMap(t=>t.actors[0].actions.filter(a=>a.name==="Pacte de Sang"));
 assert.equal(casts.length,1);
 assert.ok(casts.every(a=>!a.autoRefreshed));
});

test("Mutilation with ten-turn duration is not recast prematurely",()=>{
 const target={turns:10};
 const ctx=createTeamContext(sacrier,target,{support:"Mutilation",forceOpeningBuff:true});
 const result=optimizeTeam([ctx],target);
 const casts=result.turns.flatMap(t=>t.actors[0].actions.filter(a=>a.name==="Mutilation"));
 assert.equal(casts.length,1);
 assert.equal(casts[0].autoRefreshed,false);
});

test("Cooldown and PA constraints prevent illegal refresh; disabled refresh does nothing",()=>{
 const target={turns:6};
 const ctx=createTeamContext(sacrier,target,{support:"Pacte de Sang",forceOpeningBuff:true});
 const spell=ctx.spells.find(x=>x.name==="Pacte de Sang");
 const c=cleanSettings(ctx.settings);
 const first=castSpell(initialState(c),spell,c);
 const at2=endTurn(first,c);
 assert.equal(refreshExpiredBuffs(at2,[spell],c).actions.length,0);
 const at3=endTurn(at2,c);
 assert.equal(refreshExpiredBuffs(at3,[spell],c).actions.length,0);
 const at4=endTurn(at3,c);
 const reapplied=refreshExpiredBuffs(at4,[spell],c);
 assert.equal(reapplied.actions[0].name,"Pacte de Sang");
 assert.match(reapplied.actions[0].notes.join(" "),/Relance automatique/);
 const noPA={...at4,pa:1};
 assert.equal(refreshExpiredBuffs(noPA,[spell],c).actions.length,0);
 assert.equal(refreshExpiredBuffs(at4,[spell],{...c,refreshTimedBuffs:false}),at4);
 assert.equal(eligible(spell,reapplied,c),false);
});

test("Member options maintain buffs by default without modifying original build",()=>{
 const options=cleanTeamMemberOptions(sacrier,{});
 assert.equal(options.refreshTimedBuffs,true);
 assert.equal(cleanTeamMemberOptions(sacrier,{refreshTimedBuffs:false}).refreshTimedBuffs,false);
 const ctx=createTeamContext(sacrier,{turns:3});
 assert.equal(ctx.settings.refreshTimedBuffs,true);
 assert.equal(sacrier.refreshTimedBuffs,undefined);
});

test("The single-character optimizer still defaults to disabled buff maintenance",()=>{
 const c=cleanSettings({ap:12,turns:3});
 assert.equal(c.refreshTimedBuffs,false);
});
