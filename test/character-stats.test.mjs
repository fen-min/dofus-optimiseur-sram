import test from "node:test";
import assert from "node:assert/strict";
import {CLASSES,INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {SACRIER_AIR_REFERENCE_STATS,sanitizeCharacterStats} from "../src/character-stats.js";

test("Sacrieur Air screenshot stats are captured exactly",()=>{
 const s=SACRIER_AIR_REFERENCE_STATS;
 assert.equal(s.hitPoints,4952);
 assert.equal(s.actionPoints,12);
 assert.equal(s.movementPoints,5);
 assert.equal(s.rangeBonus,5);
 assert.equal(s.agility,1267);
 assert.equal(s.power,160);
 assert.equal(s.critical,-44);
 assert.equal(s.chance,405);
 assert.equal(s.flatDamage.Air,144);
 assert.equal(s.flatDamage.Eau,56);
 assert.equal(s.criticalDamage,24);
 assert.equal(s.spellDamagePercent,1);
 assert.equal(s.resistPercent.Air,20);
});
test("Existing Sacrier reference build migrates and retains chosen simulation PA",()=>{
 const existing=normalizeBuild({id:"sacri-air-pvm",classId:"sacrieur",ap:16,turns:10,
  source:CLASSES.sacrieur.source});
 assert.equal(existing.ap,16);
 assert.equal(existing.stats.actionPoints,12);
 assert.equal(existing.stats.critical,-44);
 assert.equal(existing.stats.power,160);
});
test("Sram/new Sacrier builds are not assigned unrelated screenshot stats",()=>{
 assert.equal(normalizeBuild({classId:"sram",id:"sram-air-pvm"}).stats,null);
 assert.equal(normalizeBuild({classId:"sacrieur",id:"new-build"}).stats,null);
});
test("Duplicate/edited character stats are independent",()=>{
 const ref=normalizeBuild(INITIAL_BUILDS[1]);
 const clone=normalizeBuild(JSON.parse(JSON.stringify({...ref,id:"duplicate"})));
 clone.stats.flatDamage.Air=165;
 assert.equal(ref.stats.flatDamage.Air,144);
 assert.equal(clone.stats.flatDamage.Air,165);
});
test("Critical can be negative and must not be counted twice into DofusBook baseline",()=>{
 const data=sanitizeCharacterStats({...SACRIER_AIR_REFERENCE_STATS,critical:-44});
 assert.equal(data.critical,-44);
 assert.ok(!Object.hasOwn(data,"appliedToDofusBookDamage"));
});
