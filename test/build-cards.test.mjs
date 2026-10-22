import test from "node:test";
import assert from "node:assert/strict";
import {renderBuildCards} from "../src/build-cards.js";

const classes={
 sram:{name:"Sram",glyph:"☽",color:"#b6a0ff"},
 sacrieur:{name:"Sacrieur",glyph:"◆",color:"#fb9a91"}
};
const builds=[
 {id:"sram-air-pvm",classId:"sram",character:"Matryoshka",name:"Air PvM",level:200,element:"Air",ap:12,turns:10},
 {id:"sacri-air-pvm",classId:"sacrieur",character:"Mon Sacrieur",name:"Air PvM",level:200,element:"Air",ap:12,turns:10}
];
test("one portrait tile per build with the correct character and build labels",()=>{
 const html=renderBuildCards(builds,"sram-air-pvm",classes);
 assert.equal((html.match(/<article class="build-card/g)||[]).length,2);
 assert.match(html,/Matryoshka/);
 assert.match(html,/Mon Sacrieur/);
 assert.equal((html.match(/Image à venir/g)||[]).length,2);
 assert.equal((html.match(/class="build-card-portrait"/g)||[]).length,2);
 assert.doesNotMatch(html,/<img\b/);
});
test("selection, clone and rename are still available for every card",()=>{
 const html=renderBuildCards(builds,"sram-air-pvm",classes);
 for(const {id} of builds){
  assert.ok(html.includes('data-open-build="'+id+'"'));
  assert.ok(html.includes('data-clone-build="'+id+'"'));
  assert.ok(html.includes('data-rename-build="'+id+'"'));
 }
 assert.equal((html.match(/class="build-card-select"/g)||[]).length,2);
});
test("only the chosen build is visually selected",()=>{
 const first=renderBuildCards(builds,"sram-air-pvm",classes);
 assert.equal((first.match(/class="build-card is-active"/g)||[]).length,1);
 assert.equal((first.match(/✓ Build actif/g)||[]).length,1);
 const second=renderBuildCards(builds,"sacri-air-pvm",classes);
 assert.match(second,/data-open-build="sacri-air-pvm" aria-pressed="true"/);
 assert.match(second,/data-open-build="sram-air-pvm" aria-pressed="false"/);
});
test("new builds automatically get their own tile",()=>{
 const many=Array.from({length:8},(_,i)=>({...builds[0],id:"build-"+i,character:"Perso "+i}));
 const html=renderBuildCards(many,"build-5",classes);
 assert.equal((html.match(/<article class="build-card/g)||[]).length,8);
 assert.ok(html.includes("Perso 7"));
});
test("build names and ids cannot inject HTML into a card",()=>{
 const unsafe={...builds[0],id:'x" onclick="alert(1)',character:"<script>bad</script>",name:"PvM & duel"};
 const html=renderBuildCards([unsafe],unsafe.id,classes);
 assert.doesNotMatch(html,/<script>|onclick="alert/);
 assert.match(html,/&lt;script&gt;bad&lt;\/script&gt;/);
 assert.match(html,/PvM &amp; duel/);
 assert.match(html,/data-open-build="x&quot; onclick=&quot;alert\(1\)"/);
});
test("an unsupported class is skipped and no tiles appear for an empty list",()=>{
 assert.equal(renderBuildCards([],null,classes),"");
 assert.equal(renderBuildCards([{...builds[0],classId:"unknown"}],"nope",classes),"");
});
