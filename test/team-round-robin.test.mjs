import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,assembleTeamResult} from "../src/team-core.js";
import {optimize} from "../src/engine.js";

test("initiative turns execute round-robin with each actor retaining its own cooldown state",()=>{
 const target={hp:1000000,turns:3};
 const contexts=[INITIAL_BUILDS[1],INITIAL_BUILDS[0]].map(b=>createTeamContext(b,target));
 const entries=contexts.map(ctx=>{
  const spell=ctx.spells.find(s=>s.name===(ctx.build.classId==="sacrieur"?"Assaut":"Arnaque"));
  const local={...ctx,spells:[spell]};
  return {ctx:local,build:ctx.build,result:optimize(ctx.settings,[spell]),strategy:"test",strategiesTested:1};
 });
 const result=assembleTeamResult(entries,target);
 assert.equal(result.turns.length,3);
 assert.deepEqual(result.turns.map(t=>t.actors.map(a=>a.id)),Array(3).fill(entries.map(e=>e.build.id)));
 assert.equal(result.theoretical,Math.round(result.members.reduce((sum,m)=>sum+m.estimated,0)*10)/10);
 assert.ok(result.turns[1].actors.every(a=>a.spent<=12));
});

test("no subsequent actor actions are executed after the shared target dies",()=>{
 const target={hp:100,turns:3};
 const ctx=createTeamContext(INITIAL_BUILDS[1],target);
 const spell=ctx.spells.find(s=>s.name==="Assaut");
 const local={...ctx,spells:[spell]};
 const one={ctx:local,build:ctx.build,result:optimize(ctx.settings,[spell]),strategy:"test",strategiesTested:1};
 const result=assembleTeamResult([one],target);
 assert.equal(result.effective,100);
 assert.equal(result.turns[1].actors[0].actions.length,0);
 assert.equal(result.turns[2].actors[0].damage,0);
});
