import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {optimize,eligible,initialState,castSpell,endTurn,cleanSettings} from "../src/engine.js";
import {createTeamContext as createHealthAwareContext,optimizeTeamMember,improveTeamBuffOrder,assembleTeamResult} from "../src/team-core.js";
// Preserve the pre-health-regression fixtures explicitly: these tests check
// historical beam-search buff ordering with HP simulation disabled.
// New Sacrieur PV/Souffrance tests live in sacrier-health-damage.test.mjs.
const createTeamContext=(build,...args)=>{
 // Historical golden scores are intentionally computed using the legacy
 // DofusBook rows, not the active-build stats introduced in v3.3.
 const fixture=build.classId==="sacrieur"?{...build,stats:{initiative:build.stats?.initiative}}:build;
 const ctx=createHealthAwareContext(fixture,...args);
 return {...ctx,settings:{...ctx.settings,sacrierHealthSimulation:false}};
};


const sacri=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const sram=INITIAL_BUILDS.find(b=>b.classId==="sram");
function pactBuild(){
 const i=SACRIER_VARIANTS.findIndex(p=>p.includes("Pacte de Sang"));
 return {...sacri,variants:sacri.variants.map((n,j)=>i===j?"Pacte de Sang":n)};
}
function names(turn){return turn.actions.map(a=>a.name);}
test("Pacte de Sang is reordered before T2 attacks without changing the spell selection",()=>{
 const ctx=createTeamContext(pactBuild(),{turns:10,hp:100000,criticals:false});
 const raw=optimize({...ctx.settings,refreshTimedBuffs:true},ctx.spells);
 assert.equal(names(raw.turns[1]).at(-1),"Pacte de Sang");
 const fixed=improveTeamBuffOrder(raw,ctx);
 assert.equal(names(fixed.turns[1])[0],"Pacte de Sang");
 assert.deepEqual(names(fixed.turns[1]).slice(1),names(raw.turns[1]).slice(0,-1));
 assert.equal(fixed.turns[1].spent,raw.turns[1].spent);
 assert.ok(fixed.turns[1].total>raw.turns[1].total);
 assert.ok(Math.abs(fixed.turns[1].total-2471)<0.2);
 assert.ok(Math.abs(fixed.total-26120.9)<0.3);
 assert.equal(names(raw.turns[1]).at(-1),"Pacte de Sang"); // original remains unchanged
});
test("the chosen automatic strategy includes the ordering improvement and correct total",()=>{
 const ctx=createTeamContext(pactBuild(),{turns:10,hp:100000,criticals:false});
 const raw=optimize({...ctx.settings,refreshTimedBuffs:true},ctx.spells);
 const winner=optimizeTeamMember(ctx);
 assert.equal(names(winner.result.turns[1])[0],"Pacte de Sang");
 assert.ok(winner.result.total>=raw.total);
 assert.ok(winner.result.turns.every(t=>t.spent<=ctx.settings.ap));
 // Future automatic recasts and their UI indicators remain intact.
 const summary=assembleTeamResult([{build:ctx.build,...winner}],{turns:10,hp:100000,criticals:false});
 const casts=summary.turns.flatMap(t=>t.actors[0].actions
  .filter(a=>a.name==="Pacte de Sang").map(a=>({turn:t.number,refresh:a.autoRefreshed})));
 assert.deepEqual(casts.map(x=>x.turn),[2,5,8]);
 assert.equal(casts[0].refresh,false);
 assert.ok(casts.slice(1).every(x=>x.refresh));
});
test("a damage-dealing buff spell such as Furie is not blindly moved",()=>{
 const ctx=createTeamContext(pactBuild(),{turns:10,hp:100000,criticals:false});
 const raw=optimize({...ctx.settings,refreshTimedBuffs:true},ctx.spells);
 const fixed=improveTeamBuffOrder(raw,ctx);
 assert.equal(names(raw.turns[1])[0],"Furie");
 assert.deepEqual(names(fixed.turns[1]).slice(1),names(raw.turns[1]).slice(0,-1));
 const alternative=createTeamContext(sacri,{turns:3});
 const natural=optimize(alternative.settings,alternative.spells);
 const improved=improveTeamBuffOrder(natural,alternative);
 assert.ok(improved.total>=natural.total);
 assert.ok(improved.turns.every(t=>t.spent<=alternative.settings.ap));
});
test("Sram non-buff actions and turns remain valid and do not lose damage",()=>{
 const ctx=createTeamContext(sram,{turns:3});
 const plan=optimize(ctx.settings,ctx.spells);
 const improved=improveTeamBuffOrder(plan,ctx);
 assert.ok(improved.total>=plan.total);
 assert.equal(improved.turns.length,3);
 assert.ok(improved.turns.every(t=>t.spent<=ctx.settings.ap));
});
test("a corrupted or non-replayable result is not silently rewritten",()=>{
 const ctx=createTeamContext(pactBuild(),{turns:2});
 const plan=optimize(ctx.settings,ctx.spells);
 const malformed={...plan,turns:plan.turns.map((t,i)=>i===0
  ?{...t,actions:[{id:"not-a-real-spell"}]}:t)};
 assert.equal(improveTeamBuffOrder(malformed,ctx),malformed);
});
