import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {newManualDraft,previewManualDraft,manualSpellChoices,chooseManualSpell,
 undoManualSpell,resetManualActor,nextManualActor,setManualTurnPA} from "../src/team-manual.js";
const target=cleanTeamTarget({turns:100,hp:1_000_000_000_000,criticals:true});
const ctx=INITIAL_BUILDS.map(build=>createTeamContext(build,target));
test("Choix manuel : chaque sort doit respecter PA, variantes, cooldowns et coups critiques",()=>{
 let draft=newManualDraft(ctx,target);
 const {current,state}=previewManualDraft(ctx,target,draft);
 assert.equal(current.build.classId,"sacrieur");
 assert.equal(state.turn,1);
 const choices=manualSpellChoices(ctx,target,draft);
 assert.ok(choices.some(sp=>sp.enabled));
 assert.ok(choices.every(sp=>sp.name&&Number.isFinite(sp.pa)));
 const playable=choices.find(sp=>sp.enabled&&sp.pa>0);
 assert.ok(playable);
 draft=chooseManualSpell(ctx,target,draft,playable.id);
 const after=previewManualDraft(ctx,target,draft);
 assert.equal(after.state.actions.length,1);
 assert.equal(after.state.actions[0].name,playable.name);
 assert.ok(after.state.pa<=state.pa);
 assert.ok(after.result.turns[0].actors[0].damage>=0);
 assert.throws(()=>chooseManualSpell(ctx,target,draft,"sort-inexistant"),/non disponible/i);
});
test("Le bouton annuler restaure exactement la simulation et les PA",()=>{
 const initial=newManualDraft(ctx,target);
 const before=previewManualDraft(ctx,target,initial);
 const first=manualSpellChoices(ctx,target,initial).find(sp=>sp.enabled&&sp.pa>0);
 const played=chooseManualSpell(ctx,target,initial,first.id);
 const undone=undoManualSpell(ctx,target,played);
 assert.deepEqual(undone.actions,initial.actions);
 const after=previewManualDraft(ctx,target,undone);
 assert.equal(after.state.pa,before.state.pa);
 assert.equal(after.state.total,before.state.total);
 assert.deepEqual(after.state.buffs,before.state.buffs);
 assert.deepEqual(after.state.ready,before.state.ready);
 assert.deepEqual(resetManualActor(ctx,target,played).actions,initial.actions);
});
test("Le mode manuel garde l'initiative et valide exactement un tour d'équipe à la fois",()=>{
 let last=null;
 for(let round=1;round<=3;round++){
  let draft=newManualDraft(ctx,target,last);
  const order=previewManualDraft(ctx,target,draft).order.map(x=>x.build.character);
  assert.deepEqual(order,["Mon Sacrieur","Karuta","Matryoshka"]);
  for(let i=0;i<order.length;i++){
   const first=manualSpellChoices(ctx,target,draft).find(sp=>sp.enabled&&sp.damage>0);
   if(first)draft=chooseManualSpell(ctx,target,draft,first.id);
   const next=nextManualActor(ctx,target,draft);
   if(i<order.length-1){
    assert.ok(next.draft);
    assert.equal(next.result,null);
    draft=next.draft;
   }else{
    assert.equal(next.draft,null);
    assert.ok(next.result);
    last=next.result;
   }
  }
  assert.equal(last.turns.length,round);
  assert.equal(last.session.actors.length,3);
  for(const actor of last.turns.at(-1).actors)
   assert.ok(actor.spent>=0&&actor.spent<=actor.availablePA+1e-8);
  assert.ok(last.members.every(member=>member.estimated>=0));
 }
 assert.equal(last.finished,false);
});
test("L'aperçu reste local : aucun futur tour n'est validé sans Terminer",()=>{
 const draft=newManualDraft(ctx,target);
 const {result}=previewManualDraft(ctx,target,draft);
 assert.equal(result.turns.length,1);
 assert.ok(result.previewStates);
 const stored=nextManualActor(ctx,target,nextManualActor(ctx,target,draft).draft);
 assert.equal(stored.draft.cursor,2);
 const completed=nextManualActor(ctx,target,stored.draft);
 assert.equal(completed.result.turns.length,1);
 assert.equal(completed.result.previewStates,undefined);
});
test("Mode manuel : les effets d'un sort restent suivis après validation du tour",()=>{
 let draft=newManualDraft(ctx,target),prior=null;
 const current=previewManualDraft(ctx,target,draft).current;
 const buff=manualSpellChoices(ctx,target,draft).find(sp=>sp.name==="Mutilation");
 if(buff?.enabled)draft=chooseManualSpell(ctx,target,draft,buff.id);
 for(let i=0;i<3;i++){
  const step=nextManualActor(ctx,target,draft);
  draft=step.draft;prior=step.result;
  if(!draft)break;
 }
 assert.ok(prior);
 const state=prior.session.actors.find(a=>a.id===current.build.id).state;
 if(buff?.enabled)assert.ok(state.buffs.some(b=>b.key==="Mutilation"));
 let next=newManualDraft(ctx,target,prior);
 assert.equal(previewManualDraft(ctx,target,next).state.turn,2);
});

