import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {cumulativeDamageStandings,renderDamageLeaderboard,updateDamageLeaderboard} from "../src/team-dps-board.js";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn} from "../src/team-core.js";

const fmt=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(n||0);
const safe=s=>String(s??"").replace(/[&<>"']/g,"");
const sample={
 members:[{id:"sacri",character:"Sacrieur"},{id:"sram",character:"Sram"}],
 turns:[
  {number:1,actors:[{id:"sacri",damage:100},{id:"sram",damage:80}]},
  {number:2,actors:[{id:"sacri",damage:20},{id:"sram",damage:110}]},
  {number:3,actors:[{id:"sacri",damage:150},{id:"sram",damage:10}]}
 ]
};
test("classement cumulé : un Sram peut dépasser le Sacrieur au tour 2",()=>{
 const first=cumulativeDamageStandings(sample,1);
 assert.deepEqual(first.map(x=>[x.character,x.total]),[["Sacrieur",100],["Sram",80]]);
 const second=cumulativeDamageStandings(sample,2);
 assert.deepEqual(second.map(x=>[x.character,x.total]),[["Sram",190],["Sacrieur",120]]);
 assert.equal(second[0].turnDamage,110);
 const third=cumulativeDamageStandings(sample,3);
 assert.deepEqual(third.map(x=>[x.character,x.total]),[["Sacrieur",270],["Sram",200]]);
 assert.deepEqual(first.map(x=>x.total),[100,80],"L'historique doit rester stable");
});
test("la zone bleue affiche uniquement les scores par personnage et les progressions du tour",()=>{
 const html=renderDamageLeaderboard(sample,2,{safe,fmt});
 assert.ok(html.indexOf("Sram")<html.indexOf("Sacrieur"));
 assert.match(html,/190/);
 assert.match(html,/Tour 2 : \+110/);
 assert.match(html,/team-dps-track/);
 assert.doesNotMatch(html,/PV de la cible|Dégâts limités aux PV|Excès de dégâts/);
});
test("le tableau est correct même sans API d'animation, le rendu reste accessible",()=>{
 const node={innerHTML:""};
 updateDamageLeaderboard(node,sample,2,{safe,fmt});
 assert.match(node.innerHTML,/data-dps-rank="1"/);
 assert.match(node.innerHTML,/data-dps-id="sram"/);
 assert.ok(node.innerHTML.includes("dégâts cumulés"));
});
test("l'interface ne référence plus de champ ou affichage de PV de cible",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/team-ui.js",import.meta.url),"utf8");
 assert.doesNotMatch(html,/id="team-hp"|PV de la cible|CIBLE \/ DPS/);
 assert.doesNotMatch(js,/\$\("team-hp"\)|team-target-life| · cible /);
});
test("la cible virtuelle ne coupe pas le classement au bout de quelques tours",()=>{
 const config={hp:1_000_000_000_000,turns:50};
 const build=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
 const context=createTeamContext(build,config);
 const assaut=context.spells.find(s=>s.name==="Assaut");
 const ctx={...context,spells:[assaut]};
 let previous=null;
 for(let round=1;round<=4;round++){
  previous=optimizeTeamTurn([ctx],config,()=>{},previous);
  assert.equal(previous.turns.length,round);
  assert.equal(previous.finished,false);
 }
 const ranking=cumulativeDamageStandings(previous,4);
 assert.equal(ranking.length,1);
 assert.ok(ranking[0].total>0);
});
