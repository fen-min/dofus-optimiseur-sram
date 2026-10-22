import test from "node:test";
import assert from "node:assert/strict";
import {CLASSES,INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {SACRIER_AIR_REFERENCE_STATS,SRAM_AIR_REFERENCE_STATS,sanitizeCharacterStats} from "../src/character-stats.js";

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
test("Sram reference build receives Matryoshka stats, new unrelated builds do not",()=>{
 const s=normalizeBuild({classId:"sram",id:"sram-air-pvm",ap:16});
 assert.equal(s.stats.hitPoints,4065);
 assert.equal(s.stats.agility,1645);
 assert.equal(s.stats.critical,17);
 assert.equal(s.stats.flatDamage.Air,153);
 assert.equal(s.ap,16);
 assert.equal(normalizeBuild({classId:"sram",id:"new-sram-build"}).stats,null);
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

test("Matryoshka screenshot secondary stats and resistances are preserved",()=>{
 const s=SRAM_AIR_REFERENCE_STATS;
 assert.equal(s.hitPoints,4065);
 assert.equal(s.actionPoints,12);
 assert.equal(s.movementPoints,5);
 assert.equal(s.rangeBonus,5);
 assert.equal(s.agility,1645);
 assert.equal(s.power,160);
 assert.equal(s.critical,17);
 assert.equal(s.wisdom,430);
 assert.equal(s.criticalDamage,33);
 assert.equal(s.flatDamage.Air,153);
 assert.equal(s.resistPercent.Air,27);
 assert.equal(s.resistPercent.Neutre,14);
 assert.equal(s.criticalResistance,32);
 assert.equal(s.pushResistance,43);
 assert.equal(s.dodge,159);
 assert.equal(s.initiative,1748);
});
