import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {optimize} from "../src/engine.js";
import {cleanTeamTarget,teamMembers,initiativeOf,createTeamContext as createHealthAwareContext,assembleTeamResult,optimizeTeam,cleanTeamMemberOptions,openingBuffCandidates,optimizeTeamMember} from "../src/team-core.js";
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


const base=INITIAL_BUILDS[0],sacri=INITIAL_BUILDS[1];
test("eight slots contain unique selected builds sorted by decreasing initiative",()=>{
 const b=[{...base,id:"a",stats:{initiative:100}},{...sacri,id:"b",stats:{initiative:800}},
 {...base,id:"c",stats:{initiative:100}},{...base,id:"d",stats:null}];
 assert.deepEqual(teamMembers(b,["a","b","a","c","d","missing"]).map(x=>x.id),["b","a","c","d"]);
 assert.equal(initiativeOf(b[3]),null);
});
test("initiative zero remains a known value, and unknown goes last",()=>{
 const b=[{...base,id:"a",stats:{initiative:0}},{...base,id:"b",stats:null}];
 assert.deepEqual(teamMembers(b,["b","a"]).map(x=>x.id),["a","b"]);
});
test("target limits and resistances are sanitized",()=>{
 const t=cleanTeamTarget({hp:-1,turns:50,criticals:false,resistances:{Air:200,Feu:30,Eau:-10}});
 assert.equal(t.hp,100);assert.equal(t.turns,50);
 assert.equal(t.criticals,false);assert.equal(t.resistances.Air,90);
 assert.equal(t.resistances.Feu,30);assert.equal(t.resistances.Eau,0);
});
test("calibration is applied once, and independent variants and resists are preserved",()=>{
 const ctx=createTeamContext({...base,calibration:{}},{turns:2,resistances:{Air:25,Terre:15}});
 assert.equal(ctx.settings.ap,12);
 assert.equal(ctx.settings.turns,2);
 assert.equal(ctx.settings.resistances.Air,25);
 assert.equal(ctx.settings.resistances.Terre,15);
 assert.deepEqual(ctx.settings.variants,base.variants);
 const spell=ctx.spells.find(x=>x.status?.buff)||ctx.spells[0];
 const edited=createTeamContext({...base,calibration:{[spell.id]:{min:77,max:88,buff:{value:99,duration:2}}}},{turns:2});
 assert.equal(edited.spells.find(x=>x.id===spell.id).min,77);
 assert.equal(edited.spells.find(x=>x.id===spell.id).max,88);
 if(spell.status?.buff)assert.equal(edited.spells.find(x=>x.id===spell.id).status.buff.value,99);
 assert.notEqual(ctx.spells.find(x=>x.id===spell.id).min,77);
});
test("result aggregates actors per turn in initiative order, caps effective target HP",()=>{
 const toy=(build,turns,total)=>({build,result:{
  total,immediate:total,poison:0,turns:turns.map((d,i)=>({
   number:i+1,total:d,immediate:d,poison:0,spent:3,actions:[{name:"Sort "+i,pa:3}]
  }))}});
 const res=assembleTeamResult([
  toy({id:"high",character:"H",name:"Air",initiative:500},[100,200],300),
  toy({id:"low",character:"L",name:"Air",initiative:200},[80,150],230)
 ],{hp:350,turns:2});
 assert.equal(res.theoretical,530);
 assert.equal(res.effective,350);
 assert.equal(res.overkill,180);
 assert.equal(res.turns[0].remainingHp,170);
 assert.equal(res.turns[1].remainingHp,0);
 assert.deepEqual(res.turns[1].actors.map(a=>a.id),["high","low"]);
 assert.equal(res.turns[1].actors[0].actions[0].name,"Sort 1");
});

