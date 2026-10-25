import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn,cleanTeamTarget} from "../src/team-core.js";
import {initialState,castSpell,endTurn} from "../src/engine.js";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const build=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const variants=build.variants.slice();
variants[CLASSES.sacrieur.pairs.findIndex(p=>p.includes("Pacte de Sang"))]="Pacte de Sang";
const pactBuild={...build,variants};
const target=cleanTeamTarget({hp:1e12,turns:10,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const ctx=createTeamContext(pactBuild,target);
const chosen=name=>{
 const sp=ctx.spells.find(x=>x.name===name);assert.ok(sp,name);return sp;
};

test("Pacte de Sang est bien équipé à la place de Mutilation dans les audits",()=>{
 assert.ok(ctx.settings.variants.includes("Pacte de Sang"));
 assert.ok(!ctx.settings.variants.includes("Mutilation"));
});

test("Berserk est interdit sous 50 % de PV, même si la Vitalité de Pacte augmente",()=>{
 const before=initialState(ctx.settings);
 const pact=castSpell(before,chosen("Pacte de Sang"),ctx.settings);
 assert.ok(sacrierHealthAboveFloor(pact,50));
 assert.equal(pact.sacrierHealth.maxHp,6190);
 const berserk=castSpell(pact,chosen("Berserk"),ctx.settings);
 assert.ok(!sacrierCastAboveFloor(pact,chosen("Berserk"),berserk,50));
 assert.ok(berserk.sacrierHealth.hp<berserk.sacrierHealth.maxHp/2);
});

test("Choix automatique Sacrieur respecte les PV minimum sur 10 tours",()=>{
 for(const mode of ["fast","long"]){
  let previous=null;
  const strategy={mode,horizon:10,effort:"quick",minHpPercent:50};
  for(let i=0;i<10;i++){
   previous=optimizeTeamTurn([ctx],target,()=>{},previous,strategy);
   const state=previous.session.actors[0].state;
   assert.ok(sacrierHealthAboveFloor(state,50),mode+" apres tour "+(i+1));
   assert.ok(previous.turns[i].actors[0].spent<=12);
   assert.ok(!previous.turns[i].actors[0].actions.some(a=>a.name==="Berserk"),
    mode+" ne doit pas recommander Berserk");
  }
 }
});

test("Le garde-fou peut être désactivé sans modifier l'historique manuel",()=>{
 let current=initialState(ctx.settings);
 const spell=chosen("Berserk");
 const after=castSpell(current,spell,ctx.settings);
 assert.ok(sacrierCastAboveFloor(current,spell,after,0));
 assert.ok(!sacrierCastAboveFloor(current,spell,after,50));
});
