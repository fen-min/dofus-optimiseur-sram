import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {prepareBuildSpells} from "../src/build-damage.js";
import {createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {initialState,castSpell,endTurn} from "../src/engine.js";
import {theoreticalCriticalRate,effectiveCriticalRate,activeTurquoiseBonus} from "../src/critical.js";

const base=normalizeBuild(INITIAL_BUILDS.find(x=>x.classId==="ecaflip"));
const target={hp:1e12,turns:50,criticals:false,
 resistances:{Air:0,Eau:0,Terre:0,Feu:0,Neutre:0}};
const context=createTeamContext(base,target);
const spell=name=>context.spells.find(s=>s.name===name);

test("Karuta : 63% sont les statistiques TOTALES (Turquoise +10 déjà compris)",()=>{
 assert.equal(base.stats.critical,63);
 assert.equal(base.dofusTurquoise,true);
 assert.equal(context.settings.dofusTurquoise,true);
 assert.equal(spell("Yams").critChance,.68);
 assert.equal(spell("Baraka").critChance,.73);
 assert.equal(spell("Sceptre du Roi Joueur").critChance,.83);
 const other=normalizeBuild({...base,dofusTurquoise:false});
 assert.equal(prepareBuildSpells(other,CLASSES.ecaflip).find(s=>s.name==="Yams").critChance,.68);
});

test("Yams augmente le taux CC pendant 3 tours; atteindre 100% garantit le CC sur chaque sort et l'arme",()=>{
 const c=context.settings;
 const one=castSpell(initialState(c),spell("Yams"),c);
 assert.ok(one.buffs.some(x=>x.key==="Yams:Critique"&&x.amount>10));
 assert.ok(effectiveCriticalRate(spell("Baraka"),one,c)>spell("Baraka").critChance);
 const two=castSpell(one,spell("Yams"),c);
 for(const name of ["Yams","Baraka","Kraps","Griffe Joueuse","Sceptre du Roi Joueur"]){
  assert.equal(theoreticalCriticalRate(spell(name),two),1,"100% critique "+name);
  assert.equal(effectiveCriticalRate(spell(name),two,c),1,"100% critique même si case critiques probables décochée");
 }
 assert.ok(two.actions.some(x=>x.notes.some(n=>n.includes("Yams"))));
});

test("Au 100% critique, les dégâts d'un sort correspondent à sa ligne critique et non une moyenne",()=>{
 const c=context.settings,yams=spell("Yams"),attack=spell("Griffe Joueuse");
 let prior=castSpell(initialState(c),yams,c);
 prior=castSpell(prior,yams,c);
 const withBuff=castSpell(prior,attack,c);
 assert.equal(effectiveCriticalRate(attack,prior,c),1);
 assert.ok(withBuff.total-prior.total>0);
 const low=castSpell(initialState(c),attack,c);
 assert.ok(withBuff.total-prior.total>low.total,"La ligne critique doit être plus élevée");
});

test("Turquoise : déclenchement sur critique garanti, buff +1% finaux par CC, maxi 10 pour 3 tours",()=>{
 const c={...context.settings,criticals:true};
 const attack=spell("Griffe Joueuse"),yams=spell("Yams");
 let s=castSpell(initialState(c),yams,c);
 s=castSpell(s,yams,c);
 const before=activeTurquoiseBonus(s);
 const one=castSpell(s,attack,c);
 assert.ok(Math.abs(activeTurquoiseBonus(one)-before-1)<.001);
 assert.ok(one.actions.at(-1).notes.some(n=>n.includes("Turquoise")));
 let clone={...one,turquoiseProcs:[{value:10,until:one.turn+2}]};
 assert.equal(activeTurquoiseBonus(clone),10);
 const capped=castSpell(clone,spell("Kraps"),c);
 assert.equal(activeTurquoiseBonus(capped),10);
 let expires=clone;
 for(let i=0;i<3;i++)expires=endTurn(expires,c);
 assert.equal(activeTurquoiseBonus(expires),0);
});
test("Turquoise améliore le coup suivant, pas le coup qui a créé le bonus",()=>{
 const yams=spell("Yams"),attack=spell("Griffe Joueuse");
 const withDofus={...context.settings,criticals:true,dofusTurquoise:true};
 const noDofus={...context.settings,criticals:true,dofusTurquoise:false};
 let beforeD=castSpell(initialState(withDofus),yams,withDofus);
 let beforeN=castSpell(initialState(noDofus),yams,noDofus);
 assert.equal(beforeD.total,beforeN.total);
 const afterD=castSpell(beforeD,attack,withDofus);
 const afterN=castSpell(beforeN,attack,noDofus);
 assert.ok(afterD.total-beforeD.total>afterN.total-beforeN.total);
});
test("Le build à +37 points Critique respecte 100% et ne plafonne plus à 95%",()=>{
 const boosted=normalizeBuild({...base,stats:{...base.stats,critical:100}});
 const spells=prepareBuildSpells(boosted,CLASSES.ecaflip);
 assert.equal(spells.find(s=>s.name==="Yams").critChance,1);
 assert.equal(spells.find(s=>s.name==="Sceptre du Roi Joueur").critChance,1);
});
test("Un clic = un tour, et les buffs critiques et passif Turquoise persistent entre clics",()=>{
 let previous=optimizeTeamTurn([context],target);
 assert.equal(previous.turns.length,1);
 previous=optimizeTeamTurn([context],target,()=>{},previous);
 assert.equal(previous.turns.length,2);
 assert.ok(Array.isArray(previous.session.actors[0].state.turquoiseProcs));
 assert.ok(previous.session.actors[0].state.buffs.every(b=>b.until>=3));
});

test("Optimiseur d'équipe : Karuta cherche à atteindre 100% critique dès le tour 1 si Yams est accessible",()=>{
 const spells=context.spells.filter(sp=>
  ["Yams","Baraka","Griffe Joueuse","Sceptre du Roi Joueur"].includes(sp.name));
 const tailored={...context,spells};
 const res=optimizeTeamTurn([tailored],target);
 const actions=res.turns[0].actors[0].actions.map(a=>a.name);
 const final=res.session.actors[0].state;
 console.log("ECACRIT FIRST TURN",JSON.stringify({actions,critYams:theoreticalCriticalRate(spell("Yams"),final),critWeapon:theoreticalCriticalRate(spell("Sceptre du Roi Joueur"),final),turquoise:activeTurquoiseBonus(final)}));
 assert.ok(actions.includes("Yams"),"Le tour initial doit au moins chercher son bonus Critique Yams");
 assert.ok(theoreticalCriticalRate(spell("Yams"),final)>.68);
 assert.ok(activeTurquoiseBonus(final)>0);
});
