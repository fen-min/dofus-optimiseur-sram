/**
 * Pacte de Sang: 100-round candidate tournament at starting 30/40/60/70/80% HP.
 * Compare the exact same canonical 12 PA equipped build, 10-turn lookahead,
 * and one-target 0% resistance scenario. Forced opening spells are replayed
 * through the independent manual engine, then true automatic optimization
 * resumes. No forced casts of unlearned variants or fabricated damage.
 *
 * The HP floor is a user-selectable viability limit, not equal to initial HP.
 * Results are only valid if all 100 ends and intermediate casts remain safe.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
const R=n=>Math.round((Number(n)||0)*10)/10;
const base=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="sacri-air-pvm"));
const slot=CLASSES.sacrieur.pairs.findIndex(p=>p.includes("Pacte de Sang"));
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const F=["Furie","Furie","Assaut","Désolation"];
const P=["Pacte de Sang","Furie","Furie","Assaut","Assaut"];
const A=["Furie","Furie","Fulgurance","Assaut"];
const D=["Furie","Furie","Désolation","Assaut"];
const E=["Furie","Assaut","Désolation","Furie"];
const HP={
 30:{floor:20,beam:[D,F,F]},
 40:{floor:20,beam:[F,F,F]},
 60:{floor:50,beam:[A,F,F]},
 70:{floor:50,beam:[A,F,F]},
 80:{floor:50,beam:[P,E,F]}
};
const setups=pct=>{
 const b=HP[pct].beam;
 return [
  {label:"auto",first:[]},
  {label:"beam_t1",first:b.slice(0,1)},
  {label:"beam_t1-2",first:b.slice(0,2)},
  {label:"beam_t1-3",first:b},
  {label:"pact_t1",first:[P]},
  {label:"pact_t1_attack_t2",first:[P,F]},
  {label:"pact_t2",first:[D,P]},
  {label:"pact_t2_assault",first:[F,P]},
  {label:"pact_t3",first:[D,F,P]}
 ];
};
function context(pct){
 const b=structuredClone(base);b.variants[slot]="Pacte de Sang";
 return createTeamContext(b,target,{ap:12,startHpPercent:pct});
}
function run(pct,setup){
 const c=context(pct),floor=HP[pct].floor,policy={mode:"long",horizon:10,minHpPercent:floor};
 const records={},spells=[],first=[],minHp=100;
 let previous=null,valid=true,reason="",at=0;
 for(let t=1;t<=100;t++){
  try{
   if(t<=setup.first.length){
    const names=setup.first[t-1];
    const ids=names.map(name=>{
     const spell=c.spells.find(s=>s.name===name);
     assert.ok(spell,"Unknown equipped spell "+name);return String(spell.id);
    });
    previous=playSequentialTeam([c],target,()=>{},{previous,oneRound:true,
     manualOverrides:{[c.build.id]:ids},teamStrategy:policy});
   }else previous=optimizeTeamTurn([c],target,()=>{},previous,policy);
  }catch(e){
   valid=false;reason="illegal action: "+String(e.message||e).slice(0,160);break;
  }
  at=t;
  const actor=previous.turns.at(-1).actors[0];
  if(actor.spent>actor.availablePA+.001||actor.availablePA!==12){
   valid=false;reason="PA violation";break;
  }
  if(t<=3)first.push(actor.actions.map(s=>s.name));
  const state=previous.session.actors[0].state;
  const hp=100*state.sacrierHealth.hp/state.sacrierHealth.maxHp;
  minHp=Math.min(minHp,hp);
  if(!sacrierHealthAboveFloor(state,floor)){
   valid=false;reason="unsafe HP "+R(hp)+"% at T"+t;break;
  }
  if([3,10,15,30,50,75,100].includes(t))records[t]=R(previous.theoretical);
 }
 return {pct,floor,label:setup.label,valid,at,reason,
  total:R(previous?.theoretical||0),minHp:R(minHp),
  miles:records,first};
}
const t0=Date.now(),rows=[];
for(const pct of [30,40,60,70,80]){
 for(const setup of setups(pct)){
  const row=run(pct,setup);rows.push(row);
  console.log("PACTE_100_CASE "+JSON.stringify(row));
 }
 const ranked=rows.filter(x=>x.pct===pct&&x.valid).sort((a,b)=>b.total-a.total);
 console.log("PACTE_100_BEST "+JSON.stringify({pct,
  best:ranked.slice(0,4),baseline:rows.find(x=>x.pct===pct&&x.label==="auto")}));
}
console.log("PACTE_100_FINAL "+JSON.stringify({cases:rows.length,
 durationSec:R((Date.now()-t0)/1000),best:[30,40,60,70,80].map(pct=>
  rows.filter(x=>x.pct===pct&&x.valid).sort((a,b)=>b.total-a.total)[0])}));
