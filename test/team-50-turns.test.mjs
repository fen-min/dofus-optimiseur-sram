import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {cleanSettings,optimize} from "../src/engine.js";
import {TEAM_LIMIT,cleanTeamTarget,teamMembers,createTeamContext,optimizeTeam} from "../src/team-core.js";

test("team horizon accepts 50 turns, rejects 51 and preserves old 10-turn solo limit",()=>{
 assert.equal(cleanTeamTarget({turns:50}).turns,50);
 assert.equal(cleanTeamTarget({turns:51}).turns,50);
 assert.equal(cleanTeamTarget({turns:0}).turns,1);
 assert.equal(cleanTeamTarget({turns:10}).turns,10);
 assert.equal(cleanSettings({turns:50}).turns,10);
 assert.equal(cleanSettings({turns:50,longHorizon:true}).turns,50);
 assert.equal(cleanSettings({turns:75,longHorizon:true}).turns,50);
});

test("team builds use 50 turns regardless of 10-turn saved build duration",()=>{
 const b=INITIAL_BUILDS[1];
 const ctx=createTeamContext({...b,turns:10},{turns:50});
 assert.equal(ctx.settings.turns,50);
 assert.equal(ctx.settings.longHorizon,true);
 assert.equal(ctx.settings.ap,b.ap);
 const solo=cleanSettings({...ctx.settings,longHorizon:false});
 assert.equal(solo.turns,10);
});

test("real engine completes 50 rounds and reports final-turn damage",()=>{
 const target={turns:50,hp:1000000};
 const ctx=createTeamContext(INITIAL_BUILDS[1],target);
 const spell=ctx.spells.find(x=>x.name==="Assaut");
 assert.ok(spell);
 const plan=optimize(ctx.settings,[spell]);
 assert.equal(plan.settings.turns,50);
 assert.equal(plan.turns.length,50);
 assert.equal(plan.turns[0].number,1);
 assert.equal(plan.turns[49].number,50);
 assert.ok(plan.turns.every(t=>t.spent<=ctx.settings.ap));
 assert.ok(plan.total>0);
});

test("full 50-round team aggregation remains in initiative order",()=>{
 const builds=INITIAL_BUILDS.slice(0,2);
 const selection=teamMembers(builds,builds.map(b=>b.id));
 const target={turns:50,hp:1000000};
 const contexts=selection.map(b=>{
  const ctx=createTeamContext(b,target);
  const name=b.classId==="sacrieur"?"Assaut":"Arnaque";
  const chosen=ctx.spells.find(x=>x.name===name);
  assert.ok(chosen,"Expected known attack "+name);
  return {...ctx,spells:[chosen]};
 });
 let lastProgress=0;
 const result=optimizeTeam(contexts,target,p=>{lastProgress=Math.max(lastProgress,p.turn);});
 assert.equal(result.turns.length,50);
 assert.equal(result.members.length,2);
 assert.equal(result.turns[49].number,50);
 assert.equal(result.turns[49].actors.length,2);
 assert.deepEqual(result.turns[49].actors.map(x=>x.id),selection.map(x=>x.id));
 assert.ok(result.turns.every(t=>t.actors.every(a=>a.spent<=12)));
 assert.ok(result.theoretical>0);
 assert.equal(result.averagePerTurn,Math.round(result.theoretical/50*10)/10);
 assert.equal(lastProgress,50);
 assert.equal(TEAM_LIMIT,8);
});
