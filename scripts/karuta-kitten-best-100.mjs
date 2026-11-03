/**
 * Re-evaluate best 15-turn manual opening after correcting persistent kitten
 * power. Compare early T5 and T9 summons (front vs end of a turn).
 * Then let the actual automatic engine play T16-100, independently replay
 * every automatic action in MANUAL mode.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
const mode=process.argv[2]||"SHORT";
assert.ok(["SHORT","TWO_FIRST","THREE_LATE","THREE_FIRST"].includes(mode));
const original=[
 ["Griffe Invocatrice","Yams","Griffe Joueuse","Sceptre du Roi Joueur"],
 ["Kraps","Infortune","Pile ou Face","Pile ou Face","Yams"],
 ["Tout ou Rien","Sceptre du Roi Joueur","Rekop","Yams"],
 ["Griffe Joueuse","Kraps","Infortune"],
 ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Kraps","Baraka","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
 ["Kraps","Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"],
 ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"],
 ["Griffe Joueuse","Kraps","Infortune"],
 ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
 ["Yams","Pile ou Face","Pile ou Face","Yams","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Kraps","Kraps","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"]
];
const planned=original.map(x=>x.slice());
for(const t of mode==="SHORT"?[]:mode==="TWO_FIRST"?[5]:[5,9]){
 const row=planned[t-1],i=row.lastIndexOf("Sceptre du Roi Joueur");
 assert.ok(i>=0,"Need a weapon action to replace T"+t);
 row.splice(i,1);
 if(mode==="THREE_LATE")row.push("Griffe Invocatrice");
 else if(mode==="THREE_FIRST"&&t===9){
  // Pile ou Face refunds PA AFTER paying its 2 PA cost. Both first.
  // Starting with kitten+Kraps+Griffe Joueuse leaves only 1 PA,
  // insufficient to legally cast the next Pile or Face.
  planned[t-1]=["Pile ou Face","Pile ou Face","Griffe Invocatrice",
   "Kraps","Griffe Joueuse"];
 }else row.unshift("Griffe Invocatrice");
}
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Eau:0,Terre:0,Feu:0,Neutre:0}});
const b=normalizeBuild(INITIAL_BUILDS.find(x=>x.id==="ecaflip-karuta-eau"));
const c=createTeamContext(b,target),id=c.build.id;
const strategy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const R=n=>Math.round((Number(n)||0)*10)/10;
const ids=names=>names.map(name=>{
 const spell=c.spells.find(s=>s.name===name);
 assert.ok(spell&&(spell.isWeapon||c.settings.variants?.[spell.variantGroup]===spell.name),
  "Invalid equipped spell "+name);
 return String(spell.id);
});
let previous=null;const checkpoints={},catCounts={},buffs={};
for(let turn=1;turn<=100;turn++){
 if(turn<=15)previous=playSequentialTeam([c],target,()=>{},{previous,oneRound:true,
  manualOverrides:{[id]:ids(planned[turn-1])}});
 else previous=optimizeTeamTurn([c],target,()=>{},previous,strategy);
 const actor=previous.turns.at(-1).actors[0];
 assert.ok(actor.spent<=12+.0001&&actor.availablePA===12,"PA budget T"+turn);
 const state=previous.session.actors[0].state;
 const count=state.invocations.filter(s=>s.kind==="Chaton Enragé").length;
 const power=state.buffs.filter(b=>b.key==="Griffe Invocatrice")
  .reduce((s,b)=>s+b.amount,0);
 assert.ok(count<=6&&power===90*Math.min(3,count));
 if([1,3,5,9,10,15,20,30,50,75,100].includes(turn)){
  checkpoints[turn]=R(previous.theoretical);
  buffs[turn]=power;catCounts[turn]=count;
 }
}
let manual=null;
for(const r of previous.turns){
 manual=playSequentialTeam([c],target,()=>{},{previous:manual,oneRound:true,
  manualOverrides:{[id]:ids(r.actors[0].actions.map(a=>a.name))}});
}
assert.equal(manual.turns.length,100);
assert.ok(Math.abs(manual.theoretical-previous.theoretical)<.2);
console.log("KARUTA_KITTEN_BEST_100 "+JSON.stringify({
 mode,total:R(previous.theoretical),average:R(previous.theoretical/100),
 checkpoints,buffs,catCounts,first15:planned,
 replay:R(manual.theoretical),
 note:"No kitten damage or enemy AI; only passive up to +270 Power."
}));
