// Presentation only. Consume confirmed events once; never infer settlements
// from prices, future harvests or the displayed (abbreviated) coin counter.
import {observeSettlements} from '../simulation/settlement-observers.js';
export class GameJuiceModel {
 constructor(state){this.cursor=state.events.at(-1)?.id;this.cooldowns={...state.cooldowns};this.day=state.day;this.critical=new Set();this.income=0n;this.expense=0n;this.release=observeSettlements(state.ledger,(_id,n)=>{const value=BigInt(n);if(value>0n)this.income+=value;else this.expense+=value;});}
 consume(state){
  const events=state.events,index=events.at(-1)?.id===this.cursor?events.length-1:events.findIndex(e=>e.id===this.cursor),fresh=index<0?events:events.slice(index+1),out=[];
  this.cursor=events.at(-1)?.id;
  if(this.day!==state.day){this.day=state.day;this.critical.clear();}
  const income=this.income,expense=this.expense;this.income=0n;this.expense=0n;let entities;
  for(const e of fresh){
   if(e.type==='Dawn'&&!state.result&&state.completedNights>0)out.push({kind:'dawn',night:state.completedNights});
   if(['CropPlaced','PlacementCommitted','WallChainBuilt','VillageFounded'].includes(e.type)){
    let point=e.presentation;
    if(!point){const latest=state.plants.at(-1);if(latest?.id===e.targetId)point=latest;else{entities??=new Map([...state.plants,...state.structures].map(p=>[p.id,p]));point=entities.get(e.targetId);}}
    if(point)out.push({kind:'placement',crop:e.type==='CropPlaced',x:point.x,z:point.z});
   }
   if(e.type==='SpellActivated')out.push({kind:'magic',spell:e.kind,x:e.x,z:e.z});
   if(e.type==='StructureRuined')out.push({kind:'collapse',targetId:e.targetId});
   if(e.type==='StructureHit'&&e.structureHit&&e.structureHit.hp<=(e.structureHit.criticalThreshold??e.structureHit.maxHp*.3)&&!this.critical.has(e.targetId)){
    this.critical.add(e.targetId);out.push({kind:'critical',targetId:e.targetId});
   }
  }
  for(const [kind,left] of Object.entries(state.cooldowns))if((this.cooldowns[kind]??0)>0&&left<=0)out.push({kind:'ready',spell:kind});
  this.cooldowns={...state.cooldowns};
  if(income)out.push({kind:'money',value:income});if(expense)out.push({kind:'money',value:expense});
  return out;
 }
 dispose(){this.release();this.income=0n;this.expense=0n;}
}
