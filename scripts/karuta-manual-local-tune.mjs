/**
 * Manual Karuta local exhaustive 1-mutation search on the 15-round
 * audited trajectory and the strict no-stat-buff trajectory.
 *
 * Every modeled, equipped spell is tried as a replacement and insertion
 * in EVERY slot of EVERY round; also remove spells and permute their order.
 * Repeat until local convergence. A bounded local optimum, not global.
 * Winners are checked again via the real manual UI execution engine.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {KARUTA_FIFTEEN_ROUNDS} from "../src/karuta-fifteen-plan.js";
const mode=process.argv[2]||"ALL";
assert.ok(["ALL","NOSTAT","ALL_KITTENS"].includes(mode));
const R=x=>Math.round((Number(x)||0)*10)/10;
const target=cleanTeamTarget({turns:15,hp:1e12,criticals:true,
 resistances:{Eau:0,Air:0,Terre:0,Feu:0,Neutre:0}});
const build=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="ecaflip-karuta-eau"));
const ctx=createTeamContext(build,target);
const names=ctx.spells.filter(s=>(s.isWeapon||ctx.settings.variants?.[s.variantGroup]===s.name)&&
 !s.status?.unsupported&&(s.min>0||s.ecaflipRekop||s.playSuit||s.playHand||
 s.restoreTable||s.status?.buff||s.ecaflipCriticalRateBuff||
 s.ecaflipCritDamageBuff||s.drawCard||s.isWeapon));
const statBuff=sp=>!!(sp.status?.buff||sp.ecaflipCriticalRateBuff||
 sp.ecaflipCritDamageBuff||sp.ecaflipCritResistanceShred||
 sp.playSuit||sp.playHand||sp.restoreTable);
const spellNames=mode==="NOSTAT"?names.filter(x=>!statBuff(x)):names;
const spells=spellNames.map(sp=>String(sp.id));
const byId=new Map(ctx.spells.map(s=>[String(s.id),s]));
const convert=names=>names.map(n=>{
 const sp=ctx.spells.find(s=>s.name===n);
 assert.ok(sp,"Missing spell "+n);return String(sp.id);
});
const allRows=mode!=="NOSTAT"?KARUTA_FIFTEEN_ROUNDS.map(convert):
 Array.from({length:15},()=>convert(["Pile ou Face","Sceptre du Roi Joueur",
 "Sceptre du Roi Joueur","Infortune"]));
if(mode==="ALL_KITTENS"){
 for(const t of [1,5,9]){
  const row=allRows[t-1];
  const sword=ctx.spells.find(s=>s.name==="Sceptre du Roi Joueur").id;
  const griffe=ctx.spells.find(s=>s.name==="Griffe Invocatrice").id;
  const i=row.lastIndexOf(String(sword));
  assert.ok(i>=0,"No weapon cast at T"+t);
  row[i]=String(griffe);
 }
}
const key=path=>JSON.stringify(path);
const seen=new Set();
let candidates=0,valid=0,improvements=0;
function simulate(path){
 candidates++;
 let state=initialState(ctx.settings);
 try{
  for(const row of path){
   for(const id of row){
    const spell=byId.get(String(id));
    if(!spell||!spellNames.includes(spell)||!eligible(spell,state,ctx.settings))
     return null;
    state=castSpell(state,spell,ctx.settings);
   }
   state=endTurn(state,ctx.settings);
  }
  valid++;
  return {total:R(state.total),state};
 }catch(e){return null;}
}
function replay(path){
 let previous=null;
 for(const row of path){
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[ctx.build.id]:row}});
  assert.ok(previous.turns.at(-1).actors[0].spent<=12.01);
 }
 return previous;
}
function localMoves(path,t){
 const row=path[t],out=[];
 const add=part=>{
  const next=path.map((seq,i)=>i===t?part:seq);
  const serialized=key(next);
  if(!seen.has(serialized)){
   seen.add(serialized);
   out.push(next);
  }
 };
 for(let i=0;i<row.length;i++){
  add(row.filter((_,j)=>j!==i));
  for(const id of spells)if(row[i]!==id){
   const newRow=row.slice();newRow[i]=id;add(newRow);
  }
  for(let j=i+1;j<row.length;j++){
   const newRow=row.slice();[newRow[i],newRow[j]]=[newRow[j],newRow[i]];
   add(newRow);
  }
 }
 for(let i=0;i<=row.length;i++)for(const id of spells){
  const newRow=row.slice();newRow.splice(i,0,id);add(newRow);
 }
 return out;
}
let best={path:allRows,report:simulate(allRows)};
assert.ok(best.report,"Invalid initial 15-round route");
console.log("KARUTA_LOCAL_BASE "+JSON.stringify({
 mode,total:best.report.total,spells:spellNames.map(s=>s.name)
}));
const t0=Date.now(),bestForced=new Map();
for(let pass=1;pass<=30;pass++){
 let candidate=null;
 for(let turn=0;turn<15;turn++){
  for(const path of localMoves(best.path,turn)){
   const report=simulate(path);
   if(!report)continue;
   // Track best single mutation with any given modeled spell in any round.
   if(pass===1){
    const row=path[turn],old=best.path[turn];
    const increased=row.find((id,i)=>old[i]!==id);
    const moveName=byId.get(increased)?.name||null;
    if(moveName&&(!bestForced.has(moveName)||report.total>bestForced.get(moveName)))
     bestForced.set(moveName,report.total);
   }
   if(report.total>best.report.total+.05&&
     (!candidate||report.total>candidate.report.total))
    candidate={path,report,turn};
  }
 }
 if(!candidate)break;
 const previous=best.report.total;
 best=candidate;improvements++;
 console.log("KARUTA_LOCAL_IMPROVEMENT "+JSON.stringify({
  mode,pass,turn:best.turn+1,from:previous,to:best.report.total,
  rotation:best.path[best.turn].map(id=>byId.get(id)?.name)
 }));
}
const manual=replay(best.path);
assert.ok(Math.abs(manual.theoretical-best.report.total)<.2,
 "Manual replay differed "+manual.theoretical+" "+best.report.total);
console.log("KARUTA_LOCAL_FINAL "+JSON.stringify({
 mode,baseline:R(simulate(allRows).total),best:R(manual.theoretical),
 delta:R(manual.theoretical-simulate(allRows).total),
 rotations:best.path.map(row=>row.map(id=>byId.get(id)?.name)),
 byTurn:manual.turns.map(t=>t.actors[0].damage),
 initialSpellTests:spellNames.map(s=>({name:s.name,
  bestOneMutation:bestForced.get(s.name)??null})),
 tests:{candidates,valid,improvements,elapsedSec:R((Date.now()-t0)/1000)}
}));
