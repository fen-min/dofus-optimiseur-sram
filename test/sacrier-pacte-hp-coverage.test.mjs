import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {cleanTeamTarget,createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const base=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="sacri-air-pvm"));
const idx=CLASSES.sacrieur.pairs.findIndex(p=>p.includes("Pacte de Sang"));
const build=structuredClone(base);build.variants[idx]="Pacte de Sang";
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
for(const [pct,floor] of [[30,20],[40,20],[60,50],[70,50],[80,50]]){
 test("Pacte choisi à "+pct+" % PV, PA et 3 tours persistants",()=>{
  const ctx=createTeamContext(build,target,{ap:12,startHpPercent:pct});
  assert.equal(ctx.settings.sacrierStartingHpPercent,pct);
  assert.ok(ctx.settings.variants.includes("Pacte de Sang"));
  assert.ok(!ctx.settings.variants.includes("Mutilation"));
  const policy={mode:"long",horizon:10,minHpPercent:floor};
  let previous=null;
  for(let turn=1;turn<=3;turn++){
   const PA=turn===2?14:12;
   const newer=optimizeTeamTurn([ctx],target,()=>{},previous,policy,
    {[ctx.build.id]:PA});
   assert.equal(newer.turns.length,turn);
   const actor=newer.turns.at(-1).actors[0];
   assert.equal(actor.availablePA,PA);
   assert.ok(actor.spent<=PA);
   assert.ok(actor.actions.every(x=>x.name!=="Mutilation"));
   assert.ok(sacrierHealthAboveFloor(newer.session.actors[0].state,floor));
   if(previous)assert.deepEqual(newer.turns.slice(0,-1),previous.turns);
   previous=newer;
  }
 });
}
