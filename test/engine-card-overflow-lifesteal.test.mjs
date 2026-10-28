import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {initialState,castSpell,eligible,endTurn} from "../src/engine.js";

const target=cleanTeamTarget({hp:1e12,turns:10,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const ctx=cls=>{
 const source=INITIAL_BUILDS.find(b=>b.classId===cls);
 const build=normalizeBuild(source);
 if(cls==="sacrieur"||cls==="sram")build.distance=1;
 return createTeamContext(build,target);
};
const spell=(ctx,name)=>{
 const x=ctx.spells.find(s=>s.name===name);
 assert.ok(x,"Sort absent : "+name);
 return x;
};

test("Karuta: fifth draw auto-plays the full four-card hand BEFORE drawing",()=>{
 const eca=ctx("ecaflip");
 const initial=initialState(eca.settings);
 const hand=[2,3,4,5].map(rank=>({suit:"club",rank}));
 const state={...initial,ecaHand:hand};
 const yams=spell(eca,"Yams");
 assert.ok(eligible(yams,state,eca.settings));
 const after=castSpell(state,yams,eca.settings);
 assert.deepEqual(after.ecaHand,[{suit:"club",rank:2}]);
 assert.equal(after.ecaTable.length,4);
 assert.ok(after.buffs.some(b=>b.key.startsWith("Combo")&&b.amount===140));
 assert.equal(after.buffs.filter(b=>b.key.startsWith("Carte club")).length,4);
 assert.match(after.actions.at(-1).notes.join(" "),/Main pleine : 4 cartes jouées automatiquement/);
 assert.equal(state.ecaHand.length,4,"No mutation of previous state");
 assert.equal(after.total>0,true);
 const next=endTurn(after,eca.settings);
 assert.equal(next.ecaTable.length,4);
 assert.equal(next.ecaHand.length,1);
});

test("Karuta: Baraka plays its existing suit before drawing, no double trigger",()=>{
 const eca=ctx("ecaflip");
 const state={...initialState(eca.settings),ecaHand:[2,3,4,5].map(rank=>({suit:"club",rank}))};
 const after=castSpell(state,spell(eca,"Baraka"),eca.settings);
 assert.equal(after.ecaTable.length,4);
 assert.deepEqual(after.ecaHand,[{suit:"club",rank:3}]);
 assert.ok(after.actions.at(-1).notes.some(n=>/4 carte\(s\) jouée\(s\)/.test(n)));
 assert.equal(after.buffs.filter(b=>b.key.startsWith("Combo")).length,1);
});

test("Karuta: no card lost when five separate draws happen across turns",()=>{
 const eca=ctx("ecaflip");
 let state={...initialState(eca.settings),ecaHand:[
  {suit:"club",rank:2},{suit:"club",rank:3},
  {suit:"diamond",rank:2},{suit:"club",rank:4}
 ]};
 const after=castSpell(state,spell(eca,"Infortune"),eca.settings);
 assert.equal(after.ecaTable.length,4);
 assert.deepEqual(after.ecaHand,[{suit:"club",rank:5}]);
 assert.ok(after.buffs.length>=4);
});

test("Sacrieur: Manthache heals from the steal hit only, not the whole weapon",()=>{
 const sacri=ctx("sacrieur");
 const input={...sacri.settings,sacrierStartingHpPercent:60};
 const before=initialState(input),wp=spell(sacri,"Manthache");
 assert.ok(eligible(wp,before,input));
 const after=castSpell(before,wp,input);
 const gain=after.sacrierHealth.hp-before.sacrierHealth.hp;
 assert.ok(gain>0,"Missing weapon heal");
 assert.ok(gain<after.total*.30,"Heal incorrectly based on total weapon damage: "+gain+" vs "+after.total);
 assert.ok(after.total>gain*3,"The normal weapon hit should never heal");
 assert.match(after.actions[0].notes.join(" "),/soin effectif estimé/);
 assert.ok(before.sacrierHealth.hp<after.sacrierHealth.hp);
});
test("Matryoshka: weapon healing is reported but no fictional personal HP introduced",()=>{
 const sram=ctx("sram");
 const before=initialState(sram.settings);
 const after=castSpell(before,spell(sram,"Manthache"),sram.settings);
 assert.equal(after.sacrierHealth,null);
 assert.ok(after.total>0);
 assert.match(after.actions.at(-1).notes.join(" "),/PV de sram non suivis/);
});
test("Karuta: Sceptre life steal does not create a fictitious Sacrier healing state",()=>{
 const eca=ctx("ecaflip");
 const initial=initialState(eca.settings);
 const next=castSpell(initial,spell(eca,"Sceptre du Roi Joueur"),eca.settings);
 assert.equal(next.sacrierHealth,null);
 assert.match(next.actions.at(-1).notes.join(" "),/PV de ecaflip non suivis/);
});
