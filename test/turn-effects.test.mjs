import test from "node:test";
import assert from "node:assert/strict";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS} from "../src/sacrier-spells.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {cleanSettings,initialState,castSpell,endTurn,optimize} from "../src/engine.js";
import {groupActiveEffects,effectDuration,effectValue} from "../src/effect-view.js";

const spell=name=>SACRIER_SPELLS.find(s=>s.name===name);
const setting=(changes={})=>{
 const variants=[...SACRIER_DEFAULT_VARIANTS];
 for(const name of ["Furie","Nervosité","Pacte de Sang"]){
  const pair=SACRIER_VARIANTS.findIndex(p=>p.includes(name));
  variants[pair]=name;
 }
 return cleanSettings({classId:"sacrieur",ap:16,turns:5,distance:1,
  variants,variantPairs:SACRIER_VARIANTS,defaultVariants:SACRIER_DEFAULT_VARIANTS,...changes});
};
test("Furie x2 and Nervosité appear as two grouped buffs at the following turn",()=>{
 const c=setting();let s=initialState(c);
 s=castSpell(s,spell("Nervosité"),c);
 s=castSpell(s,spell("Furie"),c);
 s=castSpell(s,spell("Furie"),c);
 s=endTurn(s,c);
 assert.deepEqual(s.turns[0].startEffects,[]);
 const now=groupActiveEffects(s.turns[0].endEffects);
 const after=groupActiveEffects(s.turns[0].nextEffects);
 assert.equal(now.find(e=>e.name==="Dommages finaux").remainingMin,3);
 assert.equal(now.find(e=>e.name==="Critique").amount,7);
 const fury=after.find(e=>e.name==="Dommages finaux");
 const crit=after.find(e=>e.name==="Critique");
 assert.equal(fury.amount,6);
 assert.equal(fury.stacks,2);
 assert.deepEqual(fury.sources,["Furie"]);
 assert.equal(effectValue(fury),"+6 %");
 assert.equal(effectDuration(fury),"2 tours");
 assert.equal(crit.amount,7);
 assert.equal(crit.remainingMin,2);
 s=endTurn(s,c);
 assert.deepEqual(s.turns[1].startEffects,s.turns[0].nextEffects);
 assert.equal(groupActiveEffects(s.turns[1].nextEffects).find(e=>e.name==="Critique").remainingMin,1);
 s=endTurn(s,c);
 assert.equal(groupActiveEffects(s.turns[2].nextEffects).length,0);
});
test("Mismatched expiry remains visible as a range; distinct buffs are sources not stacks",()=>{
 const x=groupActiveEffects([
  {kind:"buff",name:"Puissance",source:"Pacte de Sang:Puissance",amount:100,remaining:2},
  {kind:"buff",name:"Puissance",source:"Douleur Cuisante",amount:60,remaining:1},
  {kind:"buff",name:"Critique",source:"Nervosité",amount:7,unit:"%",remaining:1}
 ]);
 const p=x.find(e=>e.name==="Puissance");
 assert.equal(p.amount,160);
 assert.equal(p.sources.length,2);
 assert.equal(effectDuration(p),"1–2 tours");
 assert.equal(effectValue(p),"+160");
});
test("Pacte de Sang keeps two separate bonuses in the active effect list",()=>{
 const c=setting();
 let s=castSpell(initialState(c),spell("Pacte de Sang"),c);
 s=endTurn(s,c);
 const effects=groupActiveEffects(s.turns[0].nextEffects);
 assert.ok(effects.some(x=>x.name==="Puissance"&&x.amount===100));
 assert.ok(effects.some(x=>x.name==="Vitalité"&&effectValue(x)==="+25 %"));
});
test("Multi-turn optimizer supplies active effect snapshots for every round",()=>{
 const c=setting({turns:5,beamWidth:8});
 const result=optimize(c,SACRIER_SPELLS);
 assert.equal(result.turns.length,5);
 assert.ok(result.turns.every(t=>Array.isArray(t.startEffects)&&Array.isArray(t.endEffects)&&Array.isArray(t.nextEffects)));
 assert.ok(result.turns.every(t=>t.spent<=16));
 for(let i=1;i<result.turns.length;i++){
  assert.deepEqual(result.turns[i].startEffects,result.turns[i-1].nextEffects);
 }
});
