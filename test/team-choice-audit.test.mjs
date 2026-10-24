import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn,cleanSettings} from "../src/engine.js";

const sram=INITIAL_BUILDS.find(b=>b.classId==="sram");
const sacri=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const target={hp:1_000_000_000_000,turns:50,criticals:false,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}};
const small=(ctx,chosen,options={})=>{
 const original=ctx.spells.find(s=>s.name===chosen);
 assert.ok(original,chosen+" not found");
 return {...original,pa:options.pa??3,minRange:0,range:20,lineOnly:false,los:false,
  nonDirect:options.nonDirect??false,target:"enemy",isTrap:false,
  maxPerTurn:options.limit??10,perTarget:options.limit??10,cooldown:0,
  element:"Air",min:options.damage??100,max:options.damage??100,
  critMin:options.damage??100,critMax:options.damage??100,
  baseDamage:0,critChance:0,status:options.status||{}};
};
function context(id,initiative,ap,spells){
 const build={...sram,id,character:id,stats:{...sram.stats,initiative},weapon:null,distance:1};
 const c=createTeamContext(build,target,{ap});
 return {...c,spells:spells(c)};
}
function oracle(ctx){
 const settings=cleanSettings({...ctx.settings,turns:1,beamWidth:8});
 const spells=ctx.spells,begin=initialState(settings);
 let best=-Infinity;
 const trace=(state)=>{
  const ended=endTurn(state,settings);
  best=Math.max(best,ended.total);
  for(const spell of spells){
   if(!eligible(spell,state,settings))continue;
   trace(castSpell(state,spell,settings));
  }
 };
 trace(begin);
 return Math.round(best*10)/10;
}

test("petites rotations sans buff : le DPS choisi doit égaler la meilleure séquence brute",()=>{
 const setups=[
  [[2,90],[3,142],[4,196]],
  [[2,91],[3,200],[5,351]],
  [[3,210],[4,285],[5,390]]
 ];
 for(const config of setups){
  const c=context("oracle-"+config[0][1],2000,10,ctx=>
   ["Arnaque","Épidémie","Fourvoiement"].map((name,i)=>
    small(ctx,name,{pa:config[i][0],damage:config[i][1],limit:4})));
  const optimized=optimizeTeamTurn([c],target);
  const actual=optimized.turns[0].actors[0].damage;
  const expected=oracle(c);
  assert.ok(Math.abs(actual-expected)<.11,
   "PA 10, spells "+JSON.stringify(config)+": team chose "+actual+" but brute force "+expected);
 }
});

test("une vulnérabilité alliée très rentable doit être préférée aux attaques personnelles",()=>{
 const first=context("support",3000,6,ctx=>[
  small(ctx,"Arnaque",{pa:3,damage:100,limit:2}),
  small(ctx,"Coupe-gorge",{pa:2,damage:0,limit:1,nonDirect:true,
   status:{vulnerability:1.5,vulnerabilityTurns:1}})
 ]);
 const second=context("heavy",1000,6,ctx=>[
  small(ctx,"Arnaque",{pa:3,damage:1000,limit:2})
 ]);
 const result=optimizeTeamTurn([first,second],target);
 const firstNames=result.turns[0].actors[0].actions.map(a=>a.name);
 const firstDamage=result.turns[0].actors[0].damage;
 const secondDamage=result.turns[0].actors[1].damage;
 assert.ok(firstNames.includes("Coupe-gorge"),
  "Pour l'équipe un buff cible +50 % augmente les dégâts alliés ; choix actuel : "+firstNames.join(", "));
 assert.ok(secondDamage>2000,"Le second doit profiter de la vulnérabilité");
 assert.ok(firstDamage+secondDamage>2200,"Les dégâts totaux doivent dépasser les 2200 sans support");
});

test("équipe réelle Sacrieur/Sram: un clic, ordre d'initiative, PA légaux et dégâts cumulés exacts",()=>{
 const contexts=[createTeamContext(sram,target),createTeamContext(sacri,target)];
 let previous=null;
 for(let turn=1;turn<=5;turn++){
  previous=optimizeTeamTurn(contexts,target,()=>{},previous);
  assert.equal(previous.turns.length,turn);
  const actors=previous.turns[turn-1].actors;
  assert.deepEqual(actors.map(x=>x.id),[sacri.id,sram.id]);
  for(const actor of actors){
   assert.ok(actor.spent>=0&&actor.spent<=actor.availablePA,
    "PA dépassés au tour "+turn+" pour "+actor.character);
   assert.ok(Number.isFinite(actor.damage)&&actor.damage>=0);
  }
  const sum=Math.round(previous.turns.reduce((acc,round)=>acc+
   round.actors.reduce((total,actor)=>total+actor.damage,0),0)*10)/10;
  assert.ok(Math.abs(previous.theoretical-sum)<.25);
 }
});
