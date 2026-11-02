/**
 * Sacrieur HP/DPS sweep: starting HP is NOT the safety floor.
 * Evaluates the requested 30/40/60/70/80% HP with the same 12-AP
 * equipment and target, comparing Mutilation vs Pacte and fast vs long.
 * All numbers are deterministic estimates: no attacks from monsters,
 * no shields, and Pacte expiry remains a provisional model rule.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";

const sacri=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="sacri-air-pvm"));
assert.equal(sacri.ap,12,"Sacrier must start at 12 AP");
const pactIndex=CLASSES.sacrieur.pairs.findIndex(x=>x.includes("Pacte de Sang"));
assert.ok(pactIndex>=0);
const reference=Object.fromEntries(["Pacte de Sang","Mutilation"].map(name=>{
 const b=structuredClone(sacri);b.variants[pactIndex]=name;
 return [name,b];
}));
const points=[30,40,60,70,80];
const R=n=>Math.round((Number(n)||0)*10)/10;
const makeTarget=()=>cleanTeamTarget({
 hp:1_000_000_000_000,turns:10,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}
});
const setups=points.flatMap(pct=>[
 {pct,floor:10,kind:"aggressive"},
 {pct,floor:pct<50?20:50,kind:"safety"}
]);
function context(build,t,pct){
 const ctx=createTeamContext(build,t);
 ctx.settings.sacrierStartingHpPercent=pct;
 assert.equal(ctx.settings.ap,12);
 const initial=initialState(ctx.settings);
 assert.ok(Math.abs(initial.sacrierHealth.hp/initial.sacrierHealth.maxHp*100-pct)<.02);
 return ctx;
}
function verifyRound(previous,ctx,t,floor){
 const round=previous.turns.at(-1),actor=round.actors[0];
 assert.equal(round.number,t);
 assert.equal(previous.turns.length,t);
 assert.ok(Number.isFinite(actor.damage)&&actor.damage>=0);
 assert.ok(actor.spent<=actor.availablePA+0.01);
 assert.equal(actor.availablePA,12);
 const state=previous.session.actors[0].state;
 const safe=sacrierHealthAboveFloor(state,floor);
 if(!safe)console.log("SACRI_HP_UNSAFE "+JSON.stringify({
  turn:t,floor,currentPercent:R(state.sacrierHealth.hp/state.sacrierHealth.maxHp*100),
  spells:actor.actions.map(x=>x.name)
 }));
 assert.ok(actor.health?.maxHp>0);
 return {
  damage:actor.damage,
  hp:R(actor.health.hp/actor.health.maxHp*100),
  spells:actor.actions.map(x=>x.name),
  pa:actor.spent,safe
 };
}
function run({pct,floor,kind},variant,mode){
 const t=makeTarget(),ctx=context(reference[variant],t,pct);
 const policy={mode,horizon:10,effort:"deep",minHpPercent:floor};
 let previous=null,lowest=100,record=[];
 for(let n=1;n<=10;n++){
  previous=optimizeTeamTurn([ctx],t,()=>{},previous,policy);
  const summary=verifyRound(previous,ctx,n,floor);
  lowest=Math.min(lowest,summary.hp);
  record.push(summary);
  // A path below the selected PV floor is unsafe even if it inflicts
  // more damage. Do not let that path win the DPS ranking.
  if(!summary.safe)break;
 }
 const valid=record.length===10&&record.every(x=>x.safe);
 return {pct,floor,kind,variant,mode,valid,turnsPlayed:record.length,total:R(previous.theoretical),
  three:R(record.slice(0,3).reduce((n,x)=>n+x.damage,0)),
  lowestHp:lowest,opening:record[0].spells,turn2:record[1].spells,
  pactTurns:record.flatMap((r,i)=>r.spells.includes("Pacte de Sang")?[i+1]:[]),
  berserkTurns:record.flatMap((r,i)=>r.spells.includes("Berserk")?[i+1]:[]),
  path:record.map((r,i)=>({t:i+1,d:R(r.damage),hp:r.hp,s:r.spells}))};
}
const all=[],start=Date.now();
for(const setup of setups){
 for(const variant of ["Pacte de Sang","Mutilation"]){
  for(const mode of ["fast","long"]){
   try{
    const row=run(setup,variant,mode);
    all.push(row);
    console.log("SACRI_HP_CASE "+JSON.stringify({
     pct:row.pct,floor:row.floor,kind:row.kind,variant:row.variant,
     mode:row.mode,total:row.total,three:row.three,
     lowestHp:row.lowestHp,valid:row.valid,turnsPlayed:row.turnsPlayed,
     opening:row.opening,pactTurns:row.pactTurns,
     berserkTurns:row.berserkTurns
    }));
   }catch(e){
    console.log("SACRI_HP_ERROR "+JSON.stringify({...setup,variant,mode,error:String(e)}));
    throw e;
   }
  }
 }
}
for(const setup of setups){
 const group=all.filter(x=>x.pct===setup.pct&&x.floor===setup.floor);
 const ordered=group.slice().sort((a,b)=>Number(b.valid)-Number(a.valid)||b.total-a.total);
 console.log("SACRI_HP_COMPARE "+JSON.stringify({
  ...setup,ranking:ordered.map(({variant,mode,total,three,lowestHp,opening})=>
   ({variant,mode,total,three,lowestHp,opening,valid,turnsPlayed}))
 }));
}
console.log("SACRI_HP_SWEEP_FINAL "+JSON.stringify({
 count:all.length,elapsedSec:R((Date.now()-start)/1000),
 bestBySetup:setups.map(s=>all.filter(x=>x.pct===s.pct&&x.floor===s.floor)
  .filter(x=>x.valid).sort((a,b)=>b.total-a.total)[0]||null),
 note:"At each starting HP percent, compare four legal deterministic 10-turn plans with 12 AP and explicitly named HP safety floor. Not a proof of global optimum."
}));
