import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {classifyHand,rekopBaseHits,estimatedCardFutureValue} from "../src/ecaflip-cards.js";

const target={hp:1_000_000_000_000,turns:50,criticals:true,
 resistances:{Air:0,Eau:0,Feu:0,Terre:0,Neutre:0}};
const karuta=INITIAL_BUILDS.find(b=>b.classId==="ecaflip");
const ctx=createTeamContext(karuta,target);
const lookup=name=>{
 const spell=ctx.spells.find(s=>s.name===name);
 assert.ok(spell, "missing "+name);return spell;
};
function sequence(seed,actions){
 let state=seed;
 for(const name of actions){
  const spell=lookup(name);
  assert.ok(eligible(spell,state,ctx.settings),name+
   " unavailable in round "+state.turn+" with "+state.pa+" PA");
  state=castSpell(state,spell,ctx.settings);
 }
 return state;
}

test("4 Trèfles : Valet-Dame-Roi-As produces FOUR Rekop water hits",()=>{
 const full=[2,3,4,5].map(rank=>({suit:"club",rank}));
 assert.equal(classifyHand(full).kind,"flush-straight");
 const hits=rekopBaseHits(full);
 assert.equal(hits.length,4,"Rekop ne doit pas compter une seule frappe");
 assert.ok(hits.every(hit=>hit.element==="Eau"&&hit.base===14));
 const future=estimatedCardFutureValue(full,ctx.settings.ecaflipStats);
 assert.ok(future>0);
});

test("Infortune adds conditional delayed water damage at the end of the round",()=>{
 let s=sequence(initialState(ctx.settings),["Infortune"]);
 assert.ok(s.dots["eca-infortune:1:eca-6-1"]);
 const direct=s.total;
 const before=s.turn;
 s=endTurn(s,ctx.settings);
 assert.ok(s.total>direct+100);
 assert.equal(s.turn,before+1);
 const tick=s.turns[0].ticks.find(t=>t.name==="Infortune");
 assert.ok(tick?.damage>100);
 assert.equal(s.turns[0].poison,tick.damage);
});

test("Griffe Joueuse reduces enemy critical resistance for subsequent critical hits",()=>{
 const grin=lookup("Griffe Joueuse");
 let s=sequence(initialState(ctx.settings),["Yams","Yams"]);
 const baseline=castSpell(s,lookup("Kraps"),ctx.settings);
 s=castSpell(s,grin,ctx.settings);
 assert.ok(s.enemyCriticalShreds.some(x=>x.amount>=31));
 assert.ok(s.actions.at(-1).notes.some(n=>n.includes("résistances critiques")));
 const after=castSpell(s,lookup("Kraps"),ctx.settings);
 assert.ok(after.total-s.total>baseline.total-sequence(initialState(ctx.settings),["Yams","Yams"]).total);
});

test("script réel en 3 tours : 4 trèfles -> Baraka -> Tout ou Rien -> Rekop",()=>{
 let s=initialState(ctx.settings);
 s=sequence(s,["Yams","Kraps","Griffe Joueuse","Kraps"]);
 assert.deepEqual(s.ecaHand.map(c=>c.rank).sort(),[2,3,4]);
 s=endTurn(s,ctx.settings);
 s=sequence(s,["Infortune","Griffe Joueuse","Kraps"]);
 assert.deepEqual(s.ecaHand.map(c=>c.rank).sort(),[2,3,4,5]);
 assert.ok(s.turnDamage>0);
 s=endTurn(s,ctx.settings);
 const t3start=s.total;
 s=sequence(s,["Baraka"]);
 assert.ok(s.buffs.some(b=>b.stat==="Eau"&&b.amount===140),
  "la suite Royale des 4 trèfles confère +140 Chance");
 assert.equal(s.ecaTable.length,4);
 assert.deepEqual(s.ecaTable.map(c=>c.rank).sort(),[2,3,4,5]);
 assert.deepEqual(s.ecaHand.map(c=>c.rank),[3],"Baraka tire une nouvelle Dame APRÈS la suite");
 s=sequence(s,["Tout ou Rien"]);
 assert.deepEqual(s.ecaHand.map(c=>c.rank).sort(),[2,3,4,5]);
 const beforeRekop=s.total;
 s=sequence(s,["Rekop"]);
 assert.ok(s.total-beforeRekop>1000,"les quatre impacts doivent être comptés");
 assert.equal(s.ecaHand.length,0);
 s=sequence(s,["Yams"]);
 s=endTurn(s,ctx.settings);
 assert.equal(s.turns.length,3);
 assert.ok(s.total>t3start);
 console.log("KARUTA REFERENCE COMBO",JSON.stringify({
  total:s.total,rounds:s.turns.map(t=>({damage:t.total,
   actions:t.actions.map(a=>a.name),ticks:t.ticks}))
 }));
});
test("team scheduler chooses cards or attacks while keeping one round per click",()=>{
 let res=null;
 const summaries=[];
 for(let i=0;i<3;i++){
  res=optimizeTeamTurn([ctx],target,()=>{},res);
  const actor=res.turns.at(-1).actors[0];
  const state=res.session.actors[0].state;
  summaries.push({turn:i+1,names:actor.actions.map(a=>a.name),
   damage:actor.damage,hand:state.ecaHand,table:state.ecaTable});
 }
 assert.equal(res.turns.length,3);
 assert.ok(summaries.every(x=>x.damage>0));
 const handAtFirst=summaries[0].hand.filter(c=>c.suit==="club").map(c=>c.rank).sort();
 const handAtSecond=summaries[1].hand.filter(c=>c.suit==="club").map(c=>c.rank).sort();
 assert.deepEqual(handAtFirst,[2,3,4],"Tour 1 : constituer les trois premiers Trèfles");
 assert.deepEqual(handAtSecond,[2,3,4,5],"Tour 2 : préparer la Main complète");
 const names=summaries[2].names;
 const triple=["Baraka","Tout ou Rien","Rekop"];
 assert.ok(triple.every(name=>names.includes(name)),"Tour 3 : dérouler Baraka / Tout ou Rien / Rekop");
 assert.ok(names.indexOf("Baraka")<names.indexOf("Tout ou Rien")&&
  names.indexOf("Tout ou Rien")<names.indexOf("Rekop"));
 console.log("KARUTA OPTIMIZED THREE ROUNDS",JSON.stringify(summaries));
});

test("audit multi-cycle Karuta: log every round and confirm a SECOND 4-club Rekop within 10 turns",()=>{
 let session=null;
 const history=[];
 for(let i=1;i<=10;i++){
  session=optimizeTeamTurn([ctx],target,()=>{},session);
  const actor=session.turns.at(-1).actors[0];
  const state=session.session.actors[0].state;
  history.push({
   turn:i,actions:actor.actions.map(a=>a.name),damage:actor.damage,
   hand:state.ecaHand.map(c=>c.suit+":"+c.rank),
   table:state.ecaTable.map(c=>c.suit+":"+c.rank),
   buffs:state.buffs.filter(b=>b.until>=state.turn).map(b=>b.key)
  });
  assert.equal(session.turns.length,i,"one team round per click");
  assert.ok(actor.spent<=actor.availablePA);
 }
 console.log("KARUTA TEN ROUND AUDIT",JSON.stringify(history));
 const cycles=history.filter(row=>row.actions.includes("Rekop")&&
  row.actions.includes("Baraka")&&row.actions.includes("Tout ou Rien"));
 assert.ok(cycles.length>=2,
  "Karuta doit reconstruire la suite Royale et rejouer Rekop sur 10 tours");
});
