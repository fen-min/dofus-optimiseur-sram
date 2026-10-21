import test from "node:test";
import assert from "node:assert/strict";
import {CLASSES} from "../src/classes.js";
import {SPELL_EFFECTS_AUDIT} from "../src/spell-effects-audit.js";

test("Every class spell has an audit entry, including non-damaging spells",()=>{
 for(const cls of Object.values(CLASSES)){
  const audit=SPELL_EFFECTS_AUDIT[cls.id];
  assert.ok(audit,cls.id);
  assert.equal(Object.keys(audit).length,44,cls.id);
  const expected=new Set(cls.catalog.map(s=>s.name));
  assert.deepEqual(new Set(Object.keys(audit)),expected);
  for(const [name,item] of Object.entries(audit)){
   assert.ok(item.description.length>15,name);
   assert.ok(item.source.startsWith("https://"),name);
   assert.equal(item.simulation,"partielle",name);
  }
 }
});
test("Furie audit mentions final damage stacks and poison audit flags conditional effects",()=>{
 assert.match(SPELL_EFFECTS_AUDIT.sacrieur.Furie.description,/3\s*%/);
 assert.match(SPELL_EFFECTS_AUDIT.sram.Toxines.description,/pi[eè]ge/i);
 assert.match(SPELL_EFFECTS_AUDIT.sacrieur.Mutilation.description,/PV/i);
 assert.match(SPELL_EFFECTS_AUDIT.sram.Manigance.description,/Dommages/i);
});