test("eight-build rotation generates eight initiative-sorted actions sets without PA overflow",()=>{
 const builds=Array.from({length:8},(_,i)=>({
  ...INITIAL_BUILDS[i%2],id:"synthetic-"+i,character:"Joueur "+(i+1),
  stats:{initiative:2100-i*100}
 }));
 const target={hp:30000,turns:1,resistances:{Air:20}};
 const lineup=teamMembers(builds,builds.map(b=>b.id));
 const output=optimizeTeam(lineup.map(b=>createTeamContext(b,target)),target);
 assert.equal(output.members.length,8);
 assert.equal(output.turns.length,1);
 assert.equal(output.turns[0].actors.length,8);
 assert.ok(output.turns[0].actors.every(a=>a.spent<=12));
 assert.ok(output.members.every((m,i)=>!i||output.members[i-1].initiative>=m.initiative));
 assert.ok(Number.isFinite(output.theoretical)&&output.theoretical>=0);
});

test("team PA overrides stay per-character and leave original builds unchanged",()=>{
 const original=base.ap;
 const build={...base,ap:12};
 const ctx=createTeamContext(build,{turns:2},{ap:16});
 assert.equal(ctx.settings.ap,16);
 assert.equal(ctx.build.ap,16);
 assert.equal(build.ap,12);
 assert.equal(base.ap,original);
 const other=createTeamContext(sacri,{turns:2},{ap:11});
 assert.equal(other.settings.ap,11);
 assert.equal(cleanTeamMemberOptions(build,{ap:21}).ap,12);
 assert.equal(cleanTeamMemberOptions(build,{ap:5}).ap,12);
 assert.equal(cleanTeamMemberOptions(build,{ap:8.5}).ap,12);
});

test("automatic optimizer uses equipped variants and ignores legacy manual buff controls",()=>{
 const original=sacri.variants.slice();
 const chosen=SACRIER_VARIANTS.findIndex(p=>p.includes("Pacte de Sang"));
 const pact={...sacri,variants:sacri.variants.map((x,i)=>i===chosen?"Pacte de Sang":x)};
 const context=createTeamContext(pact,{turns:3},{ap:14,
  support:"Mutilation",forceOpeningBuff:true,refreshTimedBuffs:false});
 assert.equal(context.settings.ap,14);
 assert.equal(context.settings.variants[chosen],"Pacte de Sang");
 assert.equal(context.settings.refreshTimedBuffs,false);
 assert.equal(context.forceOpeningSpell,undefined);
 assert.deepEqual(sacri.variants,original);
 assert.deepEqual(cleanTeamMemberOptions(sacri,{ap:14,support:"Pacte de Sang",forceOpeningBuff:true}),{ap:14});
 const buffs=openingBuffCandidates(context);
 assert.ok(buffs.some(x=>x.name==="Pacte de Sang"));
 assert.ok(!buffs.some(x=>x.name==="Mutilation"));
});
test("automatic buff opening and renewal can win the five-turn comparison",()=>{
 const chosen=SACRIER_VARIANTS.findIndex(p=>p.includes("Pacte de Sang"));
 const pact={...sacri,variants:sacri.variants.map((x,i)=>i===chosen?"Pacte de Sang":x)};
 const target={turns:5};
 const ctx=createTeamContext(pact,target);
 const baseline=optimize(ctx.settings,ctx.spells);
 const trial=optimizeTeamMember(ctx);
 assert.equal(trial.strategy,"ouverture");
 assert.equal(trial.chosenOpening,"Pacte de Sang");
 assert.equal(trial.result.turns[0].actions[0].name,"Pacte de Sang");
 assert.ok(trial.result.turns[3].actions.some(a=>a.name==="Pacte de Sang"));
 assert.ok(trial.result.total>=baseline.total);
 assert.ok(trial.strategiesTested>=2);
});
test("optimizer does not force a support spell when that plan loses damage",()=>{
 const context=createTeamContext(sacri,{turns:5});
 const natural=optimize(context.settings,context.spells);
 const compared=optimizeTeamMember(context);
 assert.ok(compared.result.total>=natural.total);
 assert.ok(compared.result.turns.every(t=>t.spent<=context.settings.ap));
 assert.ok(compared.strategiesTested>=1);
});
