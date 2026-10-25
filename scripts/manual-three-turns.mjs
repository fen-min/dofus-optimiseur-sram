import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {playSequentialTeam} from "../src/team-sequential.js";

const target=cleanTeamTarget({turns:3,hp:1_000_000_000_000,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const contexts=INITIAL_BUILDS.map(b=>createTeamContext(b,target));
const inOrder=contexts.slice().sort((a,b)=>(b.build.initiative??-1)-(a.build.initiative??-1));
const round=n=>Math.round(n*10)/10;
function eligibleSpells(ctx,allowPrep){
 return ctx.spells.filter(s=>(s.isWeapon||ctx.settings.variants[s.variantGroup]===s.name)&&
  !s.status?.unsupported&&(allowPrep||!(s.nonDirect&&(s.status?.buff||s.playHand||s.restoreTable))));
}
function signature(s){
 return JSON.stringify([s.turn,s.pa,s.used,s.ready,s.buffs.map(b=>[b.key,b.amount,b.until]),
  s.ecaHand,s.ecaTable,s.charges,s.mutilationStage,s.berserkActive,s.sacrierHealth?.hp,
  s.invocations,s.dots,s.turquoiseProcs,s.enemyCriticalShreds,s.visible,s.position]);
}
function future(s,weight){
 const remain=Math.max(0,3-s.turn);
 if(!remain||!weight)return 0;
 let value=0;
 for(const buff of s.buffs||[]){
  if(buff.until<s.turn)continue;
  const life=Math.min(remain,buff.until-s.turn+1);
  if(["Puissance","Air","Terre","Feu","Eau","Neutre"].includes(buff.stat))value+=Math.max(0,buff.amount)*life*.85;
  else if(buff.stat==="Dommages finaux")value+=Math.max(0,buff.amount)*life*12;
  else if(buff.stat==="Critique")value+=Math.max(0,buff.amount)*life*5;
  else if(buff.stat==="Dommages"||buff.stat==="Dommages Critiques")value+=Math.max(0,buff.amount)*life*3;
 }
 if(s.ecaHand?.length)value+=s.ecaHand.length*30;
 if(s.ecaTable?.length)value+=s.ecaTable.length*13;
 return weight*value;
}
function keepBest(items,limit,score){
 const unique=new Map();
 for(const item of items){
  const key=signature(item.state);
  const old=unique.get(key);
  if(!old||score(item)>score(old))unique.set(key,item);
 }
 return [...unique.values()].sort((a,b)=>score(b)-score(a)).slice(0,limit);
}
function possibleTurn(seed,spells,weight,depthLimit=9){
 let frontier=[{state:seed.state,seq:[]}],finals=[];
 const width=spells.length>18?55:65;
 for(let depth=0;depth<=depthLimit;depth++){
  finals.push(...frontier);
  if(depth===depthLimit)break;
  const next=[];
  for(const item of frontier)for(const spell of spells){
   if(!eligible(spell,item.state,seed.ctx.settings))continue;
   try{
    const after=castSpell(item.state,spell,seed.ctx.settings);
    next.push({state:after,seq:[...item.seq,String(spell.id)]});
   }catch{}
  }
  if(!next.length)break;
  frontier=keepBest(next,width,item=>item.state.total+future(item.state,weight));
 }
 const done=keepBest(finals,16,item=>item.state.total+future(item.state,weight));
 return done.map(item=>({
  state:endTurn(item.state,seed.ctx.settings),
  rotations:[...seed.rotations,item.seq],
  ctx:seed.ctx
 }));
}
function findPlan(ctx,allowPrep,weight){
 const spells=eligibleSpells(ctx,allowPrep);
 let states=[{ctx,state:initialState(ctx.settings),rotations:[]}];
 for(let turn=1;turn<=3;turn++){
  let generated=[];
  for(const state of states){
   assert.equal(state.state.turn,turn);
   generated.push(...possibleTurn(state,spells,weight,ctx.settings.classId==="ecaflip"?9:8));
  }
  states=keepBest(generated,turn===3?1:9,item=>item.state.total+future(item.state,weight));
  if(!states.length)throw Error("Aucune rotation au tour "+turn+" pour "+ctx.build.character);
 }
 return states[0];
}
function replay(planById){
 let previous=null;
 for(let t=0;t<3;t++){
  const actions=Object.fromEntries(contexts.map(ctx=>[
   ctx.build.id,(planById[ctx.build.id]||[])[t]||[]
  ]));
  previous=playSequentialTeam(contexts,target,()=>{},{previous,oneRound:true,manualOverrides:actions});
 }
 assert.equal(previous.turns.length,3);
 for(const t of previous.turns)for(const actor of t.actors){
  assert.ok(actor.spent<=actor.availablePA+0.001,actor.character+" dépense trop de PA");
  assert.ok(actor.damage>=0);
 }
 return previous;
}
const plans={};
for(const ctx of inOrder){
 const name=ctx.build.character;
 plans[ctx.build.id]={};
 for(const allowPrep of [false,true]){
  let best=null;
  for(const weight of [0,1,3.5]){
   const candidate=findPlan(ctx,allowPrep,weight);
   if(!best||candidate.state.total>best.state.total)best=candidate;
  }
  plans[ctx.build.id][allowPrep?"avec":"sans"]=best;
  console.log("PERSONNAGE "+JSON.stringify({name,prep:allowPrep?"avec":"sans",solo3t:round(best.state.total),
    tours:best.rotations.map(ids=>ids.map(id=>ctx.spells.find(s=>String(s.id)===id)?.name||id))}));
 }
}
const scenarios=[];
for(let mask=0;mask<8;mask++){
 const configurations=Object.fromEntries(inOrder.map((ctx,index)=>[
  ctx.build.id,plans[ctx.build.id][mask&(1<<index)?"avec":"sans"].rotations
 ]));
 try{
  const result=replay(configurations);
  scenarios.push({mask,damage:result.theoretical,result});
  console.log("COMBINAISON "+JSON.stringify({mask,teamDamage:result.theoretical,
   perRound:result.turns.map(t=>round(t.theoretical)),
   actors:result.members.map(m=>({name:m.character,damage:m.estimated}))}));
 }catch(error){console.log("COMBINAISON_INVALIDE "+mask+" "+error.message);}
}
assert.ok(scenarios.length>0,"Aucune rotation manuelle valide");
scenarios.sort((a,b)=>b.damage-a.damage);
const best=scenarios[0],without=scenarios.find(s=>s.mask===0),withAll=scenarios.find(s=>s.mask===7);
assert.ok(without&&withAll,"Comparaisons avec et sans buffs obligatoires");
let auto=null;
for(let turn=1;turn<=3;turn++)auto=optimizeTeamTurn(contexts,target,()=>{},auto);
assert.equal(auto.turns.length,3);
const report={
 profile:"INITIAL_BUILDS, 12 PA/personnage, 3 tours, 0% resistances, critiques actifs",
 searches:"Beam search 3 coefficients d'anticipation, 8 à 9 actions par tour, 55 à 65 états intermédiaires",
 auto:{total:auto.theoretical,rounds:auto.turns.map(t=>round(t.theoretical)),
  rotations:auto.turns.map(t=>t.actors.map(a=>({personnage:a.character,sorts:a.actions.map(s=>s.name),damage:a.damage})))},
 sansBuffPrep:{total:without.damage,rounds:without.result.turns.map(t=>round(t.theoretical))},
 tousBuffsAutorises:{total:withAll.damage,rounds:withAll.result.turns.map(t=>round(t.theoretical))},
 meilleurMelange:{total:best.damage,mask:best.mask,
  choix:inOrder.map((ctx,i)=>({personnage:ctx.build.character,preparation:!!(best.mask&(1<<i))})),
  rounds:best.result.turns.map(t=>round(t.theoretical)),
  rotations:best.result.turns.map(t=>t.actors.map(a=>({
   personnage:a.character,sorts:a.actions.map(s=>s.name),damage:a.damage,spent:a.spent,pa:a.availablePA})))},
 scenarios:scenarios.map(x=>({mask:x.mask,total:x.damage}))
};

// Cross-check the automatic rotation through exactly the same MANUAL replay
// and combine candidate actions independently for each actor on each round.
// This tests legal mixed rotations that whole-character comparisons miss.
const autoPlanById=Object.fromEntries(inOrder.map(ctx=>[
 ctx.build.id,auto.turns.map(turn=>{
  const actor=turn.actors.find(a=>a.id===ctx.build.id);
  return actor.actions.map(action=>{
   const spell=ctx.spells.find(sp=>sp.name===action.name);
   assert.ok(spell,"Sort auto absent de la sélection : "+action.name);
   return String(spell.id);
  });
 })
]));
const replayAuto=replay(autoPlanById);
assert.ok(Math.abs(replayAuto.theoretical-auto.theoretical)<.2,
 "La lecture manuelle doit reproduire les dégâts automatiques : "+replayAuto.theoretical+" vs "+auto.theoretical);
const slots=[];
for(let t=0;t<3;t++)for(const ctx of inOrder){
 const id=ctx.build.id;
 const variants=[plans[id].sans.rotations[t],plans[id].avec.rotations[t],autoPlanById[id][t]];
 const distinct=[...new Map(variants.map(x=>[JSON.stringify(x),x])).values()];
 slots.push({id,turn:t,variants:distinct});
}
let checked=0,valid=0,bestByRound=null;
const selected=Object.fromEntries(inOrder.map(ctx=>[ctx.build.id,[[],[],[]]]));
function compareRoundChoices(index){
 if(index===slots.length){
  checked++;
  try{
   const trial=replay(selected);
   valid++;
   if(!bestByRound||trial.theoretical>bestByRound.result.theoretical){
    bestByRound={result:trial,
     chosen:Object.fromEntries(Object.entries(selected).map(([id,v])=>[id,v.map(x=>x.slice())]))};
   }
  }catch{}
  return;
 }
 const slot=slots[index];
 for(const option of slot.variants){
  selected[slot.id][slot.turn]=option;
  compareRoundChoices(index+1);
 }
}
compareRoundChoices(0);
assert.ok(bestByRound,"Aucun mélange inter-tours disponible");
report.combinaisonsParTour={
 totalTeste:checked,valides:valid,total:bestByRound.result.theoretical,
 rounds:bestByRound.result.turns.map(t=>round(t.theoretical)),
 rotations:bestByRound.result.turns.map(t=>t.actors.map(a=>({
  personnage:a.character,sorts:a.actions.map(sp=>sp.name),
  damage:a.damage,spent:a.spent,pa:a.availablePA
 })))
};
console.log("RECHERCHE_PAR_TOUR "+JSON.stringify(report.combinaisonsParTour));

console.log("RESULTAT_FINAL "+JSON.stringify(report));
