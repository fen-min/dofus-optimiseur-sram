import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
const target={hp:1_000_000_000_000,turns:12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}};
const sram=INITIAL_BUILDS.find(b=>b.classId==="sram");
const sacri=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const pactGroup=SACRIER_VARIANTS.findIndex(p=>p.includes("Pacte de Sang"));
function withPact(){
 return {...sacri,variants:sacri.variants.map((name,i)=>i===pactGroup?"Pacte de Sang":name)};
}
test("diagnostic: equipped Pacte de Sang with Sram Manigance, 12 turns, no skipped team buffs",()=>{
 const contexts=[createTeamContext(withPact(),target),createTeamContext(sram,target)];
 assert.equal(contexts[0].settings.variants[pactGroup],"Pacte de Sang");
 let previous=null;
 const history=[];
 for(let i=1;i<=12;i++){
  previous=optimizeTeamTurn(contexts,target,()=>{},previous);
  const sac=previous.turns.at(-1).actors.find(a=>a.id===sacri.id);
  const sra=previous.turns.at(-1).actors.find(a=>a.id===sram.id);
  const savedSac=previous.session.actors.find(a=>a.id===sacri.id).state;
  const savedSram=previous.session.actors.find(a=>a.id===sram.id).state;
  history.push({turn:i,sacri:sac.actions.map(a=>a.name),sram:sra.actions.map(a=>a.name),
   pact: savedSac.buffs.filter(b=>b.key.includes("Pacte de Sang")).map(b=>({key:b.key,until:b.until})),
   manigance:savedSram.buffs.filter(b=>b.key==="Manigance").map(b=>({until:b.until}))});
 }
 console.log("PACTE SRAM DIAGNOSTIC",JSON.stringify(history));
 assert.ok(history[0].sacri.includes("Pacte de Sang"),"Sacrieur should start with Pacte de Sang if selected");
 assert.ok(history[0].sram.includes("Manigance"),"Sram should start with Manigance if selected");
 for(let t=1;t<=12;t++){
  if([1,4,7,10].includes(t)){
   assert.ok(history[t-1].sacri.includes("Pacte de Sang"),"Pacte refresh at "+t);
   assert.ok(history[t-1].sram.includes("Manigance"),"Manigance refresh at "+t);
  }
 }
});
