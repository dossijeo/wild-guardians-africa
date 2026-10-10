// QA player policy: explicit savings and real incremental native purchases.
import * as Game from '../src/simulation/game.js';
import {closedDefenseContours} from './native-closed-defense-policy.mjs';
import {wallStroke,WALL_UNIT} from '../src/world/wall-layout.js';
import {numberOf} from '../src/simulation/money.js';
import {permission,wallSpec} from '../src/simulation/rules.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
import {obstacleAwareContour} from './native-obstacle-aware-contour.mjs';
import {nativePerimeterProof} from './native-perimeter-proof.mjs';
import {containsPoint} from '../src/world/footprints.js';
import {centerFootprint} from '../src/world/centers.js';
import {operational} from '../src/simulation/rules.js';
const options={smooth:false,snap:false};
const sameSlot=(q,w)=>w.kind==='wall'&&Math.hypot(q.x-w.x,q.z-w.z)<.35&&Math.abs(Math.sin(q.angle+(w.yaw??0)))<.18;
const matches=(q,w)=>w.status==='intact'&&w.hp>0&&sameSlot(q,w);
export function createNativeFundedDefensePolicy({startDay=6,material='zarzas',interval=5,chunkPieces=8,maxSlots=256,repairWalls=true,obstacleAware=false}={}){
 if(!Number.isSafeInteger(startDay)||startDay<1||!Number.isFinite(interval)||interval<=0||!Number.isSafeInteger(chunkPieces)||chunkPieces<1||!Number.isSafeInteger(maxSlots)||maxSlots<4||chunkPieces>maxSlots||maxSlots>256)throw Error('Invalid bounded funded defense policy');
 const spec=wallSpec(material),history=[],owned=new Set();let next=-Infinity,planned=null,completed=null,remainingCost=0,repairRequests=0,failedPlanning=null;
 const coverage=(s,nav,candidate=planned)=>{
  if(!candidate)return false;
  if(wallStroke(candidate.points,[],options).every(q=>s.structures.some(w=>matches(q,w))))return true;
  if(!obstacleAware)return false;
  const plan=Game.quoteWallChain(s,material,candidate.points,nav,options);
  return !plan.pieces.length&&!plan.updates.length&&nativePerimeterProof(s,nav,plan,candidate.bounds).valid;
 };
 const quote=(s,nav,candidate,detail={})=>{
  const [x0,z0,x1,z1]=candidate.bounds;
  if(2*(Math.ceil((x1-x0)/WALL_UNIT)+Math.ceil((z1-z0)/WALL_UNIT))>maxSlots){detail.reason='slot-bound';return null;}
  const all=wallStroke(candidate.points,[],options),missing=wallStroke(candidate.points,s.structures,options);
  if(all.length>maxSlots){detail.reason='slot-bound';return null;}
  if(all.some(q=>s.structures.some(w=>w.kind==='wall'&&!matches(q,w)&&Math.hypot(q.x-w.x,q.z-w.z)<.35))){detail.reason='damaged-or-conflicting-wall';return null;}
  const plan=Game.quoteWallChain(s,material,candidate.points,nav,options);
  detail.expectedPieces=missing.length;detail.legalPieces=plan.pieces.length;detail.nativeVegetationRemoval=plan.suppressed.length;
  if(plan.pieces.length!==missing.length||!all.every(q=>[...s.structures,...plan.pieces].some(w=>matches(q,w)))){
   detail.reason='native-placement-omissions';
   if(!obstacleAware)return null;
   detail.nativeBarrierProof=nativePerimeterProof(s,nav,plan,candidate.bounds);
   if(!detail.nativeBarrierProof.valid)return null;
  }
  // Small vegetation cleared by a legal native purchase is allowed. Never
  // move props or bypass large trees/rocks rejected by native wallPlacement.
  detail.reason='complete-native-legal-quote';
  return plan;
 };
 function act(s,nav,{command,reserve:cashProtection}){
  if(s.day<startDay||!permission(s,'wall')||s.raid||s.elapsed<next)return 0;
  if(typeof command!=='function'||!Number.isFinite(cashProtection)||cashProtection<0)throw Error('Invalid protected wage cash');
  next=s.elapsed+interval;const protectedCash=Math.max(HIRING_RESERVE,cashProtection);
  for(const w of s.structures.filter(w=>w.kind==='wall'))owned.add(w.id);
  let pending=s.tasks.filter(t=>t.kind==='repair').reduce((n,t)=>{const w=s.structures.find(w=>w.id===t.targetId);return n+(w?numberOf(Game.repairCost(w)):0);},0);
  for(const w of s.structures)if(repairWalls&&owned.has(w.id)&&['intact','ruined'].includes(w.status)&&w.hp<w.maxHp*.8&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===w.id)){
   const cost=numberOf(Game.repairCost(w));if(numberOf(s.ledger.balance)>=protectedCash+pending+cost&&Game.requestRepair(s,command('repair'),w.id)){pending+=cost;repairRequests++;}
  }
  if(obstacleAware&&completed&&!planned){
   const polygon=completed.points.slice(0,-1).map(([x,z])=>({x,z}));
   const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)];
   if(land.every(p=>containsPoint(polygon,p.x,p.z))){
    const slots=wallStroke(completed.points,[],options);
    const damaged=s.structures.filter(w=>slots.some(q=>sameSlot(q,w))&&(w.status!=='intact'||w.hp<=0));
    if(damaged.length||coverage(s,nav,completed)){
     // Broken paid walls are repaired/rebuilt through native worker tasks.
     // Never buy a second perimeter merely to route around our own damage.
     remainingCost=damaged.filter(w=>!s.tasks.some(t=>t.kind==='repair'&&t.targetId===w.id)).reduce((sum,w)=>sum+numberOf(Game.repairCost(w)),0);
     history.push({day:s.day,time:s.time,protectedCash,pendingRepairCoins:pending,attempts:[],paidCost:0,paidPieces:0,remainingCost,complete:!damaged.length,bounds:completed.bounds,reason:damaged.length?'maintaining-paid-native-contour':'existing-paid-native-contour'});
     return 0;
    }
    // A deleted piece without a repairable entity must be repurchased along
    // the original paid trace, rather than selecting a fresh outer ring.
    planned=completed;
   }
  }
  if(planned&&coverage(s,nav)){completed=planned;planned=null;remainingCost=0;}
  // A failed geometric search is not useful player activity. Reuse only an
  // identical static problem, never worker-passage failures or unpaid plans.
  const signature=!planned?JSON.stringify([nav.version,completed?.bounds,
   s.plants.filter(p=>p.alive).map(p=>[p.x,p.z]),
   s.structures.filter(c=>c.kind==='center'&&operational(c)).map(c=>centerFootprint(c,s).footprint)]):null;
  if(!planned&&failedPlanning?.nav===nav&&failedPlanning.field===nav.field&&failedPlanning.signature===signature){
   history.push({day:s.day,time:s.time,protectedCash,pendingRepairCoins:pending,attempts:[],paidCost:0,paidPieces:0,remainingCost:0,complete:false,reason:'unchanged-geometric-planning-failure',originalAttemptIndex:failedPlanning.index});return 0;
  }
  const attempts=[];
  if(!planned)for(const candidate of closedDefenseContours(s,{previous:completed?.bounds})){
   const detail={bounds:candidate.bounds},plan=quote(s,nav,candidate,detail);attempts.push({...detail,legal:!!plan,cost:plan?.cost??null});
   if(plan){planned=candidate;remainingCost=plan.cost;break;}
   if(obstacleAware){const routed=obstacleAwareContour(s,nav,candidate),routedDetail={bounds:routed.candidate?.bounds??candidate.bounds,routing:routed.reason,routed:true};
    const routedPlan=routed.candidate&&quote(s,nav,routed.candidate,routedDetail);attempts.push({...routedDetail,legal:!!routedPlan,cost:routedPlan?.cost??null});
    if(routedPlan){planned=routed.candidate;remainingCost=routedPlan.cost;break;}
   }
  }
  const row={day:s.day,time:s.time,protectedCash,pendingRepairCoins:pending,attempts,paidCost:0,paidPieces:0,remainingCost,complete:false};history.push(row);
  if(!planned){
   remainingCost=0;row.reason='no-bounded-legal-contour';
   const transient=attempts.some(a=>['worker-passage-not-observable','native-worker-route-blocked'].includes(a.nativeBarrierProof?.reason));
   failedPlanning=transient?null:{nav,field:nav.field,signature,index:history.length-1};return 0;
  }
  failedPlanning=null;
  row.bounds=planned.bounds;
  const plan=quote(s,nav,planned);
  if(!plan){remainingCost=0;planned=null;row.reason='geometry-changed-or-repair-pending';return 0;}
  remainingCost=plan.cost;row.remainingCost=remainingCost;
  if(!plan.pieces.length){row.complete=coverage(s,nav);row.reason=row.complete?'existing-complete-contour':'existing-contour-not-certified';if(row.complete){completed=planned;planned=null;}remainingCost=0;return 0;}
  const funds=Math.max(0,numberOf(s.ledger.balance)-protectedCash-pending),count=Math.min(chunkPieces,Math.floor(funds/spec.cost),plan.pieces.length);
  if(!count){row.reason='saving-actual-cash-for-native-perimeter';return 0;}
  const purchase=Game.previewWallChain(s,material,planned.points,nav,{...options,maxPieces:count});
  if(purchase.pieces.length!==count){row.reason='native-partial-preview-rejected';return 0;}
  const id=command('wall'),cash=numberOf(s.ledger.balance);
  if(!Game.buildWallChain(s,id,material,planned.points,nav,{...options,maxPieces:count})){row.reason='native-build-rejected';return 0;}
  row.paidCost=cash-numberOf(s.ledger.balance);row.paidPieces=count;row.paymentId=id;row.ids=purchase.pieces.map(w=>w.id);row.nativeSuppressedProps=[...purchase.suppressed];
  if(!row.nativeSuppressedProps.every(id=>s.suppressed.includes(id)))throw Error('Native vegetation removal receipt mismatch');
  if(row.paidCost!==purchase.cost||!row.ids.every(id=>s.structures.some(w=>w.id===id)))throw Error('Funded native wall settlement mismatch');
  row.complete=coverage(s,nav);remainingCost=Game.quoteWallChain(s,material,planned.points,nav,options).cost;row.remainingCost=remainingCost;
  row.reason=row.complete?'paid-native-contour-completed':'paid-native-contour-in-progress';
  if(row.complete){completed=planned;planned=null;remainingCost=0;}return 1;
 }
 return {act,reserve:s=>s.day>=startDay?remainingCost:0,report:()=>structuredClone({startDay,material,interval,chunkPieces,maxSlots,obstacleAware,planned,completed,remainingCost,repairRequests,history,paidCost:history.reduce((n,r)=>n+r.paidCost,0),paidPieces:history.reduce((n,r)=>n+r.paidPieces,0),scope:'Saved actual funds and paid native partial strokes; complete geometric coverage is not a universal interception guarantee.'})};
}
