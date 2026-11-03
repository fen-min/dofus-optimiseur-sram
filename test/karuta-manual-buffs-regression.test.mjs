import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {newManualDraft,manualSpellChoices} from "../src/team-manual.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {KARUTA_FIFTEEN_ROUNDS} from "../src/karuta-fifteen-plan.js";

const round=n=>Math.round((Number(n)||0)*10)/10;
const cumulative=(result,n)=>round(result.turns.slice(0,n).reduce((sum,turn)=>
 sum+Number(turn.theoretical||0),0));
const target=cleanTeamTarget({turns:15,hp:1e12,criticals:true,
 resistances:{Air:0,Eau:0,Feu:0,Terre:0,Neutre:0}});
const build=normalizeBuild(INITIAL_BUILDS.find(x=>x.id==="ecaflip-karuta-eau"));
const ctx=createTeamContext(build,target);
const noStat=["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"];
const selected=s=>s.isWeapon||ctx.settings.variants?.[s.variantGroup]===s.name;
const legal=name=>{
 const sp=ctx.spells.find(s=>s.name===name);
 assert.ok(sp&&selected(sp)&&!sp.status?.unsupported,"Invalid simulated spell "+name);
 return String(sp.id);
};
const play=paths=>{
 let prev=null;
 for(const path of paths){
  prev=playSequentialTeam([ctx],target,()=>{},{previous:prev,oneRound:true,
   manualOverrides:{[ctx.build.id]:path.map(legal)}});
  assert.ok(prev.turns.at(-1).actors[0].spent<=12);
 }
 return prev;
};

test("Karuta manual: all 17 simulated actions and exactly 6 unsupported equipped spells identified",()=>{
 const spells=ctx.spells.filter(selected);
 const modeled=spells.filter(s=>!s.status?.unsupported&&
  (s.min>0||s.ecaflipRekop||s.playHand||s.playSuit||s.drawCard||
   s.status?.buff||s.ecaflipCriticalRateBuff||s.ecaflipCritDamageBuff||
   s.restoreTable||s.isWeapon));
 assert.equal(modeled.length,17);
 assert.equal(spells.filter(s=>!s.isWeapon&&s.status?.unsupported).length,6);
 assert.equal(ctx.settings.variants.length,22);
 const manual=manualSpellChoices([ctx],target,newManualDraft([ctx],target));
 for(const sp of modeled){
  const item=manual.find(c=>c.name===sp.name);
  assert.ok(item,"Modeled spell absent from manual mode: "+sp.name);
  assert.notEqual(item.equipped,false,"Equipped variant missing: "+sp.name);
  if(sp.name==="Rekop")assert.equal(item.enabled,false,
   "Rekop cannot be cast before a winning hand exists");
 }
 assert.ok(modeled.some(s=>s.name==="Griffe Invocatrice"&&s.nonDirect&&
  s.status?.buff?.stat==="Puissance"));
 assert.ok(modeled.some(s=>s.name==="Yams"&&s.ecaflipCriticalRateBuff));
 assert.ok(modeled.some(s=>s.name==="Kraps"&&s.ecaflipCritDamageBuff));
});

test("Karuta best-tested no-stat-buff manual path repeats legally and preserves passive gear",()=>{
 assert.equal(ctx.settings.dofusTurquoise,true,"Do not strip Turquoise to fake no-buff comparison");
 const names=new Set(noStat);
 for(const n of names){
  const s=ctx.spells.find(s=>s.name===n);
  assert.ok(s&&!s.status?.buff&&!s.ecaflipCriticalRateBuff&&
   !s.ecaflipCritDamageBuff&&!s.ecaflipCritResistanceShred&&
   !s.playSuit&&!s.playHand&&!s.restoreTable,
   "Spell "+n+" would add active stat buff");
 }
 const result=play(Array.from({length:15},()=>noStat));
 assert.equal(cumulative(result,1),3861.1);
 assert.equal(cumulative(result,3),11944.9);
 assert.equal(cumulative(result,10),40660.3);
 assert.equal(round(result.theoretical),61171.3);
});

test("Karuta 15-turn kitten-buffed manual champion correctly persists +90 Power",()=>{
 assert.equal(KARUTA_FIFTEEN_ROUNDS.length,15);
 assert.equal(KARUTA_FIFTEEN_ROUNDS[0][0],"Griffe Invocatrice");
 const result=play(KARUTA_FIFTEEN_ROUNDS);
 assert.equal(cumulative(result,3),11702.8);
 assert.equal(cumulative(result,10),44785.5);
 assert.equal(round(result.theoretical),68822.9);
 assert.equal(round(result.theoretical-67004.4),1818.5);
 assert.equal(result.session.actors[0].state.invocations.filter(x=>x.kind==="Chaton Enragé").length,1);
 assert.equal(result.session.actors[0].state.buffs.find(x=>x.key==="Griffe Invocatrice")?.amount,90);
});
