import test from "node:test";
import assert from "node:assert/strict";
import {SIM_SPELLS} from "../src/sim-spells.js";
import {SACRIER_SPELLS} from "../src/sacrier-spells.js";
import {geometryFor,inMask,profileCoverage} from "../src/spell-zones.js";
import {cleanSettings} from "../src/engine.js";
import {VARIANT_PAIRS,SRAM_SCREENSHOT_VARIANTS,DEFAULT_VARIANTS} from "../src/sim-spells.js";
import {makeState,manualActions,applyAction,legalActions} from "../src/multi-core.js";

test("All 88 Sram and Sacrieur spells have an explicit verified or cautious footprint",()=>{
 for(const [id,arr] of [["sram",SIM_SPELLS],["sacrieur",SACRIER_SPELLS]]){
  assert.equal(arr.length,44);
  const summary=profileCoverage(arr,id);
  assert.equal(summary.total,44);
  assert.equal(summary.verified+summary.approximate+summary.unverified,44);
  for(const spell of arr){
   const profile=geometryFor(spell,id);
   assert.ok(profile.mask&&profile.mode&&profile.notes,spell.name);
   assert.ok(["verified","approximate","unverified"].includes(profile.confidence));
  }
 }
});
test("Fourvoiement is four orthogonal cells WITHOUT the aimed center",()=>{
 const hero={x:4,y:4};
 const around=[{x:3,y:4},{x:5,y:4},{x:4,y:3},{x:4,y:5}];
 const profile=geometryFor({name:"Fourvoiement"},"sram");
 assert.equal(profile.mask,"crossNoCenter");
 assert.equal(profile.confidence,"verified");
 assert.ok(around.every(p=>inMask(hero,p,profile.mask,hero)));
 assert.equal(inMask(hero,hero,profile.mask,hero),false);
 assert.equal(inMask(hero,{x:5,y:5},profile.mask,hero),false);
});
test("Independent targeting can center Fourvoiement on a vacant/hero square and hit four enemies",()=>{
 const settings=cleanSettings({classId:"sram",ap:12,turns:2,variants:SRAM_SCREENSHOT_VARIANTS,
  variantPairs:VARIANT_PAIRS,defaultVariants:DEFAULT_VARIANTS,inLine:true,lineOfSight:true});
 const context={settings,spells:SIM_SPELLS};
 const board={hero:{x:4,y:4},monsters:[
  {id:"m1",x:3,y:4,hp:10000},{id:"m2",x:5,y:4,hp:10000},
  {id:"m3",x:4,y:3,hp:10000},{id:"m4",x:4,y:5,hp:10000}
 ],shapes:{}};
 const seed=makeState(context,board);
 const moves=manualActions(seed,context).filter(a=>a.spell.name==="Fourvoiement");
 assert.ok(moves.some(a=>a.center.x===4&&a.center.y===4));
 const spell=SIM_SPELLS.find(s=>s.name==="Fourvoiement");
 const out=applyAction(seed,spell,{x:4,y:4},context);
 assert.equal(out.actions[0].targets.length,4);
 assert.equal(out.monsters.filter(m=>m.damage>0).length,4);
 assert.equal(out.engine.pa,8);
});
test("Traps may be placed manually but do not generate automatic damage without a trigger",()=>{
 const spell=SIM_SPELLS.find(s=>s.name==="Piège Répulsif");
 const variants=SRAM_SCREENSHOT_VARIANTS.slice();variants[spell.variantGroup]=spell.name;
 const context={settings:cleanSettings({classId:"sram",ap:12,turns:2,
 variants,variantPairs:VARIANT_PAIRS,inLine:true,lineOfSight:true}),spells:SIM_SPELLS};
 const board={hero:{x:4,y:4},monsters:[{id:"m1",x:6,y:4,hp:10000}],shapes:{}};
 const seed=makeState(context,board);
 const moves=manualActions(seed,context).filter(a=>a.spell.name==="Piège Répulsif");
 assert.ok(moves.length>0);
 const result=applyAction(seed,spell,moves[0].center,context);
 assert.equal(result.total,0);
 assert.equal(result.placedTraps.length,1);
 assert.ok(!legalActions(seed,context).some(a=>a.spell.name==="Piège Répulsif"));
});
test("Sacrieur confirmed shapes include Furie cross and Fulgurance caster-line",()=>{
 assert.equal(geometryFor({name:"Furie"},"sacrieur").mask,"cross1");
 assert.equal(geometryFor({name:"Fulgurance"},"sacrieur").mask,"casterLine");
 const caster={x:1,y:1},aim={x:4,y:1};
 assert.equal(inMask(aim,{x:2,y:1},"casterLine",caster),true);
 assert.equal(inMask(aim,{x:2,y:2},"casterLine",caster),false);
});
