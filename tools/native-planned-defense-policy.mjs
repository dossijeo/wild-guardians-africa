// A campaign player's persistent intention, not a geometric certificate.
// Native placement, payment, gate creation and animal interception remain in Game.
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {permission,wallSpec} from '../src/simulation/rules.js';
import {wallStroke,WALL_UNIT} from '../src/world/wall-layout.js';
import {centerServicePoint} from '../src/world/centers.js';
import {activeCrops} from '../src/simulation/active-crops.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {closedDefenseContours} from './native-closed-defense-policy.mjs';

const strokeOptions={smooth:false,snap:false};
const inside=(p,b,margin=1)=>p.x>=b[0]+margin&&p.x<=b[2]-margin&&p.z>=b[1]+margin&&p.z<=b[3]-margin;
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const smallestAnimalRadius=Math.min(...Object.values(ANIMAL_ACTIONS.animals).map(animal=>animal.presentation.footprint.radius));
const slotWall=(slot,material)=>({kind:'wall',material,baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle});
// Use the animal's native static collision test, including buildings, solid
// props, river and cliff terrain. A single blocked midpoint is not a barrier.
export function animalBarrierCoversSlot(nav,slot){
 const half=WALL_UNIT*slot.scaleX/2,c=Math.cos(slot.angle),s=Math.sin(slot.angle);
 const steps=Math.max(2,Math.ceil(half*2/.25));
 for(let i=0;i<=steps;i++){
  const along=-half+half*2*i/steps;
  if(nav.walkable(slot.x+c*along,slot.z+s*along,smallestAnimalRadius,null,false))return false;
 }
 return true;
}
function classifyMissing(s,nav,material,missing){
 const barrier=[],crops=[],other=[];
 for(const slot of missing){
  if(animalBarrierCoversSlot(nav,slot)){barrier.push(slot);continue;}
  const wall=slotWall(slot,material),placement=nav.wallPlacement(wall);
  if(Game.wallCropOverlap(s,wall)){crops.push(slot);continue;}
  other.push({slot,reason:placement.valid?'automatic-gate-unavailable':placement.reason});
 }
 return {barrier,crops,other};
}
function cropSideDetour(bounds,cropSlots,s){
 const b=bounds.slice(),crops=activeCrops(s.plants);
 for(const slot of cropSlots){
  const distances=[Math.abs(slot.x-b[0]),Math.abs(slot.z-b[1]),Math.abs(slot.x-b[2]),Math.abs(slot.z-b[3])];
  const side=distances.indexOf(Math.min(...distances));
  const nearby=crops.filter(p=>Math.hypot(p.x-slot.x,p.z-slot.z)<WALL_UNIT*2);
  if(!nearby.length)continue;
  if(side===0)b[0]=Math.min(b[0]-WALL_UNIT,Math.floor((Math.min(...nearby.map(p=>p.x))-3)/WALL_UNIT)*WALL_UNIT);
  if(side===1)b[1]=Math.min(b[1]-WALL_UNIT,Math.floor((Math.min(...nearby.map(p=>p.z))-3)/WALL_UNIT)*WALL_UNIT);
  if(side===2)b[2]=Math.max(b[2]+WALL_UNIT,Math.ceil((Math.max(...nearby.map(p=>p.x))+3)/WALL_UNIT)*WALL_UNIT);
  if(side===3)b[3]=Math.max(b[3]+WALL_UNIT,Math.ceil((Math.max(...nearby.map(p=>p.z))+3)/WALL_UNIT)*WALL_UNIT);
 }
 return b.some((v,i)=>v!==bounds[i])?b:null;
}
function workerGateOnTrace(s,nav,bounds){
 const [x0,z0,x1,z1]=bounds;
 return s.structures.some(w=>{
  if(w.kind!=='wall'||!w.gate||w.status!=='intact')return false;
  if(w.x<x0-1||w.x>x1+1||w.z<z0-1||w.z>z1+1)return false;
  if(Math.min(Math.abs(w.x-x0),Math.abs(w.x-x1),Math.abs(w.z-z0),Math.abs(w.z-z1))>WALL_UNIT)return false;
  const portals=gatePortalPoints(w,.28);
  return portals.length===2&&nav.segmentClear(portals[0],portals[1],.28,null,true);
 });
}

