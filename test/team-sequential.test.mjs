import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeam} from "../src/team-core.js";

const sacrier=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const sram=INITIAL_BUILDS.find(b=>b.classId==="sram");
function actor(build,target,spellName,id=build.id,initiative=build.stats.initiative){
 const context=createTeamContext({...build,id,stats:{...build.stats,initiative}},target);
 const spell=context.spells.find(s=>s.name===spellName);
 assert.ok(spell,"Sort attendu : "+spellName);
 return {...context,spells:[spell]};
}
test("les tours sont joués par ordre d'initiative et les PV restants sont transmis",()=>{
 const target={turns:2,hp:1000000};
 // Deliberately pass Sram first; initiative must still select the Sacrieur.
 const result=optimizeTeam([
  actor(sram,target,"Arnaque"),
  actor(sacrier,target,"Assaut")
 ],target);
 assert.equal(result.turns.length,2);
 for(const round of result.turns){
  assert.deepEqual(round.actors.map(a=>a.character),[sacrier.character,sram.character]);
  assert.ok(round.actors[0].remainingHp>=round.actors[1].remainingHp);
  assert.ok(round.actors.every(a=>a.spent<=12));
 }
 assert.equal(result.turns[1].roundStartHp,result.turns[0].remainingHp);
 assert.equal(result.theoretical,Math.round(result.members.reduce((sum,m)=>sum+m.estimated,0)*10)/10);
});

test("la mort de la cible coupe les sorts et les tours suivants",()=>{
 const target={turns:50,hp:100};
 const result=optimizeTeam([
  actor(sram,target,"Arnaque"),
  actor(sacrier,target,"Assaut")
 ],target);
 assert.equal(result.turns.length,1);
 assert.equal(result.effective,100);
 assert.equal(result.turns[0].actors[1].actions.length,0);
 assert.equal(result.turns[0].remainingHp,0);
});

test("une vulnérabilité placée par le premier personnage augmente les dégâts du second",()=>{
 const target={turns:1,hp:1000000};
 const first=actor(sacrier,target,"Assaut","leader",3000);
 const second=actor(sacrier,target,"Assaut","follower",2000);
 const ordinary=optimizeTeam([first,second],target);
 const withDebuff=optimizeTeam([
  {...first,spells:first.spells.map(s=>({...s,status:{...s.status,
   vulnerability:1.5,vulnerabilityTurns:2}}))},
  second
 ],target);
 assert.ok(withDebuff.turns[0].actors[1].damage>ordinary.turns[0].actors[1].damage);
});

test("les décisions suivantes continuent à utiliser l'état du tour antérieur",()=>{
 const target={turns:3,hp:1000000};
 const actorContext=actor(sacrier,target,"Assaut");
 const events=[];
 const result=optimizeTeam([actorContext],target,p=>events.push([p.turn,p.character]));
 assert.deepEqual(events,[[1,sacrier.character],[2,sacrier.character],[3,sacrier.character]]);
 assert.equal(result.turns.length,3);
 assert.equal(result.members[0].strategiesTested>=3,true);
 assert.ok(result.turns[2].actors[0].damage>0);
});
