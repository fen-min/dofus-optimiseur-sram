import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {WEAPONS,equippedWeaponSpell} from "../src/weapons.js";
import {prepareBuildSpells} from "../src/build-damage.js";
import {cleanSettings,initialState,eligible,castSpell} from "../src/engine.js";
import {createTeamContext,optimizeTeamTurn} from "../src/team-core.js";

const sram=INITIAL_BUILDS.find(b=>b.classId==="sram");
const sacrier=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const setup=build=>cleanSettings({classId:"sram",ap:12,turns:1,distance:1,
 variants:CLASSES.sram.defaultVariants,variantPairs:CLASSES.sram.pairs,
 defaultVariants:CLASSES.sram.defaultVariants,
 criticals:false,beamWidth:8,inLine:true,lineOfSight:true});

test("l'arme Manthache est choisie uniquement sur le Sram du preset",()=>{
 assert.equal(normalizeBuild(sram).weapon,"manthache");
 assert.equal(normalizeBuild({...sram,weapon:undefined}).weapon,"manthache");
 assert.equal(normalizeBuild({...sram,weapon:null}).weapon,null);
 assert.equal(normalizeBuild(sacrier).weapon,"manthache");
 assert.equal(normalizeBuild({...sacrier,weapon:undefined}).weapon,"manthache");
 assert.equal(normalizeBuild({...sacrier,weapon:null}).weapon,null);
 assert.equal(normalizeBuild({...sacrier,weapon:"manthache"}).weapon,"manthache");
 assert.equal(normalizeBuild({...sacrier,id:"new-sacrieur",weapon:undefined}).weapon,null);
 assert.equal(normalizeBuild({...sram,id:"new-sram",weapon:undefined}).weapon,null);
 assert.equal(WEAPONS.manthache.ap,5);
 assert.equal(WEAPONS.manthache.criticalBonus,8);
});

test("les dégâts des deux lignes Air sont calculés à partir des stats du build actif",()=>{
 const weapon=equippedWeaponSpell(normalizeBuild(sram));
 assert.ok(weapon.isWeapon);
 assert.equal(weapon.weaponHits.length,2);
 assert.equal(weapon.weaponHits[0].lifeSteal,false);
 assert.equal(weapon.weaponHits[1].lifeSteal,true);
 const expectedNormal=weapon.weaponHits.reduce((sum,hit)=>sum+hit.normal.min,0);
 const expectedCrit=weapon.weaponHits.reduce((sum,hit)=>sum+hit.crit.min,0);
 assert.equal(weapon.min,expectedNormal);
 assert.equal(weapon.critMin,expectedCrit);
 assert.ok(weapon.critMin>weapon.min);
 assert.equal(weapon.critChance,.27);
 const high=equippedWeaponSpell({...sram,stats:{...sram.stats,agility:sram.stats.agility+100}});
 assert.ok(high.min>weapon.min);
 // Stats of the item itself are not stacked on top of the active build.
 assert.equal(sram.stats.agility,1645);
});

test("une seule attaque d'arme par tour, indépendamment des variantes de classe",()=>{
 const weapon=equippedWeaponSpell(sram);
 const cfg=setup(sram);
 let state=initialState(cfg);
 assert.ok(eligible(weapon,state,cfg));
 state=castSpell(state,weapon,cfg);
 assert.ok(state.total>0);
 assert.equal(state.actions[0].pa,5);
 assert.ok(state.actions[0].notes.some(s=>s.includes("Vol de vie")));
 assert.equal(eligible(weapon,state,cfg),false);
 const far=initialState({...cfg,distance:3});
 assert.equal(eligible(weapon,far,cfg),false); // same actor location
});

test("sans arme équipée, aucun coup d'arme n'apparaît dans l'optimiseur",()=>{
 assert.ok(prepareBuildSpells(sram,CLASSES.sram).some(s=>s.id==="weapon:manthache"));
 const none=normalizeBuild({...sram,weapon:null});
 assert.equal(prepareBuildSpells(none,CLASSES.sram).filter(s=>s.isWeapon).length,0);
});

test("le moteur de groupe reçoit l'attaque d'arme du build actif",()=>{
 const target={hp:1_000_000_000_000,turns:50,resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0},criticals:false};
 const context=createTeamContext({...sram,distance:1},target);
 const weapon=context.spells.find(s=>s.isWeapon);
 assert.ok(weapon);
 const res=optimizeTeamTurn([{...context,spells:[weapon]}],target);
 assert.equal(res.turns.length,1);
 assert.equal(res.turns[0].actors[0].actions[0]?.name,"Manthache");
 assert.ok(res.turns[0].actors[0].damage>0);
});

test("la carte d'arme est présente et reste distincte des 22 variantes",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
 assert.match(html,/id="spellbook-weapon-select"/);
 assert.match(html,/id="spellbook-weapon-detail"/);
 assert.match(js,/renderEquippedWeapon\(\)/);
 assert.match(js,/equipWeapon\(e.target.value\)/);
 assert.equal(CLASSES.sram.pairs.length,22);
});

test("le Sacrieur utilise sa propre fiche de statistiques pour la Manthache",()=>{
 const build=normalizeBuild({...sacrier,weapon:undefined});
 const weapon=equippedWeaponSpell(build);
 const sramWeapon=equippedWeaponSpell(sram);
 assert.equal(build.classId,"sacrieur");
 assert.equal(weapon.name,"Manthache");
 assert.equal(weapon.pa,5);
 assert.equal(weapon.maxPerTurn,1);
 assert.equal(weapon.weaponHits.length,2);
 assert.equal(weapon.damageSource,"active-build-weapon");
 assert.notEqual(weapon.min,sramWeapon.min);
 const stronger=equippedWeaponSpell({...build,stats:{...build.stats,agility:build.stats.agility+100}});
 assert.ok(stronger.min>weapon.min);
 // Rolls on the equipped item must not be added a second time.
 assert.equal(build.stats.agility,sacrier.stats.agility);
});

test("l'optimiseur d'équipe du Sacrieur peut lancer la Manthache à 1 case, jamais à 2 cases",()=>{
 const target={hp:1_000_000_000_000,turns:50,
  resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0},criticals:false};
 const close=createTeamContext({...sacrier,weapon:"manthache",distance:1},target);
 const attack=close.spells.find(spell=>spell.isWeapon);
 assert.ok(attack);
 assert.equal(attack.name,"Manthache");
 const selected={...close,spells:[attack]};
 const result=optimizeTeamTurn([selected],target);
 assert.equal(result.turns.length,1);
 assert.ok(result.turns[0].actors[0].actions.some(action=>action.name==="Manthache"));
 assert.ok(result.turns[0].actors[0].damage>0);
 const far=createTeamContext({...sacrier,weapon:"manthache",distance:2},target);
 const weaponFar=far.spells.find(spell=>spell.isWeapon);
 assert.equal(eligible(weaponFar,initialState(far.settings),far.settings),false);
});

test("un ancien Sacrieur sans champ d'arme récupère Manthache, mais null reste sans arme",()=>{
 const oldStored=JSON.parse(JSON.stringify(sacrier));
 delete oldStored.weapon;
 const migrated=normalizeBuild(oldStored);
 assert.equal(migrated.weapon,"manthache");
 const disabled=normalizeBuild({...oldStored,weapon:null});
 assert.equal(disabled.weapon,null);
 assert.equal(prepareBuildSpells(disabled,CLASSES.sacrieur).filter(x=>x.isWeapon).length,0);
});
