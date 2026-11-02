import assert from "node:assert/strict";
import {CLASSES,INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {newManualDraft,manualSpellChoices} from "../src/team-manual.js";
const target=cleanTeamTarget({hp:1e12,turns:10,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
for(const build of INITIAL_BUILDS){
 const b=normalizeBuild(build),cls=CLASSES[b.classId];
 const context=createTeamContext(b,target);
 assert.equal(cls.pairs.length,22);
 assert.equal(cls.spells.length,44);
 const allNames=cls.pairs.flat();
 assert.equal(new Set(allNames).size,44,b.classId+" spell names distinct");
 assert.deepEqual(new Set(allNames),new Set(cls.spells.map(s=>s.name)));
 assert.deepEqual(new Set(allNames),new Set(context.spells.filter(s=>!s.isWeapon).map(s=>s.name)));
 const draft=newManualDraft([context],target),shown=manualSpellChoices([context],target,draft);
 const expected=cls.pairs.map((pair,i)=>b.variants[i]);
 const selected=shown.filter(s=>!s.isWeapon);
 const hidden=allNames.filter(n=>!selected.some(s=>s.name===n));
 const unsupported=context.spells.filter(s=>s.status?.unsupported).map(s=>s.name);
 const selectedUnavailable=selected.filter(s=>!s.enabled);
 console.log("MANUAL_3CLASS_AUDIT "+JSON.stringify({id:b.id,classId:b.classId,selectedCount:selected.length,
  weapon:shown.filter(s=>s.isWeapon).map(s=>s.name),hiddenCount:hidden.length,hidden,unsupported,
  selectedUnavailable:selectedUnavailable.map(s=>({name:s.name,reason:s.reason})),
  expected,griffe:shown.find(s=>s.name==="Griffe Invocatrice")||null}));
}
