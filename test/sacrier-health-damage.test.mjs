import test from "node:test";
import assert from "node:assert/strict";
import {sufferingLevel,sufferingFinalBonus,initialSacrierHealth,sacrificeHealth,restoreHealth} from "../src/sacrier-state.js";
import {INITIAL_BUILDS} from "../src/classes.js";
import {initialState,castSpell,endTurn,snapshotEffects,eligible,cleanSettings,optimize} from "../src/engine.js";
import {createTeamContext,optimizeTeamMember,openingBuffCandidates} from "../src/team-core.js";

const sacrier=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const sram=INITIAL_BUILDS.find(b=>b.classId==="sram");
const getCtx=(turns=15)=>createTeamContext(sacrier,{turns,hp:10000000,criticals:false});
const castByName=(state,ctx,name)=>{
 const spell=ctx.spells.find(s=>s.name===name);
 assert.ok(spell,"Spell missing: "+name);
 return castSpell(state,spell,ctx.settings);
};
test("Sacrier suffers one tier per 10% of maximum HP lost",()=>{
 assert.equal(sufferingLevel(4952,4952),0);
 assert.equal(sufferingLevel(4456.8,4952),1);
 assert.equal(sufferingLevel(4456,4952),2);
 assert.equal(sufferingLevel(2228.4,4952),6);
 assert.equal(sufferingLevel(0,4952),10);
 assert.equal(sufferingFinalBonus(4952,4952),0);
 assert.equal(sufferingFinalBonus(2228.4,4952),19);
 assert.equal(sufferingFinalBonus(1,4952),30);
});
test("A Sacrier tracks 12 PA, health, suffering; other classes keep the original damage model",()=>{
 const ctx=getCtx();
 assert.equal(ctx.settings.ap,12);
 assert.equal(ctx.settings.sacrierHealthSimulation,true);
 assert.equal(ctx.settings.sacrierMaxHp,sacrier.stats.hitPoints);
 const initial=initialState(ctx.settings);
 assert.equal(initial.sacrierHealth.hp,4952);
 assert.equal(initial.sacrierHealth.suffering,0);
 const other=createTeamContext(sram,{turns:15});
 assert.equal(other.settings.sacrierHealthSimulation,false);
 assert.equal(initialState(other.settings).sacrierHealth,null);
});
test("Mutilation costs 10% of current HP and stays active beyond 10 turns until Coagulation",()=>{
 const ctx=getCtx(15);
 let state=castByName(initialState(ctx.settings),ctx,"Mutilation");
 assert.equal(state.sacrierHealth.hp,4457);
 assert.equal(state.sacrierHealth.suffering,1);
 assert.equal(state.mutilationStage,1);
 assert.equal(state.buffs.find(x=>x.key==="Mutilation").persistent,true);
 assert.equal(snapshotEffects(state)[0].remaining,null);
 state=endTurn(state,ctx.settings);
 assert.equal(state.mutilationStage,2);
 assert.equal(state.sacrierHealth.hp,4012);
 const atT2=state;
 state=endTurn(state,ctx.settings);
 assert.equal(state.mutilationStage,3);
 for(let i=0;i<10;i++)state=endTurn(state,ctx.settings);
 assert.ok(state.buffs.some(x=>x.key==="Mutilation"),"Persistent buff should survive >10 turns");
 assert.equal(state.mutilationStage,3);
 assert.ok(state.sacrierHealth.hp<atT2.sacrierHealth.hp);
});
test("Coagulation removes Mutilation's power without another sacrifice",()=>{
 const ctx=getCtx(3);
 let s=castByName(initialState(ctx.settings),ctx,"Mutilation");
 s=endTurn(s,ctx.settings);
 const before=s.sacrierHealth.hp;
 const coag=castByName(s,ctx,"Mutilation");
 assert.equal(coag.sacrierHealth.hp,before);
 assert.equal(coag.mutilationStage,0);
 assert.ok(!coag.buffs.some(x=>x.key==="Mutilation"));
 assert.match(coag.actions[0].notes.join(" "),/Coagulation/);
 const next=endTurn(coag,ctx.settings);
 assert.equal(next.sacrierHealth.hp,before);
});
test("Health sacrifice is from CURRENT HP, and healing is capped by maximum HP",()=>{
 const a=initialSacrierHealth(1000);
 const b=sacrificeHealth(a,10);
 const c=sacrificeHealth(b,10);
 assert.equal(b.hp,900);
 assert.equal(c.hp,810);
 assert.equal(restoreHealth(c,190).hp,1000);
 assert.equal(restoreHealth(c,500).hp,1000);
 assert.equal(a.hp,1000);
});
test("Life steal from the DofusBook catalog restores health and may lower suffering",()=>{
 const ctx=getCtx(2);
 const spell=ctx.spells.find(x=>x.name==="Désolation");
 assert.equal(spell.lifeSteal,true);
 let state=initialState(ctx.settings);
 state.sacrierHealth=sacrificeHealth(state.sacrierHealth,40);
 const before=state.sacrierHealth.hp;
 const after=castSpell(state,spell,ctx.settings);
 assert.ok(after.sacrierHealth.hp>before);
 assert.ok(after.sacrierHealth.hp<=state.sacrierHealth.maxHp);
 assert.equal(state.sacrierHealth.hp,before);
 assert.equal(ctx.spells.find(x=>x.name==="Assaut").lifeSteal,false);
});
test("Suffering increases damage using existing DofusBook calibrated values only once",()=>{
 const ctx=getCtx(2),spell=ctx.spells.find(x=>x.name==="Assaut");
 const one=castSpell(initialState(ctx.settings),spell,ctx.settings);
 const wounded=initialState(ctx.settings);
 wounded.sacrierHealth=sacrificeHealth(wounded.sacrierHealth,60);
 const two=castSpell(wounded,spell,ctx.settings);
 assert.ok(two.total>one.total);
 assert.ok(two.total/one.total>1.15);
 assert.ok(two.total/one.total<1.35);
 const disabled=cleanSettings({...ctx.settings,sacrierHealthSimulation:false});
 const legacy=castSpell(initialState(disabled),spell,disabled);
 assert.equal(legacy.total,one.total);
});
test("Fixed resistance is applied before percentage resistance; zero remains backward compatible",()=>{
 const ctx=getCtx(2),spell=ctx.spells.find(x=>x.name==="Assaut");
 const noHP={...ctx.settings,sacrierHealthSimulation:false,resistance:0};
 const raw=castSpell(initialState(noHP),spell,noHP).total;
 const fixed={...noHP,fixedResistances:{Air:20},resistance:0};
 const lowered=castSpell(initialState(fixed),spell,fixed).total;
 assert.ok(Math.abs((raw-lowered)-20)<0.2);
 const combined={...fixed,resistance:20};
 const both=castSpell(initialState(combined),spell,combined).total;
 assert.ok(Math.abs(both-(raw-20)*.8)<0.3);
});
test("PV differences are considered by the search; 15-turn Sacrier run returns legal actions",()=>{
 const ctx=getCtx(15);
 const output=optimizeTeamMember(ctx);
 assert.equal(output.result.turns.length,15);
 assert.ok(Number.isFinite(output.result.total));
 assert.ok(output.result.turns.every(t=>t.spent<=12));
 assert.ok(output.result.turns.some(t=>t.sacrierEndHealth?.suffering>=1));
 for(const turn of output.result.turns){
  if(turn.sacrierEndHealth)assert.ok(turn.sacrierEndHealth.hp>=1);
 }
});


