import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {initialState,castSpell,endTurn,eligible} from "../src/engine.js";
import {newManualDraft,manualSpellChoices} from "../src/team-manual.js";

const target=cleanTeamTarget({turns:30,hp:1e12,criticals:true,
 resistances:{Air:0,Eau:0,Terre:0,Feu:0,Neutre:0}});
const b=normalizeBuild(INITIAL_BUILDS.find(x=>x.id==="ecaflip-karuta-eau"));
const ctx=createTeamContext(b,target),c=ctx.settings;
const kitten=ctx.spells.find(s=>s.name==="Griffe Invocatrice");
const weapon=ctx.spells.find(s=>s.isWeapon);
const cats=s=>s.invocations.filter(x=>x.kind==="Chaton Enragé").length;
const buff=s=>s.buffs.filter(b=>b.key==="Griffe Invocatrice");
test("Griffe : bonus linked to surviving kitten rather than four-turn duration",()=>{
 assert.equal(b.stats.summons,6);
 assert.equal(c.ecaflipMaxSummons,6);
 assert.ok(kitten.status.buff.untilRemoved);
 assert.equal(kitten.status.buff.stacks,3);
 assert.equal(kitten.status.buff.value,90);
 let s=initialState(c);
 assert.equal(cats(s),0);
 assert.ok(eligible(kitten,s,c));
 s=castSpell(s,kitten,c);
 assert.equal(cats(s),1);
 assert.deepEqual(buff(s).map(x=>x.amount),[90]);
 assert.ok(buff(s)[0].until>1000000);
 assert.equal(s.pa,9);
 for(let t=1;t<=4;t++)s=endTurn(s,c);
 assert.equal(s.turn,5);
 assert.equal(cats(s),1,"Chaton still alive at T5");
 assert.deepEqual(buff(s).map(x=>x.amount),[90],"T1 buff should NOT expire at T5");
 assert.equal(eligible(kitten,s,c),true,"4-turn cooldown allows T5 cast");
 s=castSpell(s,kitten,c);
 assert.equal(cats(s),2);
 assert.deepEqual(buff(s).map(x=>x.amount),[180]);
 for(let t=5;t<=8;t++)s=endTurn(s,c);
 assert.equal(s.turn,9);
 s=castSpell(s,kitten,c);
 assert.equal(cats(s),3);
 assert.deepEqual(buff(s).map(x=>x.amount),[270]);
 for(let t=9;t<=12;t++)s=endTurn(s,c);
 s=castSpell(s,kitten,c); // fourth physical kitten, capped buff
 assert.equal(cats(s),4);
 assert.deepEqual(buff(s).map(x=>x.amount),[270],"No +360");
 for(let t=13;t<=16;t++)s=endTurn(s,c);
 s=castSpell(s,kitten,c); // fifth
 assert.equal(cats(s),5);
 assert.deepEqual(buff(s).map(x=>x.amount),[270]);
 for(let t=17;t<=20;t++)s=endTurn(s,c);
 s=castSpell(s,kitten,c); // sixth
 assert.equal(cats(s),6);
 assert.deepEqual(buff(s).map(x=>x.amount),[270],"No +540");
 for(let t=21;t<=24;t++)s=endTurn(s,c);
 assert.equal(s.turn,25);
 assert.equal(eligible(kitten,s,c),false,"Cannot occupy seventh summon slot");
 assert.deepEqual(buff(s).map(x=>x.amount),[270]);
 // Simulate 4 kitten deaths externally: the buff must fall to +180.
 s.invocations=s.invocations.slice(0,2);
 s=endTurn(s,c);
 assert.equal(cats(s),2);
 assert.deepEqual(buff(s).map(x=>x.amount),[180]);
 s.invocations=[];
 s=endTurn(s,c);
 assert.deepEqual(buff(s),[],"All kittens dead -> no Power buff");
});
test("Griffe 90/180/270 Power actually affects damage of Karuta's weapon",()=>{
 assert.ok(weapon&&weapon.name==="Sceptre du Roi Joueur");
 const baseline=castSpell(initialState(c),weapon,c).total;
 const one=castSpell(castSpell(initialState(c),kitten,c),weapon,c).total;
 assert.ok(one>baseline,"Buff must raise weapon damage at first kitten");
 let s=initialState(c);
 for(let turn=1;turn<=9;turn++){
  if([1,5,9].includes(turn))s=castSpell(s,kitten,c);
  if(turn<9)s=endTurn(s,c);
 }
 assert.equal(buff(s)[0].amount,270);
 const buffed=castSpell(s,weapon,c);
 const withoutBuff=structuredClone(s);
 withoutBuff.invocations=[];
 withoutBuff.buffs=withoutBuff.buffs.filter(x=>x.key!=="Griffe Invocatrice");
 const no=castSpell(withoutBuff,weapon,c);
 assert.ok(buffed.total>no.total,"+270 must increase damage on the same turn");
});
test("Griffe : original variant limits respected and manual tooltip is accurate",()=>{
 const draft=newManualDraft([ctx],target);
 const option=manualSpellChoices([ctx],target,draft).find(x=>x.name==="Griffe Invocatrice");
 assert.ok(option?.enabled);
 assert.match(option.reason,/cumul max 3/);
 assert.match(option.reason,/6 invocations/);
 assert.match(option.reason,/jusqu’à leur mort/);
 const modified=structuredClone(b);
 const n=modified.variants.indexOf("Griffe Invocatrice");
 assert.ok(n>=0);
 modified.variants[n]="Caresse Invocatrice";
 const alt=createTeamContext(modified,target);
 const griffe=alt.spells.find(x=>x.name==="Griffe Invocatrice");
 assert.equal(eligible(griffe,initialState(alt.settings),alt.settings),false,
  "Opposite variant must never be cast");
});