test("Choix manuel : PA réglables directement de 1 à 30 pour le personnage en cours",()=>{
 let draft=newManualDraft(ctx,target);
 const first=previewManualDraft(ctx,target,draft);
 assert.equal(first.actor.availablePA,12);
 draft=setManualTurnPA(ctx,target,draft,16);
 const changed=previewManualDraft(ctx,target,draft);
 assert.equal(changed.actor.availablePA,16);
 assert.equal(changed.state.pa,16);
 assert.equal(draft.paOverrides[changed.current.build.id],16);
 const choices=manualSpellChoices(ctx,target,draft);
 const playable=choices.find(sp=>sp.enabled&&sp.pa>=2);
 assert.ok(playable);
 draft=chooseManualSpell(ctx,target,draft,playable.id);
 const after=previewManualDraft(ctx,target,draft);
 assert.equal(after.actor.availablePA,16);
 assert.equal(after.state.pa,16-playable.pa);
 assert.throws(()=>setManualTurnPA(ctx,target,draft,1),/Annule le dernier sort|augmente les PA/);
 assert.equal(previewManualDraft(ctx,target,draft).state.pa,after.state.pa);
 assert.throws(()=>setManualTurnPA(ctx,target,draft,0),/entre 1 et 30/);
 assert.throws(()=>setManualTurnPA(ctx,target,draft,31),/entre 1 et 30/);
 assert.throws(()=>setManualTurnPA(ctx,target,draft,2.5),/entre 1 et 30/);
 assert.throws(()=>setManualTurnPA(ctx,target,draft,""),/entre 1 et 30/);
 const rollback=undoManualSpell(ctx,target,draft);
 assert.equal(previewManualDraft(ctx,target,rollback).state.pa,16);
});
test("Les PA manuels sont indépendants pour chaque personnage et ne changent ni build ni tour suivant",()=>{
 let draft=newManualDraft(ctx,target);
 draft=setManualTurnPA(ctx,target,draft,15);
 const firstId=previewManualDraft(ctx,target,draft).current.build.id;
 let step=nextManualActor(ctx,target,draft);draft=step.draft;
 const second=previewManualDraft(ctx,target,draft);
 assert.equal(second.actor.availablePA,ctx.find(x=>x.build.id===second.current.build.id).settings.ap);
 draft=setManualTurnPA(ctx,target,draft,7);
 const secondId=previewManualDraft(ctx,target,draft).current.build.id;
 assert.equal(draft.paOverrides[firstId],15);
 assert.equal(draft.paOverrides[secondId],7);
 step=nextManualActor(ctx,target,draft);draft=step.draft;
 const third=previewManualDraft(ctx,target,draft);
 assert.equal(third.actor.availablePA,12);
 step=nextManualActor(ctx,target,draft);
 const committed=step.result;
 assert.equal(committed.turns.length,1);
 assert.equal(committed.turns[0].actors.find(a=>a.id===firstId).availablePA,15);
 assert.equal(committed.turns[0].actors.find(a=>a.id===secondId).availablePA,7);
 assert.deepEqual(ctx.map(c=>c.settings.ap),[12,12,12]);
 const nextDraft=newManualDraft(ctx,target,committed);
 assert.deepEqual(nextDraft.paOverrides,{});
 assert.equal(previewManualDraft(ctx,target,nextDraft).actor.availablePA,12);
});
