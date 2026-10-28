import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {combatCastLog,combatReportText,renderCombatLog,combatEndLog} from "../src/team-combat-log.js";

const r=n=>Math.round((Number(n)||0)*10)/10;
const t=cleanTeamTarget({hp:1e12,turns:10,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const builds=INITIAL_BUILDS.map(b=>normalizeBuild(b));
const contexts=builds.map(b=>createTeamContext(b,t));
const choose=(ctx,spell)=>{
 const s=ctx.spells.find(s=>s.name===spell);
 assert.ok(s,spell);return String(s.id);
};

test("Journal: chaque lancer capture son coût, ses dégâts immédiats et les effets sans les inventer",()=>{
 const sram=contexts.find(c=>c.build.classId==="sram");
 const sacri=contexts.find(c=>c.build.classId==="sacrieur");
 const eca=contexts.find(c=>c.build.classId==="ecaflip");
 const overrides={
  [sram.build.id]:["Manigance","Arnaque","Arnaque","Épidémie"].map(n=>choose(sram,n)),
  [sacri.build.id]:["Pacte de Sang","Furie","Furie","Assaut"].map(n=>choose(sacri,n)),
  [eca.build.id]:["Yams","Yams","Griffe Joueuse","Sceptre du Roi Joueur"].map(n=>choose(eca,n))
 };
 const original=structuredClone(contexts);
 const first=playSequentialTeam(contexts,t,()=>{},{oneRound:true,manualOverrides:overrides});
 assert.equal(first.turns.length,1);
 assert.equal(first.turns[0].actors.length,3);
 for(const actor of first.turns[0].actors){
  assert.equal(actor.log.casts.length,actor.actions.length);
  const immediate=r(actor.log.casts.reduce((sum,c)=>sum+c.damage,0));
  assert.ok(Math.abs(immediate-actor.direct)<.11,actor.character+": directs");
  assert.ok(Math.abs(actor.log.end.delayed-actor.poison)<.11,actor.character+": différés");
  assert.ok(Math.abs(r(actor.direct+actor.poison)-actor.damage)<.11);
  assert.ok(actor.log.casts.every(c=>c.pa>=0&&c.remainingPA>=0));
  assert.ok(actor.log.plan.includes("manuel"));
 }
 assert.ok(first.turns[0].actors.find(x=>x.character==="Mon Sacrieur").log.casts[0].notes
  .some(x=>/Buff|PV/.test(x)));
 assert.ok(first.turns[0].actors.find(x=>x.character==="Karuta").log.casts[0].notes
  .some(x=>/Yams|Critique/.test(x)));
 assert.deepEqual(contexts,original,"Le journal ne modifie pas les contextes du combat");
});

test("Journal: copie complète de plusieurs tours et rendu condensé",()=>{
 const sram=contexts.find(c=>c.build.classId==="sram");
 const first=playSequentialTeam([sram],t,()=>{},{oneRound:true,
  manualOverrides:{[sram.build.id]:["Manigance","Arnaque","Arnaque","Épidémie"].map(n=>choose(sram,n))}});
 const second=playSequentialTeam([sram],t,()=>{},{previous:first,oneRound:true,
  manualOverrides:{[sram.build.id]:["Fourvoiement","Fourvoiement","Épidémie"].map(n=>choose(sram,n))}});
 const copied=combatReportText(second);
 assert.match(copied,/TOUR 1/);
 assert.match(copied,/TOUR 2/);
 assert.match(copied,/Manigance/);
 assert.match(copied,/Épidémie/);
 assert.match(copied,/Poison|différé/i);
 assert.doesNotMatch(combatReportText(second,2),/=== TOUR 1/);
 const html=renderCombatLog(second,2);
 assert.match(html,/Journal · Tour 2/);
 assert.match(html,/Copier les logs/);
 assert.match(html,/Afficher le détail/);
 assert.match(html,/Fourvoiement/);
 assert.doesNotMatch(html,/onclick=/);
 assert.match(renderCombatLog(null,1),/Calcule un tour/);
});

test("Journal: alerte sur Manigance répétée tant que son buff est actif",()=>{
 const base={turn:1,pa:12,buffs:[{key:"Manigance",until:3,stat:"Dommages",amount:20}],dots:{},
  ecaHand:[],ecaTable:[]};
 const current={...base,pa:10};
 const report=combatCastLog(base,current,{name:"Manigance",pa:2},{name:"Manigance",pa:2,notes:[]},0);
 assert.match(report.alerts.join(" "),/Manigance relancée/);
 assert.equal(report.damage,0);
 assert.equal(report.remainingPA,10);
});

test("Journal: les notes d'expiration ne sont pas confondues avec les dégâts réels",()=>{
 const original={turn:1,total:300,buffs:[{key:"Pacte de Sang:Vitalité",until:1}],
  dots:{},ecaHand:[],ecaTable:[],sacrierHealth:{hp:3000,maxHp:6190,suffering:4}};
 const later={turn:2,total:300,buffs:[],dots:{},ecaHand:[],ecaTable:[],
  turns:[{ticks:[]}],sacrierHealth:{hp:3000,maxHp:4952,suffering:4}};
 const out=combatEndLog(original,later);
 assert.equal(out.delayed,0);
 assert.match(out.notes.join(" "),/Buff expiré|PV max/);
});
