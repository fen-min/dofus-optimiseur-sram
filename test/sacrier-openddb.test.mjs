import test from "node:test";
import assert from "node:assert/strict";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS} from "../src/sacrier-spells.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {SPELL_EFFECTS_AUDIT} from "../src/spell-effects-audit.js";
import {initialState,cleanSettings,castSpell,endTurn,optimize} from "../src/engine.js";
const spell=name=>SACRIER_SPELLS.find(x=>x.name===name);
function cfg(choices=[]){
 const variants=SACRIER_DEFAULT_VARIANTS.slice();
 for(const name of choices){const i=SACRIER_VARIANTS.findIndex(p=>p.includes(name));assert.ok(i>=0);variants[i]=name;}
 return cleanSettings({variants,variantPairs:SACRIER_VARIANTS,defaultVariants:SACRIER_DEFAULT_VARIANTS,
   classId:"sacrieur",ap:12,turns:5,criticals:true,distance:1,resistance:0});
}
test("OpenDofusDB audit has a direct source or class source for all Sacrier spells",()=>{
 const names=new Set(SACRIER_SPELLS.map(x=>x.name));
 assert.equal(names.size,44);
 const rows=SPELL_EFFECTS_AUDIT.sacrieur;
 assert.deepEqual(new Set(Object.keys(rows)),names);
 for(const item of Object.values(rows)){
  assert.match(item.source,/^https:\/\/openddb\.dev\/(spells|classes)/);
  assert.ok(item.description.length>=25);
  assert.ok(item.simulation.length>=8);
 }
});
test("Rank 2 Nervosité adds 7 percent crit for 3 rounds; expires",()=>{
 const c=cfg(["Nervosité"]);let s=initialState(c);
 const base=castSpell(s,spell("Carnage"),c).total;
 const cast=castSpell(s,spell("Nervosité"),c);
 assert.equal(cast.buffs[0].amount,7);
 assert.equal(cast.buffs[0].stat,"Critique");
 const after=castSpell(cast,spell("Carnage"),c).total-cast.total;
 assert.ok(after>base);
 s=cast;
 for(let i=0;i<3;i++)s=endTurn(s,c);
 assert.equal(s.buffs.length,0);
});
test("Rank 2 Douleur Cuisante grants 60 Power and boosts next hit",()=>{
 const c=cfg(["Douleur Cuisante"]);
 const base=castSpell(initialState(c),spell("Carnage"),c).total;
 const cast=castSpell(initialState(c),spell("Douleur Cuisante"),c);
 assert.equal(cast.buffs[0].stat,"Puissance");
 assert.equal(cast.buffs[0].amount,60);
 assert.ok(castSpell(cast,spell("Carnage"),c).total-cast.total>base);
});
test("Rank 3 Mutilation starts at 150 Power and recast changes to Coagulation",()=>{
 const c=cfg(["Mutilation"]);let s=castSpell(initialState(c),spell("Mutilation"),c);
 assert.equal(s.buffs.find(b=>b.key==="Mutilation").amount,150);
 assert.equal(s.mutilationStage,1);
 s=endTurn(s,c);
 assert.equal(s.mutilationStage,2);
 assert.equal(s.buffs.find(b=>b.key==="Mutilation").amount,150);
 s=castSpell(s,spell("Mutilation"),c);
 assert.equal(s.mutilationStage,0);
 assert.equal(s.buffs.some(b=>b.key==="Mutilation"),false);
 assert.ok(s.actions.at(-1).notes.some(n=>n.includes("Coagulation")));
});
test("PV costs are documented, not deducted without a health model",()=>{
 const c=cfg(["Carnage"]);
 const s=castSpell(initialState(c),spell("Carnage"),c);
 assert.ok(s.actions[0].notes.some(n=>n.includes("-10%")));
 assert.ok(!Object.hasOwn(s,"currentHp"));
 assert.equal(spell("Berserk").status.conditionalBonus.value,10);
});
test("Ten turn rotation remains bounded by action points",()=>{
 const c={...cfg(["Nervosité"]),turns:10,beamWidth:8};
 const result=optimize(c,SACRIER_SPELLS);
 assert.equal(result.turns.length,10);
 assert.ok(result.turns.every(t=>t.spent<=12));
 assert.ok(Number.isFinite(result.total));
});
