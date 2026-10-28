import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn,cleanTeamTarget} from "../src/team-core.js";

const target=cleanTeamTarget({
 hp:1_000_000_000_000,turns:100,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}
});
const lineup=INITIAL_BUILDS.map(build=>createTeamContext(build,target));
const named=Object.fromEntries(INITIAL_BUILDS.map(b=>[b.classId,b.id]));
const histories={ecaflip:[],sram:[],sacrieur:[]};
const legacyUnrestricted={mode:"fast",horizon:10,effort:"balanced",minHpPercent:0};
test("100 sequential team rounds: Eca recurring four-club combos and Sram/Sacrier buff health",()=>{
 assert.equal(target.turns,100);
 assert.ok(lineup.every(c=>c.settings.turns===100));
 let previous=null;
 for(let i=1;i<=100;i++){
  previous=optimizeTeamTurn(lineup,target,()=>{},previous,legacyUnrestricted);
  assert.equal(previous.turns.length,i,"exactly ONE team round per call");
  assert.equal(previous.session.actors.length,3);
  for(const [classId,id] of Object.entries(named)){
   const a=previous.turns.at(-1).actors.find(x=>x.id===id);
   const session=previous.session.actors.find(x=>x.id===id);
   assert.ok(a&&session);
   assert.equal(session.state.turn,i+1,"turn continuity "+classId+" T"+i);
   assert.ok(a.spent>=0&&a.spent<=a.availablePA+1e-8,
    "net PA not legal "+classId+" T"+i);
   assert.ok(Number.isFinite(a.damage)&&a.damage>=0,
    "invalid damage "+classId+" T"+i);
   histories[classId].push({
    turn:i,names:a.actions.map(x=>x.name),damage:a.damage,
    buffs:session.state.buffs.map(b=>({key:b.key,until:b.until,stat:b.stat})),
    ready:session.state.ready,hand:session.state.ecaHand,table:session.state.ecaTable,
    suffering:session.state.sacrierHealth?.suffering??null,
    stage:session.state.mutilationStage
   });
  }
 }
 for(const [classId,entries] of Object.entries(histories)){
  const usage={};
  for(const t of entries)for(const name of t.names)usage[name]=(usage[name]||0)+1;
  console.log("100-ROUND-"+classId.toUpperCase()+"-SPELL-COUNTS",JSON.stringify(usage));
  console.log("100-ROUND-"+classId.toUpperCase()+"-SAMPLES",
   JSON.stringify(entries.filter(x=>x.turn<=9||x.turn%10===0||x.turn>=96).map(x=>({
    turn:x.turn,names:x.names,active:x.buffs.map(b=>b.key),
    hand:x.hand.map(c=>c.suit+":"+c.rank),suffering:x.suffering,stage:x.stage}))));
 }
 const eca=histories.ecaflip;
 // Once a fifth draw plays the full hand automatically, the original
 // four-club Rekop cadence [T3,T5,T7,T9] is not forced. Verify the
 // continuous 100-round combat model instead of obsolete exact combos.
 assert.ok(eca.every(x=>x.hand.length<=4),
  "Ecaflip cannot retain five or more cards in the Hand");
 assert.ok(eca.every(x=>x.table.length<=12),
  "Cards on the Table must expire and cannot grow without bound");
 assert.ok(eca.some(x=>x.names.includes("Griffe Joueuse")||
  x.names.includes("Baraka")||x.names.includes("Kraps")),
  "Ecaflip retains nontrivial cards and buffs");
 assert.ok(eca.every(x=>Number.isFinite(x.damage)&&x.damage>=0));
 const sram=histories.sram;
 const maniganceRounds=sram.filter(row=>row.names.includes("Manigance"))
  .map(row=>row.turn);
 assert.ok(maniganceRounds.length>=30,"Sram lost regular Manigance refresh");
 assert.equal(maniganceRounds[0],1);
 assert.ok(maniganceRounds.every((n,i)=>i===0||n-maniganceRounds[i-1]===3),
  "Sram must NEVER cast Manigance while its three-round buff remains active");
 for(const t of sram){
  const active=t.buffs.filter(b=>b.key==="Manigance");
  assert.ok(active.length<=1,"Manigance is not stackable at turn "+t.turn);
  if(t.turn<=97&&t.names.includes("Manigance"))
   assert.ok(active.length===1&&active[0].until===t.turn+2,
    "Sram must get 3 turns of buff, neither shorter nor longer");
 }
 const sacri=histories.sacrieur;
 const mutilations=sacri.filter(t=>t.names.includes("Mutilation"));
 assert.deepEqual(mutilations.map(t=>t.turn),[1],
  "Sacrier must cast its persistent Mutilation ONCE, not deactivate it later");
 const berserk=sacri.filter(t=>t.names.includes("Berserk"));
 assert.ok(berserk.length>2,"Sacrier must consider reactivating Berserk when appropriate");
 for(const t of sacri){
  const permanent=t.buffs.filter(b=>b.key==="Mutilation");
  assert.equal(permanent.length,1,"Sacrier lost Mutilation at turn "+t.turn);
  assert.equal(permanent[0].until,Number.MAX_SAFE_INTEGER);
  const furie=t.buffs.filter(b=>b.key==="Furie");
  assert.ok(furie.length<=2,"Furie maximum 2 stacks violated on turn "+t.turn);
  assert.ok(furie.every(b=>b.until>=t.turn+1),
   "Furie contains an expired stack on turn "+t.turn);
  const castCount=t.names.filter(name=>name==="Furie").length;
  assert.ok(castCount<=2,"Furie casts per turn exceed spell limit");
  if(castCount>0)assert.ok(furie.length>0,
   "Furie casts should refresh a timed damage buff");
  assert.ok(t.stage>=0&&t.stage<=3);
  assert.ok(t.suffering>=0&&t.suffering<=10);
 }
 assert.equal(previous.finished,true);
 assert.throws(()=>optimizeTeamTurn(lineup,target,()=>{},previous,legacyUnrestricted),
  /terminé|recommence/i,"101st click must not calculate a new round");
 assert.ok(previous.theoretical>0);
});