// Starting a closed stroke on the village/field corridor makes its last paid
// slot the corridor gate. The game's native gate algorithm remains authoritative.
export function corridorFirstContour(bounds,s){
 const [x0,z0,x1,z1]=bounds,center=s.structures.find(c=>c.kind==='center'&&c.status==='intact');
 const entry=s.villages[0]?.entry??s.villages[0];
 if(!center||!entry)return [[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]];
 const service=centerServicePoint(center,s,.8),dx=entry.x-service.x,dz=entry.z-service.z;
 if(Math.abs(dx)>=Math.abs(dz)){
  const z=clamp(service.z,z0+WALL_UNIT,z1-WALL_UNIT);
  return dx<0?[[x0,z],[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z]]:
   [[x1,z],[x1,z1],[x0,z1],[x0,z0],[x1,z0],[x1,z]];
 }
 const x=clamp(service.x,x0+WALL_UNIT,x1-WALL_UNIT);
 return dz<0?[[x,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0],[x,z0]]:
  [[x,z1],[x0,z1],[x0,z0],[x1,z0],[x1,z1],[x,z1]];
}

export function createNativePlannedDefensePolicy({startDay=6,material='zarzas',interval=5,chunkPieces=8}={}){
 if(!Number.isSafeInteger(startDay)||startDay<1||!Number.isFinite(interval)||interval<=0||!Number.isSafeInteger(chunkPieces)||chunkPieces<1)throw Error('Invalid planned defense policy');
 const pieceCost=wallSpec(material).cost;
 let plan=null,completed=null,next=0,lastEventId=null,observedDay=0,needsExpansion=false,breaches=0,builds=0,spent=0,planningCount=0,stalls=0,contourIndex=0,barrierEpoch=null;
 const history=[];
 function observe(s){
  if(s.day!==observedDay){
   observedDay=s.day;
   if(completed&&activeCrops(s.plants).some(p=>!inside(p,completed.bounds)))needsExpansion=true;
  }
  if(s.events.at(-1)?.id===lastEventId)return;
  const previous=s.events.findIndex(event=>event.id===lastEventId);
  for(const event of s.events.slice(previous+1)){
   if(event.type==='CropPlaced'&&completed){
    const crop=activeCrops(s.plants).find(p=>p.id===event.targetId);
    if(crop&&!inside(crop,completed.bounds))needsExpansion=true;
   }
   if(event.type==='StructureRuined'&&s.structures.some(w=>w.id===event.targetId&&w.kind==='wall'))breaches++;
  }
  lastEventId=s.events.at(-1)?.id??null;
 }
 function newPlan(s,bounds=null){
  // Plot/crop bounds are sampled on a planning event, never per purchase.
  const candidate=bounds?{bounds}:closedDefenseContours(s,{previous:completed?.bounds})[contourIndex];
  if(!candidate)return null;
  planningCount++;
  return {bounds:candidate.bounds,points:corridorFirstContour(candidate.bounds,s),createdDay:s.day,createdTime:s.time,version:planningCount,stalledUntilDay:0,paidPieces:0};
 }
 function act(s,nav,{command,reserve=0}){
  observe(s);
  if(completed?.barrierSlots?.length&&barrierEpoch!==nav.version){
   barrierEpoch=nav.version;
   const opened=completed.barrierSlots.filter(slot=>!animalBarrierCoversSlot(nav,slot));
   if(opened.length){
    const old=completed;completed=null;plan={...old,stalledUntilDay:0,barrierSlots:[]};
    history.push({day:s.day,time:s.time,kind:'physical-barrier-opened',version:old.version,openSlots:opened.length});
   }
  }
  if(s.day<startDay||!permission(s,'wall')||s.raid||s.elapsed<next)return 0;
  next=s.elapsed+interval;
  if(!plan&&(!completed||needsExpansion)){
   plan=newPlan(s);needsExpansion=false;
   if(plan)history.push({day:s.day,time:s.time,kind:'plan',version:plan.version,bounds:plan.bounds});
  }
  if(!plan)return 0;
  if(s.day<plan.stalledUntilDay)return 0;
  if(plan.stalledUntilDay){
   // A blocked paid trace remains in the world. A nearby outer contour can
   // enclose it without deleting or moving any previously purchased piece.
   contourIndex=(contourIndex+1)%9;plan=newPlan(s);
   if(!plan)return 0;
  }
  plan.stalledUntilDay=0;
  // A cheap slot comparison is sufficient to decide whether the intention is
  // finished. It says nothing about enemy access or a certified enclosure.
  const missing=wallStroke(plan.points,s.structures,strokeOptions);
  if(!missing.length){completed=plan;completed.barrierSlots=[];barrierEpoch=nav.version;plan=null;contourIndex=0;needsExpansion=activeCrops(s.plants).some(p=>!inside(p,completed.bounds));history.push({day:s.day,time:s.time,kind:'trace-filled',version:completed.version});return 0;}
  const funds=Math.max(0,numberOf(s.ledger.balance)-reserve);
  const count=Math.min(chunkPieces,missing.length,Math.floor(funds/pieceCost));
  if(!count){
   if(plan.lastFundingDay!==s.day){plan.lastFundingDay=s.day;history.push({day:s.day,time:s.time,kind:'funding-wait',version:plan.version,missing:missing.length,funds,pieceCost});}
   return 0;
  }
  const balance=numberOf(s.ledger.balance),before=s.structures.length,id=command('wall');
  // Exactly one authoritative native quote/commit. We do not call either
  // exhaustive perimeter or service-component proof on this ordinary action.
  if(!Game.buildWallChain(s,id,material,plan.points,nav,{...strokeOptions,maxPieces:count})){
   const quote=Game.quoteWallChain(s,material,plan.points,nav,strokeOptions);
   if(!quote.pieces.length){
    const blocked=classifyMissing(s,nav,material,missing);
    if(blocked.crops.length){
     const bounds=cropSideDetour(plan.bounds,blocked.crops,s);
     if(bounds){const old=plan;plan=newPlan(s,bounds);history.push({day:s.day,time:s.time,kind:'crop-side-detour',version:old.version,nextVersion:plan.version,crops:blocked.crops.length,bounds});return 0;}
    }
    if(blocked.barrier.length===missing.length&&workerGateOnTrace(s,nav,plan.bounds)){
     const finished=plan;completed={...finished,barrierSlots:blocked.barrier};barrierEpoch=nav.version;plan=null;contourIndex=0;
     needsExpansion=activeCrops(s.plants).some(p=>!inside(p,finished.bounds));
     history.push({day:s.day,time:s.time,kind:'trace-physical-closure',version:finished.version,barrierSlots:blocked.barrier.length});
     return 0;
    }
    stalls++;plan.stalledUntilDay=s.day+1;
    history.push({day:s.day,time:s.time,kind:'trace-unsealed',version:plan.version,barrierSlots:blocked.barrier.length,cropSlots:blocked.crops.length,other:blocked.other.map(x=>x.reason),workerGate:workerGateOnTrace(s,nav,plan.bounds)});
    return 0;
   }
   stalls++;plan.stalledUntilDay=s.day+1;
   history.push({day:s.day,time:s.time,kind:'native-placement-stalled',version:plan.version,missing:missing.length});
   return 0;
  }
  const paid=balance-numberOf(s.ledger.balance),added=s.structures.length-before;
  if(paid!==added*pieceCost||added<1||added>count)throw Error('Native planned wall settlement mismatch');
  spent+=paid;builds++;plan.paidPieces+=added;
  history.push({day:s.day,time:s.time,kind:'paid-build',version:plan.version,pieces:added,paid,missingBefore:missing.length});
  return 1;
 }
 return {act,observe,reserve:()=>0,report:()=>structuredClone({policy:'persistent-event-plan',startDay,material,interval,chunkPieces,plan,completed,needsExpansion,breaches,builds,spent,planningCount,stalls,history,scope:'Native legal wall purchases against a persistent player intention; no geometric certification or guaranteed interception.'})};
}
