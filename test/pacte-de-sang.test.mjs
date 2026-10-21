import test from "node:test";
import assert from "node:assert/strict";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS} from "../src/sacrier-spells.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {initialState,cleanSettings,castSpell,endTurn,eligible} from "../src/engine.js";

const spell=name=>SACRIER_SPELLS.find(x=>x.name===name);
function config(){
 const variants=[...SACRIER_DEFAULT_VARIANTS];
 variants[SACRIER_VARIANTS.findIndex(p=>p.includes("Pacte de Sang"))]="Pacte de Sang";
 return cleanSettings({variants,variantPairs:SACRIER_VARIANTS,defaultVariants:SACRIER_DEFAULT_VARIANTS,
   classId:"sacrieur",ap:12,turns:5,distance:1,criticals:false,resistance:0});
}
test("Pacte de Sang rank 2: Power and Vitality buffs, cost, cooldown",()=>{
 const pact=spell("Pacte de Sang"),c=config();
 assert.equal(pact.pa,2);
 assert.equal(pact.range,0);
 assert.equal(pact.cooldown,2);
 assert.deepEqual(pact.status.buff,{stat:"Puissance",value:100,duration:3,stacks:1});
 assert.deepEqual(pact.status.extraBuffs,[{stat:"Vitalité",unit:"%",value:25,duration:3,stacks:1}]);
 const cast=castSpell(initialState(c),pact,c);
 assert.equal(cast.pa,10);
 assert.equal(cast.buffs.length,2);
 assert.equal(cast.total,0);
 assert.equal(cast.buffs.find(b=>b.stat==="Vitalité").amount,25);
 assert.equal(cast.buffs.find(b=>b.stat==="Puissance").amount,100);
 assert.equal(eligible(pact,cast,c),false);
 assert.equal(eligible(pact,endTurn(cast,c),c),false);
});
test("Pacte de Sang buffs boost subsequent damage, expire after three turns",()=>{
 const c=config();
 const start=initialState(c);
 const attack=spell("Carnage");
 const base=castSpell(start,attack,c).total;
 let cast=castSpell(start,spell("Pacte de Sang"),c);
 assert.ok(castSpell(cast,attack,c).total>base);
 for(let i=0;i<3;i++)cast=endTurn(cast,c);
 assert.equal(cast.buffs.length,0);
 const later=castSpell(cast,attack,c);
 assert.ok(Math.abs((later.total-cast.total)-base)<0.2);
});
