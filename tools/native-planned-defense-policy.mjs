// A campaign player's persistent intention, not a geometric certificate.
// Native placement, payment, gate creation and animal interception remain in Game.
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {permission,wallSpec} from '../src/simulation/rules.js';
import {wallStroke} from '../src/world/wall-layout.js';
import {Navigation} from '../src/world/navigation.js';
import {centerServicePoint} from '../src/world/centers.js';
import {closedDefenseContours} from './native-closed-defense-policy.mjs';

const strokeOptions={smooth:false,snap:false};
const inside=(p,b,margin=1)=>p.x>=b[0]+margin&&p.x<=b[2]-margin&&p.z>=b[1]+margin&&p.z<=b[3]-margin;

function closingWouldStrandWorkers(s,nav,preview){
 const replacements=new Map(preview.updates.map(update=>[update.id,update]));
 const shadow={...s,structures:[...s.structures.map(w=>replacements.has(w.id)?{...w,...replacements.get(w.id)}:w),...preview.pieces],suppressed:[...new Set([...s.suppressed,...preview.suppressed])]};
 const prospective=new Navigation(s.seed,s.biome,nav.profile);
 prospective.setState(shadow);
 const village=s.villages[0],entry=village?.entry??village;
 if(!entry)return false;
 const origins=[];
 for(const center of s.structures.filter(w=>w.kind==='center'&&w.status==='intact'))origins.push(centerServicePoint(center,s,.8));
 for(const worker of s.workers)if(worker.status!=='gone')origins.push(worker);
 const checked=new Set();
 for(const origin of origins){
  const key=`${origin.x},${origin.z}`;if(checked.has(key))continue;checked.add(key);
  // An existing unrelated route failure is not a reason to blame this stroke.
  if(!nav.path(origin,entry,.28,null,true))continue;
  if(!prospective.path(origin,entry,.28,null,true))return true;
 }
 return false;
}

export function createNativePlannedDefensePolicy({startDay=6,material='zarzas',interval=5,chunkPieces=8}={}){
 if(!Number.isSafeInteger(startDay)||startDay<1||!Number.isFinite(interval)||interval<=0||!Number.isSafeInteger(chunkPieces)||chunkPieces<1)throw Error('Invalid planned defense policy');
 const pieceCost=wallSpec(material).cost;
 let plan=null,completed=null,next=0,eventsSeen=0,needsExpansion=false,breaches=0,builds=0,spent=0,planningCount=0,stalls=0,unsafeClosures=0,contourIndex=0;
 const history=[];
 function observe(s){
  if(s.events.length<eventsSeen)eventsSeen=0;
  for(const event of s.events.slice(eventsSeen)){
   if(event.type==='CropPlaced'&&completed){
    const crop=s.plants.find(p=>p.id===event.targetId);
    if(crop&&!inside(crop,completed.bounds))needsExpansion=true;
   }
   if(event.type==='StructureRuined'&&s.structures.some(w=>w.id===event.targetId&&w.kind==='wall'))breaches++;
  }
  eventsSeen=s.events.length;
 }
 function newPlan(s){
  // Plot/crop bounds are sampled on a planning event, never per purchase.
  const candidate=closedDefenseContours(s,{previous:completed?.bounds})[contourIndex];
  if(!candidate)return null;
  planningCount++;
  return {bounds:candidate.bounds,points:candidate.points,createdDay:s.day,createdTime:s.time,version:planningCount,stalledUntilDay:0,paidPieces:0};
 }
 function act(s,nav,{command,reserve=0}){
  observe(s);
  if(s.day<startDay||!permission(s,'wall')||s.raid||s.elapsed<next)return 0;
  next=s.elapsed+interval;
  if(!plan&&(!completed||needsExpansion)){
   plan=newPlan(s);needsExpansion=false;
   if(plan)history.push({day:s.day,time:s.time,kind:'plan',version:plan.version,bounds:plan.bounds});
  }
  if(!plan)return 0;
  if(s.day<plan.stalledUntilDay)return 0;
  if(plan.stalledUntilDay&&plan.paidPieces===0){
   // Try a different simple outline after a genuinely blocked, unpaid trace.
   // Never abandon a trace on which the player already spent coins.
   contourIndex=(contourIndex+1)%9;plan=newPlan(s);
   if(!plan)return 0;
  }
  plan.stalledUntilDay=0;
  // A cheap slot comparison is sufficient to decide whether the intention is
  // finished. It says nothing about enemy access or a certified enclosure.
  const missing=wallStroke(plan.points,s.structures,strokeOptions);
  if(!missing.length){completed=plan;plan=null;contourIndex=0;needsExpansion=s.plants.some(p=>p.alive&&!inside(p,completed.bounds));history.push({day:s.day,time:s.time,kind:'trace-filled',version:completed.version});return 0;}
  const funds=Math.max(0,numberOf(s.ledger.balance)-reserve);
  const count=Math.min(chunkPieces,missing.length,Math.floor(funds/pieceCost));
  if(!count)return 0;
  if(count===missing.length){
   const preview=Game.previewWallChain(s,material,plan.points,nav,{...strokeOptions,maxPieces:count});
   if(preview.pieces.length===missing.length&&closingWouldStrandWorkers(s,nav,preview)){
    unsafeClosures++;plan.stalledUntilDay=s.day+1;
    history.push({day:s.day,time:s.time,kind:'unsafe-closure-deferred',version:plan.version,missing:missing.length});
    return 0;
   }
  }
  const balance=numberOf(s.ledger.balance),before=s.structures.length,id=command('wall');
  // Exactly one authoritative native quote/commit. We do not call either
  // exhaustive perimeter or service-component proof on this ordinary action.
  if(!Game.buildWallChain(s,id,material,plan.points,nav,{...strokeOptions,maxPieces:count})){
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
 return {act,observe,reserve:()=>0,report:()=>structuredClone({policy:'persistent-event-plan',startDay,material,interval,chunkPieces,plan,completed,needsExpansion,breaches,builds,spent,planningCount,stalls,unsafeClosures,history,scope:'Native legal wall purchases against a persistent player intention; local worker exit check only at closure, no geometric certification or guaranteed interception.'})};
}
