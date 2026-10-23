import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {createTeamContext as createHealthAwareContext,optimizeTeamMember,openingBuffCandidates} from "../src/team-core.js";
// Preserve the pre-health-regression fixtures explicitly: these tests check
// historical beam-search buff ordering with HP simulation disabled.
// New Sacrieur PV/Souffrance tests live in sacrier-health-damage.test.mjs.
const createTeamContext=(...args)=>{
 const ctx=createHealthAwareContext(...args);
 return {...ctx,settings:{...ctx.settings,sacrierHealthSimulation:false}};
};

import {initialState,castSpell,endTurn,eligible,refreshExpiredBuffs,cleanSettings,optimize} from "../src/engine.js";

const sacrier=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
function withPact(){
 const i=SACRIER_VARIANTS.findIndex(pair=>pair.includes("Pacte de Sang"));
 return {...sacrier,variants:sacrier.variants.map((s,j)=>j===i?"Pacte de Sang":s)};
}
test("automatic strategy chooses when to open with the buff, without any checkbox",()=>{
 const ctx=createTeamContext(withPact(),{turns:5});
 assert.equal(ctx.forceOpeningSpell,undefined);
 const choice=optimizeTeamMember(ctx);
 const baseline=optimize(ctx.settings,ctx.spells);
 assert.ok(choice.result.total>=baseline.total);
 assert.equal(choice.result.turns[0].actions[0].name,"Pacte de Sang");
 assert.ok(choice.result.turns[3].actions.some(a=>a.name==="Pacte de Sang"));
 assert.ok(choice.strategiesTested>=2);
});
test("expired buff refresh preserves cooldown and PA legality",()=>{
 const ctx=createTeamContext(withPact(),{turns:6});
 const spell=ctx.spells.find(s=>s.name==="Pacte de Sang");
 const c=cleanSettings({...ctx.settings,refreshTimedBuffs:true});
 let state=castSpell(initialState(c),spell,c);
 state=endTurn(state,c);
 assert.equal(refreshExpiredBuffs(state,[spell],c).actions.length,0);
 state=endTurn(state,c);
 assert.equal(refreshExpiredBuffs(state,[spell],c).actions.length,0);
 state=endTurn(state,c);
 const restored=refreshExpiredBuffs(state,[spell],c);
 assert.equal(restored.actions[0].name,"Pacte de Sang");
 assert.match(restored.actions[0].notes.join(" "),/Relance automatique/);
 assert.equal(eligible(spell,restored,c),false);
 assert.equal(refreshExpiredBuffs({...state,pa:1},[spell],c).actions.length,0);
});
test("no refresh is forced by the solo optimizer without the team policy",()=>{
 const ctx=createTeamContext(withPact(),{turns:6});
 const c=cleanSettings(ctx.settings);
 assert.equal(c.refreshTimedBuffs,false);
 const spell=ctx.spells.find(s=>s.name==="Pacte de Sang");
 let state=castSpell(initialState(c),spell,c);
 for(let i=0;i<3;i++)state=endTurn(state,c);
 assert.equal(refreshExpiredBuffs(state,[spell],c),state);
});
test("no turn-one buff candidate outside the saved spell variants",()=>{
 const ctx=createTeamContext(sacrier,{turns:3});
 const candidates=openingBuffCandidates(ctx);
 assert.ok(!candidates.some(s=>s.name==="Pacte de Sang"));
 assert.ok(candidates.every(s=>s.nonDirect&&(s.status.buff.untilRemoved===true||s.status.buff.duration>0)));
});
