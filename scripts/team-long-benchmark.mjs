import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";

const target=cleanTeamTarget({turns:10,hp:1_000_000_000_000,criticals:true});
const contexts=INITIAL_BUILDS.map(build=>createTeamContext(build,target));
for(const setting of [
 {mode:"fast",horizon:10,effort:"balanced"},
 {mode:"long",horizon:10,effort:"balanced"}
]){
 let previous=null;
 const start=Date.now();
 for(let n=0;n<3;n++)
  previous=optimizeTeamTurn(contexts,target,()=>{},previous,setting);
 const summary={mode:setting.mode,elapsedMs:Date.now()-start,
  damage:previous.theoretical,average:Math.round(previous.theoretical/3*10)/10,
  rounds:previous.turns.map(turn=>({
   turn:turn.number,damage:turn.theoretical,
   actors:turn.actors.map(a=>({
    name:a.character,damage:a.damage,actions:a.actions.map(x=>x.name)
   }))
  }))
 };
 console.log("BENCHMARK_TEAM "+JSON.stringify(summary));
}
