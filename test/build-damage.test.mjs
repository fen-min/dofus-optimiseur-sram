import test from "node:test";
import assert from "node:assert/strict";
import {CLASSES,INITIAL_BUILDS} from "../src/classes.js";
import {SACRIER_DOFUSBOOK_GEAR_STATS,prepareBuildSpells} from "../src/build-damage.js";
import {createTeamContext} from "../src/team-core.js";
import {initialState,castSpell,cleanSettings} from "../src/engine.js";

const sacri=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const sram=INITIAL_BUILDS.find(b=>b.classId==="sram");
const find=(spells,name)=>spells.find(x=>x.name===name);
const withStats=stats=>({...sacri,stats:{...sacri.stats,...stats,flatDamage:{...sacri.stats.flatDamage,...stats.flatDamage}}});

test("DofusBook source stats reproduce every modeled damage line without guessing",()=>{
 const source=withStats({...SACRIER_DOFUSBOOK_GEAR_STATS});
 const all=prepareBuildSpells(source,CLASSES.sacrieur);
 const refs=CLASSES.sacrieur.spells.filter(s=>!s.nonDirect&&s.element);
 assert.ok(refs.length>=15);
 for(const s of refs){
  const calc=all.find(x=>x.id===s.id);
  assert.equal(calc.min,s.min,s.name+" normal min");
  assert.equal(calc.max,s.max,s.name+" normal max");
  assert.equal(calc.critMin,s.critMin,s.name+" crit min");
  assert.equal(calc.critMax,s.critMax,s.name+" crit max");
 }
});
test("Active build stats produce exact Assaut 360–407 / crit 446–492",()=>{
 const all=prepareBuildSpells(sacri,CLASSES.sacrieur);
 const assaut=find(all,"Assaut");
 assert.deepEqual([assaut.min,assaut.max,assaut.critMin,assaut.critMax],[360,407,446,492]);
 assert.equal(assaut.baseDamage,15.5);
 assert.equal(assaut.damageSource,"active-build-stats");
 assert.deepEqual([find(CLASSES.sacrieur.spells,"Assaut").min,find(CLASSES.sacrieur.spells,"Assaut").max],[399,448]);
});
test("Agility, Power and Air fixed damage updates affect all relevant spell rows",()=>{
 const base=prepareBuildSpells(sacri,CLASSES.sacrieur);
 const improved=prepareBuildSpells(withStats({agility:sacri.stats.agility+100}),CLASSES.sacrieur);
 const moreFixed=prepareBuildSpells(withStats({flatDamage:{Air:sacri.stats.flatDamage.Air+15}}),CLASSES.sacrieur);
 const morePower=prepareBuildSpells(withStats({power:sacri.stats.power+100}),CLASSES.sacrieur);
 for(const name of ["Assaut","Furie","Désolation"]){
  assert.ok(find(improved,name).min>find(base,name).min,name+" agility");
  assert.ok(find(moreFixed,name).min>find(base,name).min,name+" fixed");
  assert.ok(find(morePower,name).min>find(base,name).min,name+" power");
 }
 const changedNoAir=prepareBuildSpells(withStats({chance:sacri.stats.chance+200}),CLASSES.sacrieur);
 assert.equal(find(changedNoAir,"Assaut").min,find(base,"Assaut").min);
});
test("No double-counting when the build changes to DofusBook reference stats",()=>{
 const current=prepareBuildSpells(sacri,CLASSES.sacrieur);
 const original=prepareBuildSpells(withStats(SACRIER_DOFUSBOOK_GEAR_STATS),CLASSES.sacrieur);
 const spell="Assaut";
 assert.equal(find(original,spell).min,399);
 assert.equal(find(original,spell).max,448);
 assert.equal(find(current,spell).min,360);
 assert.equal(find(current,spell).max,407);
 const again=prepareBuildSpells(sacri,CLASSES.sacrieur);
 assert.equal(find(current,spell).min,find(again,spell).min);
});
test("Manual calibration takes priority but old full DofusBook-row snapshots do not",()=>{
 const spell=CLASSES.sacrieur.spells.find(s=>s.name==="Assaut");
 const old={...sacri,calibration:{[spell.id]:{min:spell.min,max:spell.max,critMin:spell.critMin,critMax:spell.critMax}}};
 const converted=find(prepareBuildSpells(old,CLASSES.sacrieur),"Assaut");
 assert.deepEqual([converted.min,converted.max,converted.critMin,converted.critMax],[360,407,446,492]);
 const custom={...sacri,calibration:{[spell.id]:{min:350,max:411}}};
 assert.equal(find(prepareBuildSpells(custom,CLASSES.sacrieur),"Assaut").min,350);
 assert.equal(find(prepareBuildSpells(custom,CLASSES.sacrieur),"Assaut").max,411);
 assert.equal(find(prepareBuildSpells(custom,CLASSES.sacrieur),"Assaut").critMin,446);
});
test("Missing stats, unavailable source class and legacy Sram remain unchanged",()=>{
 const missing={...sacri,stats:{agility:1267,power:160}};
 assert.equal(find(prepareBuildSpells(missing,CLASSES.sacrieur),"Assaut").min,399);
 const original=CLASSES.sram.spells.find(s=>s.min>0);
 const other=prepareBuildSpells(sram,CLASSES.sram).find(s=>s.id===original.id);
 assert.equal(original.min,other.min);
});
test("Team optimizer uses the same derived stats as the solo module, and PA is unchanged",()=>{
 const ctx=createTeamContext(sacri,{turns:5,hp:10000000,criticals:false});
 assert.equal(find(ctx.spells,"Assaut").min,360);
 assert.equal(ctx.settings.ap,12);
 const state=initialState(ctx.settings);
 const assaut=find(ctx.spells,"Assaut");
 const result=castSpell(state,assaut,ctx.settings);
 assert.ok(result.total>350);
 assert.ok(result.total<500);
 const modified=createTeamContext(withStats({agility:1368,flatDamage:{Air:172},spellDamagePercent:0}),{turns:5,criticals:false});
 assert.equal(find(modified.spells,"Assaut").min,399);
});
