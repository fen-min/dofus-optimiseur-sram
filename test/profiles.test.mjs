import test from "node:test";
import assert from "node:assert/strict";
import {CLASSES,INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {cleanSettings,optimize,eligible,initialState} from "../src/engine.js";

test("three reference characters with distinct and verified class sources",()=>{
 assert.deepEqual(Object.keys(CLASSES),["sram","sacrieur","ecaflip"]);
 assert.equal(INITIAL_BUILDS.length,3);
 for(const cls of Object.values(CLASSES)){
  assert.equal(cls.spells.length,44);
  assert.equal(cls.catalog.length,44);
  assert.equal(cls.pairs.length,22);
  assert.equal(cls.defaultVariants.length,22);
  const all=cls.pairs.flat();
  assert.equal(new Set(all).size,44);
  assert.deepEqual(new Set(all),new Set(cls.catalog.map(x=>x.name)));
  assert.ok(cls.source.includes(cls.id==="ecaflip"?"dofus-grimoire.fr":"dofusbook.net"));
 }
});
test("each build has one and only one spell from each variant pair",()=>{
 for(const cls of Object.values(CLASSES)){
  const b=normalizeBuild({classId:cls.id,variants:cls.defaultVariants,name:"Build personnalisé"});
  assert.equal(b.variants.length,22);
  const c=cleanSettings({variants:b.variants,variantPairs:cls.pairs,defaultVariants:cls.defaultVariants});
  for(const [i,pair] of cls.pairs.entries()){
   const available=cls.spells.filter(s=>pair.includes(s.name));
   const a=available.filter(s=>eligible(s,initialState(c),c));
   assert.ok(a.length<=1,"Cannot use both variants from "+pair);
   assert.ok(pair.includes(c.variants[i]));
  }
 }
});
test("Sacrieur and Sram do not share their selected variants",()=>{
 const s=CLASSES.sram;
 const a=CLASSES.sacrieur;
 const b=normalizeBuild({classId:"sacrieur",variants:s.defaultVariants});
 assert.deepEqual(b.variants,a.defaultVariants);
 const c=normalizeBuild({classId:"sram",variants:a.defaultVariants});
 assert.deepEqual(c.variants,s.defaultVariants);
});
test("independent clones do not share arrays and calibrations",()=>{
 const build=normalizeBuild(INITIAL_BUILDS[0]);
 const clone=normalizeBuild(structuredClone({...build,id:"clone",variants:[...build.variants]}));
 clone.variants[0]=CLASSES.sram.pairs[0].find(x=>x!==build.variants[0]);
 clone.calibration["test"]={min:50};
 assert.notEqual(clone.variants[0],build.variants[0]);
 assert.equal(build.calibration.test,undefined);
});
test("Sacrieur ten-turn prototype obeys PA and class-specific variants",()=>{
 const cls=CLASSES.sacrieur;
 const c={ap:12,turns:10,beamWidth:8,variants:cls.defaultVariants,variantPairs:cls.pairs,defaultVariants:cls.defaultVariants};
 const output=optimize(c,cls.spells);
 assert.equal(output.turns.length,10);
 assert.equal(output.considered,22);
 assert.ok(output.turns.every(x=>x.spent<=12));
 assert.ok(Number.isFinite(output.total));
});
