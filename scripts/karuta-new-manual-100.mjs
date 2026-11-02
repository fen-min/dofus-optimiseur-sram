/**
 * Karuta newly optimized 15-turn MANUAL rotation compared to existing
 * 100-turn long optimizer, then automatic continuation T16–T100.
 * No state edits: actual UI manualOverride replay for first 15 rounds.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {cleanTeamTarget,createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {KARUTA_FIFTEEN_ROUNDS} from "../src/karuta-fifteen-plan.js";
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Eau:0,Terre:0,Feu:0,Neutre:0}});
const ctx=createTeamContext(normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="ecaflip-karuta-eau")),target);
const strategy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const changed=[
 ["Yams","Griffe Joueuse","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
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
const mode=process.argv[2]||"NEW";
assert.ok(["NEW","OLD"].includes(mode));
const prelude=mode==="NEW"?changed:KARUTA_FIFTEEN_ROUNDS;
const R=n=>Math.round((Number(n)||0)*10)/10;
const ids=names=>names.map(name=>{
 const sp=ctx.spells.find(s=>s.name===name);
 assert.ok(sp&&(sp.isWeapon||ctx.settings.variants[sp.variantGroup]===sp.name),
  "Unknown or unequipped spell "+name);
 return String(sp.id);
});
let previous=null,checkpoints={},first15=[];
for(let n=1;n<=100;n++){
 if(n<=15){
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[ctx.build.id]:ids(prelude[n-1])}});
 }else{
  previous=optimizeTeamTurn([ctx],target,()=>{},previous,strategy);
 }
 const actor=previous.turns.at(-1).actors[0];
 assert.equal(actor.availablePA,12);
 assert.ok(actor.spent<=12);
 if(n<=15)first15.push(actor.actions.map(a=>a.name));
 if([1,3,10,15,16,30,50,75,100].includes(n))
  checkpoints[n]=R(previous.theoretical);
}
assert.deepEqual(first15,prelude);
assert.ok(mode!=="NEW"||Math.abs(checkpoints[15]-68290)<.2,
 "New 15-round champion expected 68290, found "+checkpoints[15]);
let manual=null;
for(const round of previous.turns){
 const actions=ids(round.actors[0].actions.map(a=>a.name));
 manual=playSequentialTeam([ctx],target,()=>{},{previous:manual,oneRound:true,
  manualOverrides:{[ctx.build.id]:actions}});
}
assert.equal(manual.turns.length,100);
assert.ok(Math.abs(previous.theoretical-manual.theoretical)<.2);
console.log("KARUTA_NEW_100_FINAL "+JSON.stringify({
 mode,damage100:R(previous.theoretical),avg:R(previous.theoretical/100),
 checkpoints,first15,manualReplayTotal:R(manual.theoretical),
 verified:true,note:"All opening spells manually replayed; dynamic rounds 16–100 independently checked by manual replay"
}));
