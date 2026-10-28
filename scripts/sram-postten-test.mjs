/**
 * Test Sram post-turn-10 alternatives in the actual full-team simulation.
 * Keep Sacrier and Ecaflip's dynamically chosen actions exactly as calculated;
 * replace Sram actions on selected turns only. Compare complete 15-turn
 * total and poison carry. No unearned DPS or future state is fabricated.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {TEAM_TEN_ATTACK} from "../src/team-audited-ten-plan.js";
import {mkdirSync,writeFileSync} from "node:fs";

const R=n=>Math.round(n*10)/10;
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const policy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const ctx=INITIAL_BUILDS.map(b=>{
 const x=normalizeBuild(b);if(["sacrieur","sram"].includes(x.classId))x.distance=1;
 return createTeamContext(x,target);
});
const byClass=Object.fromEntries(ctx.map(c=>[c.settings.classId,c]));
const byName=Object.fromEntries(Object.entries(byClass).map(([cls,c])=>
 [cls,new Map(c.spells.map(s=>[s.name,s]))]));
const overridesForNames=byNames=>Object.fromEntries(
 Object.entries(byNames).map(([cls,names])=>[
  byClass[cls].build.id,names.map(name=>{
   const s=byName[cls].get(name);assert.ok(s,name);return String(s.id);
  })
 ])
);
let prefix=null;
for(let t=0;t<10;t++){
 const names=Object.fromEntries(["sacrieur","ecaflip","sram"].map(cls=>[cls,TEAM_TEN_ATTACK[cls][t]]));
 prefix=playSequentialTeam(ctx,target,()=>{},{previous:prefix,oneRound:true,
  manualOverrides:overridesForNames(names)});
}
assert.equal(R(prefix.theoretical),110046.6);
const rotationOptions={
 poison:["Injection Toxique","Arsenic","Épidémie"],
 fourvoiement:["Fourvoiement","Fourvoiement","Épidémie"],
 manigance:["Manigance","Arnaque","Arnaque","Épidémie"],
 arnaque:["Arnaque","Manthache","Épidémie"]
};
const proposals=[
 {name:"current-auto",switches:{}},
 ...[11,12,13,14].map(turn=>({name:"poisons-at-"+turn,
  switches:{[turn]:"poison"}})),
 ...[11,12,13].map(turn=>({name:"fourvoiement-at-"+turn,
  switches:{[turn]:"fourvoiement"}})),
 ...[11,12,13].map(turn=>({name:"manigance-at-"+turn,
  switches:{[turn]:"manigance"}})),
 {name:"poison-t11-t14",switches:{11:"poison",14:"poison"}},
 {name:"poison-t11-t13",switches:{11:"poison",13:"poison"}}
];
const reports=[];
for(const variant of proposals){
 let prev=prefix,valid=true,issue=null;
 const preview=[];
 for(let turn=11;turn<=15;turn++){
  try{
   const auto=optimizeTeamTurn(ctx,target,()=>{},prev,policy);
   const choice=variant.switches[turn];
   if(!choice){
    prev=auto;
   }else{
    const selected=Object.fromEntries(auto.turns.at(-1).actors.map(actor=>{
     const c=ctx.find(c=>c.build.id===actor.id);
     return [c.settings.classId,actor.actions.map(a=>a.name)];
    }));
    selected.sram=rotationOptions[choice];
    prev=playSequentialTeam(ctx,target,()=>{},{previous:prev,oneRound:true,
     manualOverrides:overridesForNames(selected)});
   }
   const current=prev.turns.at(-1),sram=current.actors.find(a=>a.character==="Matryoshka");
   const sac=current.actors.find(a=>a.character==="Mon Sacrieur");
   assert.equal(sram.log.casts.length,sram.actions.length);
   assert.ok(sram.spent<=sram.availablePA);
   assert.ok(Math.abs(R(sram.direct+sram.poison)-sram.damage)<.15);
   assert.ok(sac.health.hp/sac.health.maxHp>=.5);
   preview.push({turn,rotation:sram.actions.map(a=>a.name),
    sram:sram.damage,team:current.theoretical});
  }catch(error){valid=false;issue=error.message;break}
 }
 const result={name:variant.name,valid,issue,
  sram:valid?R(prev.members.find(m=>m.character==="Matryoshka").estimated):null,
  team:valid?R(prev.theoretical):null,
  turns:preview};
 reports.push(result);
 console.log("SRAM_POSTTEN_TRIAL "+JSON.stringify({name:result.name,valid,issue,
  team:result.team,sram:result.sram}));
}
const valid=reports.filter(x=>x.valid).sort((a,b)=>b.team-a.team);
assert.ok(valid.length,"no post-T10 valid proposals");
const baseline=reports[0],best=valid[0];
assert.ok(baseline.valid,"automatic continuation must remain legal");
assert.equal(baseline.sram,51578.1,"automatic Sram must retain the verified poison gain");
assert.equal(best.team,baseline.team,"a tested continuation still beats the automatic choice");
const report={baseline,best,gainTeam:R(best.team-baseline.team),
 gainSram:R(best.sram-baseline.sram),
 choicesTested:reports.length,valid:valid.length,results:reports};
mkdirSync("results",{recursive:true});
writeFileSync("results/sram-postten-15.json",JSON.stringify(report,null,2));
console.log("SRAM_POSTTEN_FINAL "+JSON.stringify(report));
