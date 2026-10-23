import test from "node:test";
import assert from "node:assert/strict";
import {spellsForActiveBuild} from "../src/build-damage.js";
import {SACRIER_SPELLS} from "../src/sacrier-spells.js";
import {SACRIER_AIR_REFERENCE_STATS} from "../src/character-stats.js";

const withStats=(changes={})=>({...SACRIER_AIR_REFERENCE_STATS,...changes,
 flatDamage:{...SACRIER_AIR_REFERENCE_STATS.flatDamage,...changes.flatDamage}});
const assaut=()=>SACRIER_SPELLS.find(s=>s.name==="Assaut");
test("active agility controls the damage of an existing Sacrier",()=>{
 const low=spellsForActiveBuild("sacrieur",[assaut()],withStats({agility:500}))[0];
 const high=spellsForActiveBuild("sacrieur",[assaut()],withStats({agility:1500}))[0];
 assert.ok(high.min>low.min);
 assert.ok(high.max>low.max);
});
test("active flat air damage controls a newly created build",()=>{
 const low=spellsForActiveBuild("sacrieur",[assaut()],withStats({flatDamage:{Air:0}}))[0];
 const high=spellsForActiveBuild("sacrieur",[assaut()],withStats({flatDamage:{Air:100}}))[0];
 assert.equal(high.min-low.min,100);
});
test("spell damage does not fall back to saved catalog figures without stats",()=>{
 const [spell]=spellsForActiveBuild("sacrieur",[assaut()],null);
 assert.equal(spell.min,0);
 assert.equal(spell.damageSource,"statistiques-manquantes");
});
test("catalog spells remain unchanged between different builds",()=>{
 const original=assaut();
 const min=original.min;
 spellsForActiveBuild("sacrieur",[original],withStats({agility:1000}));
 assert.equal(original.min,min);
});
