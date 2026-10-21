import test from "node:test";
import assert from "node:assert/strict";
import {
 COMBAT_STORE,COMBAT_TURNS,packCombatRotation,
 storeCombatRotation,getCombatRotation,clearCombatRotation,
 getCombatTurn,setCombatTurn,renderCombatTurns
} from "../src/combat-view.js";

const storage=()=>{
 const map=new Map();
 return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),_map:map};
};
const build=(id="sacri")=>({id,character:"Mon Sacrieur",name:"Air PvM",classId:"sacrieur"});
const result={
 settings:{ap:12},
 turns:Array.from({length:10},(_,i)=>({
  number:i+1,spent:i===0?11:12,
  actions:i===0?[
   {name:"Pacte de Sang",pa:2},{name:"Furie",pa:3},
   {name:"Furie",pa:3},{name:"Folie Sanguinaire",pa:3}
  ]:[{name:"Assaut",pa:2},{name:"Furie",pa:3}]
 }))
};
test("Compact view renders exact spell order and PA for all ten turns",()=>{
 const rotation=packCombatRotation(build(),result);
 assert.equal(rotation.turns.length,10);
 assert.equal(rotation.turns[0].spent,11);
 assert.deepEqual(rotation.turns[0].actions.map(a=>a.name),
 ["Pacte de Sang","Furie","Furie","Folie Sanguinaire"]);
 const html=renderCombatTurns(rotation,1);
 assert.equal((html.match(/data-combat-turn=/g)||[]).length,10);
 assert.ok(html.includes("11/12 PA"));
 assert.ok(html.includes("Folie Sanguinaire"));
 assert.ok(!html.includes("dégâts"));
 assert.ok(html.includes('aria-current="step"'));
});
test("Different builds retain independent rotations and selected turns",()=>{
 const ls=storage(),a=packCombatRotation(build("a"),result);
 const b=packCombatRotation(build("b"),{...result,settings:{ap:16}});
 assert.equal(storeCombatRotation(ls,a),true);
 storeCombatRotation(ls,b);
 setCombatTurn(ls,"a",6,10);setCombatTurn(ls,"b",3,10);
 assert.equal(getCombatRotation(ls,"a").ap,12);
 assert.equal(getCombatRotation(ls,"b").ap,16);
 assert.equal(getCombatTurn(ls,"a",10),6);
 assert.equal(getCombatTurn(ls,"b",10),3);
 clearCombatRotation(ls,"a");
 assert.equal(getCombatRotation(ls,"a"),null);
 assert.equal(getCombatTurn(ls,"a",10),1);
 assert.equal(getCombatTurn(ls,"b",10),3);
 assert.ok(ls._map.has(COMBAT_STORE)&&ls._map.has(COMBAT_TURNS));
});
test("User-controlled spell labels are escaped, and selected turn is clamped",()=>{
 const ls=storage();
 const rotation=packCombatRotation(build(),{
  settings:{ap:12},
  turns:[{number:1,spent:2,actions:[{name:'<img src=x onerror=alert(1)>',pa:2}]}]
 });
 const html=renderCombatTurns(rotation,1);
 assert.ok(!html.includes('<img'));
 assert.ok(html.includes('&lt;img'));
 assert.equal(getCombatTurn(ls,"sacri",1),1);
 setCombatTurn(ls,"sacri",999,10);
 assert.equal(getCombatTurn(ls,"sacri",10),10);
});
test("Popup information is local-only: saved results contain no combat notes or DPS",()=>{
 const ls=storage(),rotation=packCombatRotation(build(),result);
 storeCombatRotation(ls,rotation);
 const saved=JSON.stringify(getCombatRotation(ls,"sacri"));
 assert.ok(!saved.includes("damage"));
 assert.ok(!saved.includes("buffs"));
 assert.equal(JSON.parse(saved).turns[0].actions.length,4);
});
