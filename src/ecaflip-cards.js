/**
 * Écaflip combat cards. Source: DOFUS 3.7 mechanics / user's combo chart.
 * This deterministic subset models rank/suit cards from VERIFIED elemental
 * spells, hand play, three-turn card benefits and winning-hand Rekop.
 * Unknown RNG draws (Roulette, Redistribution, Bonne Pioche, Tarot, Bluff)
 * are not invented: those effects remain out of the DPS solver for now.
 */
export const SUIT_ELEMENT={club:"Eau",heart:"Feu",spade:"Air",diamond:"Terre"};
const RANKS=[2,3,4,5];
export const RANK_BONUS={2:4,3:6,4:8,5:10};
export const HAND_DAMAGE_BONUS={2:2,3:3,4:4,5:5};
const eachCard=(hand,suit)=>hand.filter(c=>c.suit===suit);
export const handKey=hand=>hand.map(c=>c.suit+":"+c.rank).sort().join("|");
export function nextHand(hand,suit,rank){
 if(!suit||!RANKS.includes(rank))return hand.slice();
 if(hand.some(card=>card.suit===suit&&card.rank===rank))return hand.slice();
 // At four cards, cards are played before a new draw; the engine handles
 // the overflow using playHand() rather than silently losing a card.
 return hand.length<4?[...hand,{suit,rank}]:hand.slice();
}
export function cardHandDamageBonus(hand,suit){
 return eachCard(hand,suit).reduce((n,c)=>n+(HAND_DAMAGE_BONUS[c.rank]||0),0);
}
export function classifyHand(hand){
 if(!hand.length)return {kind:"none",power:0};
 const byRank=Object.groupBy?Object.groupBy(hand,c=>c.rank):
  hand.reduce((o,c)=>(o[c.rank]??=[]).push(c),{});
 const counts=Object.values(byRank).map(group=>group.length).sort((a,b)=>b-a);
 const suits=new Set(hand.map(c=>c.suit)),ranks=hand.map(c=>c.rank).sort((a,b)=>a-b);
 const four=hand.length===4;
 if(four&&counts[0]===4)return {kind:"four-of-kind",rank:ranks[0],power:ranks[0]*40};
 if(four&&counts[0]===2&&counts[1]===2){
  const pairRanks=Object.keys(byRank).map(Number).sort((a,b)=>a-b);
  const x=pairRanks[0],y=pairRanks[1];
  const key=x+":"+y;
  const points={"2:3":100,"2:4":120,"2:5":140,"3:4":140,"3:5":160,"4:5":180};
  return {kind:"two-pairs",ranks:pairRanks,power:points[key]||0};
 }
 if(four&&ranks.every((r,i)=>r===i+2)){
  if(suits.size===1)return {kind:"flush-straight",suit:hand[0].suit,power:140};
  if(suits.size===4)return {kind:"rainbow-straight",power:140};
  return {kind:"straight",power:140};
 }
 if(four&&suits.size===4)return {kind:"rainbow",power:80};
 const triple=Object.keys(byRank).map(Number).find(rank=>byRank[rank].length===3);
 if(triple!==undefined)return {kind:"three-of-kind",rank:triple,power:triple===2?80:triple===3?110:triple===4?140:170};
 return {kind:"none",power:0};
}
export function playedHandBonuses(hand){
 const outcome=classifyHand(hand);
 const bonuses=[];
 const threeTurns=3;
 for(const card of hand){
  const stat=card.suit==="club"?"Critique":card.suit==="spade"?"Dommages Poussée":
   card.suit==="heart"?"Soins":"Résistances Critiques";
  const value=card.suit==="club"?RANK_BONUS[card.rank]:(card.rank-1)*10;
  bonuses.push({key:"Carte "+card.suit+card.rank,stat,value,duration:threeTurns});
 }
 if(outcome.power){
  const suit=outcome.kind==="flush-straight"?outcome.suit:
   hand.length===4&&new Set(hand.map(c=>c.suit)).size===1?hand[0].suit:null;
  const allElements=outcome.kind==="rainbow"||outcome.kind==="rainbow-straight"||outcome.kind==="four-of-kind";
  const stat=suit?SUIT_ELEMENT[suit]:"Puissance";
  const points=outcome.power;
  if(allElements){
   for(const element of ["Terre","Feu","Eau","Air"])
    bonuses.push({key:"Combo "+handKey(hand)+":"+element,stat:element,value:points,duration:threeTurns});
  }else bonuses.push({key:"Combo "+handKey(hand),stat,value:points,duration:threeTurns});
 }
 return {bonuses,combo:outcome};
}
export function rekopBaseHits(hand){
 const combo=classifyHand(hand);
 const numbers=hand.map(c=>c.rank);
 const best="Eau"; // replaced at evaluation by the actual best element of the build
 const single=(value,element=best)=>[{element,base:value}];
 if(combo.kind==="four-of-kind"){
  const unit={2:8,3:12,4:16,5:20}[combo.rank]||0;
  return ["Terre","Feu","Eau","Air"].map(element=>({element,base:unit}));
 }
 if(combo.kind==="rainbow"||combo.kind==="rainbow-straight")
  return ["Terre","Feu","Eau","Air"].map(element=>({element,base:combo.kind==="rainbow"?8:14}));
 if(combo.kind==="flush-straight")
  return single(56,SUIT_ELEMENT[combo.suit]);
 if(combo.kind==="straight")return single(54);
 if(combo.kind==="two-pairs"){
  const key=combo.ranks.join(":");
  return single({"2:3":30,"2:4":36,"2:5":42,"3:4":42,"3:5":48,"4:5":72}[key]||0);
 }
 if(combo.kind==="three-of-kind")return single({2:24,3:30,4:42,5:54}[combo.rank]||0);
 return [];
}
export function winningHand(hand){return rekopBaseHits(hand).length>0;}
export function estimatedCardFutureValue(hand,stats){
 if(!Array.isArray(hand)||!hand.length)return 0;
 const rolls=rekopBaseHits(hand),chance=Number(stats?.chance)||0,power=Number(stats?.power)||0;
 if(rolls.length){
  return rolls.reduce((sum,hit)=>sum+hit.base*(1+((stats?.[
   {Eau:"chance",Terre:"strength",Feu:"intelligence",Air:"agility"}[hit.element]
  ]||0)+power)/100)+(stats?.flatDamage?.[hit.element]||0),0)*0.22;
 }
 return Math.min(4,hand.length)*8;
}
