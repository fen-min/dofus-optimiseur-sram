import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {ECAFLIP_KARUTA_VARIANTS,ECAFLIP_PAIRS} from "../src/ecaflip-spells.js";
import {prepareBuildSpells} from "../src/build-damage.js";
import {classifyHand,rekopBaseHits,playedHandBonuses,winningHand,cardHandDamageBonus} from "../src/ecaflip-cards.js";
import {cleanSettings,initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
const eca=INITIAL_BUILDS.find(b=>b.classId==="ecaflip");
const target={hp:1_000_000_000_000,turns:50,criticals:true,resistances:{Air:0,Eau:0,Terre:0,Feu:0,Neutre:0}};
const context=createTeamContext(eca,target);
const settings=context.settings,spell=name=>context.spells.find(s=>s.name===name);
test("Karuta — 22 variantes réellement choisies, Eau, 12 PA et stats de la capture",()=>{
 assert.ok(eca);
 assert.equal(eca.character,"Karuta");
 assert.equal(eca.stats.hitPoints,4293);
 assert.equal(eca.stats.chance,973);
 assert.equal(eca.stats.power,426);
 assert.equal(eca.stats.critical,63);
 assert.equal(eca.stats.criticalDamage,115);
 assert.equal(eca.stats.flatDamage.Eau,93);
 assert.equal(eca.stats.initiative,1963);
 assert.equal(ECAFLIP_PAIRS.length,22);
 assert.equal(CLASSIFY_UNDEFINED,ECAFLIP_KARUTA_VARIANTS.length);
});
const CLASSIFY_UNDEFINED=22;
test("Une seule des 22 variantes est équipée et les 44 noms sont conservés",()=>{
 assert.equal(CLASSIFY_UNDEFINED,eca.variants.length);
 assert.equal(CLASSES.ecaflip.spells.length,44);
 for(let i=0;i<22;i++)assert.ok(ECAFLIP_PAIRS[i].includes(eca.variants[i]));
 assert.equal(eca.variants[1],"Yams");
 assert.equal(eca.variants[2],"Griffe Joueuse");
 assert.equal(eca.variants[8],"Baraka");
 assert.equal(eca.variants[21],"Rekop");
});
test("Le Sceptre du Roi Joueur est séparé des variantes, suit Chance et Critique du build actif",()=>{
 const weapon=spell("Sceptre du Roi Joueur");
 assert.ok(weapon?.isWeapon);
 assert.equal(weapon.pa,3);
 assert.equal(weapon.maxPerTurn,2);
 assert.equal(weapon.weaponHits.length,2);
 const more=prepareBuildSpells({...eca,stats:{...eca.stats,chance:1073}},CLASSES.ecaflip)
  .find(s=>s.name==="Sceptre du Roi Joueur");
 assert.ok(more.min>weapon.min);
 const noWeapon=normalizeBuild({...eca,weapon:null});
 assert.equal(prepareBuildSpells(noWeapon,CLASSES.ecaflip).filter(s=>s.isWeapon).length,0);
});
test("La pioche Eau ajoute le Valet de Trèfle, empêche les doublons, persiste au tour 2",()=>{
 const yams=spell("Yams"),s=initialState(settings);
 assert.ok(eligible(yams,s,settings));
 const once=castSpell(s,yams,settings);
 assert.deepEqual(once.ecaHand,[{suit:"club",rank:2}]);
 const twice=castSpell(once,yams,settings);
 assert.equal(twice.ecaHand.length,1);
 const next=endTurn(twice,settings);
 assert.deepEqual(next.ecaHand,[{suit:"club",rank:2}]);
});
test("Baraka joue les Trèfles accumulés et confère leurs buffs critiques",()=>{
 const yams=spell("Yams"),kraps=spell("Kraps"),baraka=spell("Baraka");
 let s=initialState(settings);
 s=castSpell(s,yams,settings);
 s=castSpell(s,kraps,settings);
 const before=s.ecaHand.length;
 assert.equal(before,2);
 s=castSpell(s,baraka,settings);
 assert.deepEqual(s.ecaHand,[{suit:"club",rank:3}]);
 assert.equal(s.ecaTable.length,2);
 assert.ok(s.buffs.some(b=>b.stat==="Critique"&&b.amount>=4));
 assert.equal(cardHandDamageBonus([{suit:"club",rank:2},{suit:"club",rank:4}],"club"),6);
});
test("Cartes : brelan As +170 Puissance; suite Trèfle +140 Chance; carré As +200 dans chaque élément",()=>{
 const trip=[{suit:"club",rank:5},{suit:"spade",rank:5},{suit:"heart",rank:5}];
 assert.equal(classifyHand(trip).power,170);
 const straight=[2,3,4,5].map(rank=>({suit:"club",rank}));
 const played=playedHandBonuses(straight);
 assert.ok(played.bonuses.some(b=>b.stat==="Eau"&&b.value===140));
 const four=["club","spade","heart","diamond"].map(suit=>({suit,rank:5}));
 const payout=playedHandBonuses(four).bonuses;
 for(const stat of ["Air","Eau","Feu","Terre"])
  assert.ok(payout.some(b=>b.stat===stat&&b.value===200));
 assert.equal(rekopBaseHits(straight).length,4);
 assert.equal(rekopBaseHits(straight).reduce((n,h)=>n+h.base,0),56);
});
test("Rekop impossible sans main gagnante, puis utilisable après collecte de cartes",()=>{
 const rekop=spell("Rekop");
 assert.ok(rekop);
 const s=initialState(settings);
 assert.equal(eligible(rekop,s,settings),false);
 const withPair={...s,ecaHand:[
  {suit:"club",rank:3},{suit:"heart",rank:3},
  {suit:"diamond",rank:5},{suit:"spade",rank:5}]};
 assert.ok(winningHand(withPair.ecaHand));
 assert.ok(eligible(rekop,withPair,settings));
 const damage=castSpell(withPair,rekop,settings);
 assert.ok(damage.total>0);
 assert.equal(damage.ecaHand.length,0);
});
test("Les tirages aléatoires non modélisés sont exclus des recommandations plutôt que devinés",()=>{
 const rng=spell("Redistribution");
 assert.equal(rng.status.unsupported,true);
 assert.equal(eligible(rng,initialState(settings),settings),false);
});
test("Equipe Sacrieur–Karuta–Sram : ordre d'initiative, un seul tour et mains conservées",()=>{
 const sac=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
 const sram=INITIAL_BUILDS.find(b=>b.classId==="sram");
 const lineup=[eca,sram,sac].map(b=>createTeamContext(b,target));
 let state=optimizeTeamTurn(lineup,target);
 assert.equal(state.turns.length,1);
 assert.deepEqual(state.turns[0].actors.map(a=>a.character),["Mon Sacrieur","Karuta","Matryoshka"]);
 assert.ok(state.turns[0].actors.every(a=>a.spent<=a.availablePA));
 const initialHand=state.session.actors.find(a=>a.id===eca.id).state.ecaHand;
 state=optimizeTeamTurn(lineup,target,()=>{},state);
 assert.equal(state.turns.length,2);
 assert.ok(Array.isArray(initialHand));
 assert.ok(Array.isArray(state.session.actors.find(a=>a.id===eca.id).state.ecaHand));
});

test("Baraka première pioche conserve sa Dame, puis joue les Trèfles si la main en contenait déjà",()=>{
 const baraka=spell("Baraka");
 let state=initialState(settings);
 state=castSpell(state,baraka,settings);
 assert.deepEqual(state.ecaHand,[{suit:"club",rank:3}]);
 assert.equal(state.buffs.filter(b=>b.stat==="Critique").length,0);
 state=endTurn(state,settings);
 state=castSpell(state,baraka,settings);
 assert.deepEqual(state.ecaHand,[{suit:"club",rank:3}]);
 assert.equal(state.ecaTable.length,1);
 assert.ok(state.buffs.some(b=>b.stat==="Critique"&&b.amount===6));
});

test("les sorts Terre choisis peuvent générer Valet, Dame, Roi, As de Carreau",()=>{
 const expected=[["Pile ou Face",2],["Belote",3],["Lapement",4],["Destin d'Ecaflip",5]];
 for(const [name,rank] of expected){
  const picked=spell(name);
  assert.ok(picked);
  assert.deepEqual(picked.drawCard,["diamond",rank]);
  assert.ok(picked.min>0);
  assert.equal(picked.damageSource,"active-build-stats");
 }
});

test("main jouée : buffs Trèfle actifs trois tours puis expirent",()=>{
 const baraka=spell("Baraka");
 let state=initialState(settings);
 state.ecaHand=[{suit:"club",rank:2}];
 state=castSpell(state,baraka,settings);
 assert.ok(state.buffs.some(b=>b.stat==="Critique"&&b.amount===4));
 state=endTurn(state,settings);
 assert.ok(state.buffs.some(b=>b.stat==="Critique"&&b.amount===4));
 state=endTurn(state,settings);
 assert.ok(state.buffs.some(b=>b.stat==="Critique"&&b.amount===4));
 state=endTurn(state,settings);
 assert.ok(!state.buffs.some(b=>b.stat==="Critique"&&b.amount===4));
});

test("Karuta ne calcule qu'un tour par clic même quand elle a une main en cours",()=>{
 let prev=null;
 for(let i=0;i<3;i++){
  prev=optimizeTeamTurn([context],target,()=>{},prev);
  assert.equal(prev.turns.length,i+1);
  assert.ok(prev.turns.every(t=>t.actors[0].spent<=t.actors[0].availablePA));
  assert.ok(prev.session.actors[0].state.ecaHand.length<=4);
 }
});
