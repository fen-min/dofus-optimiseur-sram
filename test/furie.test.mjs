import test from "node:test";
import assert from "node:assert/strict";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS} from "../src/sacrier-spells.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {cleanSettings,initialState,castSpell,endTurn,eligible,optimize} from "../src/engine.js";
const spell=name=>SACRIER_SPELLS.find(s=>s.name===name);
const settings=()=>cleanSettings({classId:"sacrieur",ap:12,turns:3,distance:1,criticals:false,resistance:0,variants:SACRIER_DEFAULT_VARIANTS,variantPairs:SACRIER_VARIANTS,defaultVariants:SACRIER_DEFAULT_VARIANTS});
test("Furie applies verified 3% final damage for 3 turns with max 2 stacks",()=>{
 const c=settings(),base=initialState(c);
 assert.deepEqual(spell("Furie").status.buff,{stat:"Dommages finaux",unit:"%",value:3,duration:3,stacks:2});
 const direct=castSpell(base,spell("Carnage"),c).total;
 const once=castSpell(base,spell("Furie"),c);
 const buffed=castSpell(once,spell("Carnage"),c).total-once.total;
 const twice=castSpell(once,spell("Furie"),c);
 const buffedTwice=castSpell(twice,spell("Carnage"),c).total-twice.total;
 assert.ok(Math.abs(buffed-direct*1.03)<0.15);
 assert.ok(Math.abs(buffedTwice-direct*1.06)<0.15);
 assert.equal(eligible(spell("Furie"),twice,c),false);
 let state=twice;
 for(let t=0;t<3;t++)state=endTurn(state,c);
 const expired=castSpell(state,spell("Carnage"),c).total-state.total;
 assert.ok(Math.abs(expired-direct)<0.15);
});
test("Furie increases damage of next Furie, not its own first hit",()=>{
 const c=settings(),base=initialState(c);
 const a=castSpell(base,spell("Furie"),c);
 const b=castSpell(a,spell("Furie"),c);
 assert.ok(Math.abs((b.total-a.total)-a.total*1.03)<0.15);
});
test("Sacrier default range lets Furie participate in three-turn optimization",()=>{
 const c=cleanSettings({...settings(),distance:2,beamWidth:8});
 const result=optimize(c,SACRIER_SPELLS);
 assert.equal(result.turns.length,3);
 assert.ok(result.turns.every(t=>t.spent<=12));
 assert.ok(Number.isFinite(result.total));
});