test("Berserk's second cast ends the state rather than taking 70% HP again",()=>{
 const ctx=getCtx(5);
 let state=castByName(initialState(ctx.settings),ctx,"Berserk");
 assert.equal(state.berserkActive,true);
 assert.equal(state.sacrierHealth.hp,1486);
 assert.equal(state.sacrierHealth.suffering,7);
 assert.ok(snapshotEffects(state).some(effect=>effect.name==="Berserk"));
 const mid=endTurn(state,ctx.settings);
 // Spell cooldown may defer recast to a later round; do not bypass legality.
 state=mid;
 const spell=ctx.spells.find(x=>x.name==="Berserk");
 while(!eligible(spell,state,ctx.settings)&&state.turn<5)
  state=endTurn(state,ctx.settings);
 assert.ok(eligible(spell,state,ctx.settings));
 const before=state.sacrierHealth.hp;
 const ended=castSpell(state,spell,ctx.settings);
 assert.equal(ended.berserkActive,false);
 assert.equal(ended.sacrierHealth.hp,before);
 assert.match(ended.actions.at(-1).notes.join(" "),/désactivé/);
});
test("Berserk's 10% spell bonus only applies while active in Souffrance 6+",()=>{
 const ctx=getCtx(2),berserk=ctx.spells.find(x=>x.name==="Berserk"),
  assaut=ctx.spells.find(x=>x.name==="Assaut");
 const active=castSpell(initialState(ctx.settings),berserk,ctx.settings);
 const activeHit=castSpell(active,assaut,ctx.settings);
 const inactive={...active,berserkActive:false};
 const inactiveHit=castSpell(inactive,assaut,ctx.settings);
 assert.ok(activeHit.total>inactiveHit.total);
 assert.ok(Math.abs(activeHit.total/inactiveHit.total-1.1)<0.002);
 const highHealth={...active,sacrierHealth:{hp:4952,maxHp:4952,suffering:0}};
 const noBonus=castSpell(highHealth,assaut,ctx.settings);
 const withoutFlag=castSpell({...highHealth,berserkActive:false},assaut,ctx.settings);
 assert.equal(noBonus.total,withoutFlag.total);
});

test("Permanent Mutilation remains eligible as an offensive opening candidate",()=>{
 const ctx=getCtx(15);
 const names=openingBuffCandidates(ctx).map(spell=>spell.name);
 assert.ok(names.includes("Mutilation"),"Mutilation must not be filtered due to its non-expiring buff");
});


test("Berserk reduces received life-steal healing to 30% while active",()=>{
 const ctx=getCtx(2);
 const berserk=ctx.spells.find(spell=>spell.name==="Berserk");
 const steal=ctx.spells.find(spell=>spell.name==="Désolation");
 assert.ok(berserk&&steal&&steal.lifeSteal);
 const active=castSpell(initialState(ctx.settings),berserk,ctx.settings);
 const inactive={...active,berserkActive:false};
 const gainedActive=castSpell(active,steal,ctx.settings);
 const gainedInactive=castSpell(inactive,steal,ctx.settings);
 const activeHeal=gainedActive.sacrierHealth.hp-active.sacrierHealth.hp;
 const inactiveHeal=gainedInactive.sacrierHealth.hp-inactive.sacrierHealth.hp;
 assert.ok(inactiveHeal>0);
 assert.ok(activeHeal>0);
 assert.ok(activeHeal<inactiveHeal);
 assert.ok(Math.abs(activeHeal/(gainedActive.total/2)-0.3)<0.02);
});
