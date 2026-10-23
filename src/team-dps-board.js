/** Classement des dégâts cumulés, sans dépendance à des PV de cible. */
export function cumulativeDamageStandings(result,activeTurn){
 if(!result||!Array.isArray(result.members)||!Array.isArray(result.turns))return [];
 const until=Math.max(0,Math.min(result.turns.length,Math.trunc(activeTurn)||0));
 const rows=new Map(result.members.map((member,index)=>[
  String(member.id),{id:String(member.id),character:member.character||"Personnage",
   total:0,turnDamage:0,order:index}
 ]));
 for(const turn of result.turns.slice(0,until)){
  for(const actor of turn.actors||[]){
   const member=rows.get(String(actor.id));
   if(!member)continue;
   member.total+=Number.isFinite(Number(actor.damage))?Number(actor.damage):0;
   if(turn.number===until)member.turnDamage=Number(actor.damage)||0;
  }
 }
 return [...rows.values()].map(member=>({
  ...member,total:Math.round(member.total*10)/10,
  turnDamage:Math.round(member.turnDamage*10)/10
 })).sort((a,b)=>b.total-a.total||a.order-b.order)
   .map((member,index)=>({...member,rank:index+1}));
}

export function renderDamageLeaderboard(result,activeTurn,{safe,fmt}){
 const standings=cumulativeDamageStandings(result,activeTurn);
 if(!standings.length)
  return '<p class="team-placeholder">Le classement des dégâts cumulés apparaîtra après le calcul du tour 1.</p>';
 const maximum=Math.max(1,...standings.map(member=>member.total));
 return '<div class="team-dps-board">'+
  '<div class="team-dps-intro"><span>Après le tour '+activeTurn+
  '</span><small>Classement par dégâts cumulés</small></div>'+
  '<div class="team-dps-list" role="list" aria-label="Classement des dégâts cumulés">'+
  standings.map(member=>{
   const percent=Math.max(0,Math.min(100,100*member.total/maximum));
   const score=String(member.total);
   const increment=(member.turnDamage>=0?"+":"")+fmt(member.turnDamage);
   return '<div class="team-dps-row'+(member.rank===1?' is-leader':'')+
    '" role="listitem" data-dps-id="'+safe(member.id)+'" data-dps-score="'+score+
    '" data-dps-rank="'+member.rank+'" aria-label="'+
     safe('Rang '+member.rank+', '+member.character+', '+fmt(member.total)+' dégâts cumulés')+'">'+
    '<span class="team-dps-rank">'+String(member.rank).padStart(2,"0")+'</span>'+
    '<div class="team-dps-main"><div class="team-dps-info">'+
    '<strong class="team-dps-name">'+safe(member.character)+'</strong>'+
    '<span class="team-dps-turn">Tour '+activeTurn+' : '+increment+'</span></div>'+
    '<div class="team-dps-track"><div class="team-dps-fill" style="width:'+percent.toFixed(2)+'%"></div></div></div>'+
    '<strong class="team-dps-value">'+fmt(member.total)+'</strong></div>';
  }).join("")+'</div></div>';
}

/**
 * Les lignes sont reconstruites dans le nouveau classement.
 * La technique FLIP anime leur ancienne position vers la nouvelle, tandis
 * que le compteur et les barres augmentent progressivement. En mode réduit
 * ou sans API d'animation, l'information finale reste immédiatement visible.
 */
export function updateDamageLeaderboard(root,result,activeTurn,formatters){
 if(!root)return;
 const hasDOM=typeof root.querySelectorAll==="function";
 const existing=hasDOM?[...root.querySelectorAll(".team-dps-row")]:[];
 const previous=new Map(existing.map(row=>[
  row.getAttribute("data-dps-id"),
  {top:typeof row.getBoundingClientRect==="function"?row.getBoundingClientRect().top:null,
   score:Number(row.getAttribute("data-dps-score"))||0,
   rank:Number(row.getAttribute("data-dps-rank"))||0}
 ]));
 root.innerHTML=renderDamageLeaderboard(result,activeTurn,formatters);
 const raf=typeof requestAnimationFrame==="function"?requestAnimationFrame:null;
 const reduceMotion=typeof window!=="undefined"&&typeof window.matchMedia==="function"&&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(!hasDOM||!raf||reduceMotion)return;
 const rows=[...root.querySelectorAll(".team-dps-row")];
 const max=Math.max(1,...rows.map(row=>Number(row.getAttribute("data-dps-score"))||0));
 for(const row of rows){
  const key=row.getAttribute("data-dps-id"),old=previous.get(key);
  const current=Number(row.getAttribute("data-dps-score"))||0;
  const rank=Number(row.getAttribute("data-dps-rank"));
  const scoreNode=row.querySelector(".team-dps-value");
  const bar=row.querySelector(".team-dps-fill");
  if(!scoreNode||!bar)continue;
  const fromScore=old?.score??0;
  if(old?.top!=null&&typeof row.getBoundingClientRect==="function"){
   const dy=old.top-row.getBoundingClientRect().top;
   if(Math.abs(dy)>1&&typeof row.animate==="function")
    row.animate([{transform:"translateY("+dy+"px)"},{transform:"translateY(0)"}],
     {duration:680,easing:"cubic-bezier(.22,1,.36,1)"});
  }
  if(old&&rank<old.rank){
   row.classList.add("is-overtaking");
   if(typeof row.addEventListener==="function")
    row.addEventListener("animationend",()=>row.classList.remove("is-overtaking"),{once:true});
  }
  if(Math.abs(fromScore-current)<.05)continue;
  const targetPercent=Math.max(0,Math.min(100,current/max*100));
  bar.style.transition="none";
  bar.style.width=(Math.max(0,Math.min(100,fromScore/max*100))).toFixed(2)+"%";
  const start=typeof performance!=="undefined"&&typeof performance.now==="function"?performance.now():0;
  scoreNode.textContent=formatters.fmt(fromScore);
  raf(now=>{
   bar.style.transition="";
   bar.style.width=targetPercent.toFixed(2)+"%";
   if(!Number.isFinite(now)||!start){scoreNode.textContent=formatters.fmt(current);return;}
   const update=time=>{
    const t=Math.max(0,Math.min(1,(time-start)/650));
    const eased=1-Math.pow(1-t,3);
    scoreNode.textContent=formatters.fmt(fromScore+(current-fromScore)*eased);
    if(t<1)raf(update);
    else scoreNode.textContent=formatters.fmt(current);
   };
   update(now);
  });
 }
}
