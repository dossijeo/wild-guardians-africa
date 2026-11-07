// Opt-in QA player policy. Production placement, prices and terrain stay native.
import * as Game from '../src/simulation/game.js';
import {centerFootprint} from '../src/world/centers.js';
import {wallStroke,WALL_UNIT} from '../src/world/wall-layout.js';
import {numberOf} from '../src/simulation/money.js';
import {permission,operational,wallSpec} from '../src/simulation/rules.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
const options={smooth:false,snap:false};
const matches=(slot,w)=>w.kind==='wall'&&Math.hypot(w.x-slot.x,w.z-slot.z)<.35&&Math.abs(Math.sin(-(w.yaw??0)-slot.angle))<.18;
const points=b=>[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]],[b[0],b[1]]];
export function closedDefenseContours(s,{margin=3,previous=null}={}){
 const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)];
 if(!land.length)return [];
 const b=land.reduce((a,p)=>[Math.min(a[0],p.x),Math.min(a[1],p.z),Math.max(a[2],p.x),Math.max(a[3],p.z)],[Infinity,Infinity,-Infinity,-Infinity]);
 const raw=[Math.floor((b[0]-margin)/WALL_UNIT)*WALL_UNIT,Math.floor((b[1]-margin)/WALL_UNIT)*WALL_UNIT,Math.ceil((b[2]+margin)/WALL_UNIT)*WALL_UNIT,Math.ceil((b[3]+margin)/WALL_UNIT)*WALL_UNIT];
 const base=previous?[Math.min(raw[0],previous[0]),Math.min(raw[1],previous[1]),Math.max(raw[2],previous[2]),Math.max(raw[3],previous[3])]:raw;
 // Nine deterministic expansions only; no unbounded contour/reroll search.
 return [[0,0],[1,0],[0,1],[1,1],[2,0],[0,2],[2,1],[1,2],[2,2]].map(([x,z])=>({bounds:[base[0]-x*WALL_UNIT,base[1]-z*WALL_UNIT,base[2]+x*WALL_UNIT,base[3]+z*WALL_UNIT]})).map(c=>({...c,points:points(c.bounds)}));
}
export function selectClosedDefenseContour(s,nav,{material='zarzas',funds,previous=null,margin=3,maxSlots=256}={}){
 if(!Number.isFinite(funds)||funds<0||!Number.isFinite(margin)||margin<2||!Number.isSafeInteger(maxSlots)||maxSlots<4||maxSlots>256)throw Error('Invalid bounded defense search');
 const cost=wallSpec(material).cost,attempts=[];
 for(const candidate of closedDefenseContours(s,{previous,margin})){
  const [x0,z0,x1,z1]=candidate.bounds,slotBound=2*(Math.ceil((x1-x0)/WALL_UNIT)+Math.ceil((z1-z0)/WALL_UNIT));
  if(slotBound>maxSlots){attempts.push({bounds:candidate.bounds,slotBound,reason:'slot-bound'});continue;}
  const all=wallStroke(candidate.points,[],options),slots=wallStroke(candidate.points,s.structures,options);
  const row={bounds:candidate.bounds,totalSlots:all.length,newSlots:slots.length,cost:slots.length*cost};attempts.push(row);
  if(all.length>maxSlots){row.reason='slot-bound';continue;}
  if(all.some(slot=>s.structures.some(w=>matches(slot,w)&&(w.hp<=0||w.status!=='intact')))){row.reason='existing-wall-needs-repair';continue;}
  if(row.cost>funds){row.reason='protected-budget';continue;}
  const plan=Game.previewWallChain(s,material,candidate.points,nav,{...options,maxPieces:slots.length});
  if(plan.pieces.length!==slots.length){row.reason='native-omissions';row.omitted=slots.filter(q=>!plan.pieces.some(p=>Math.hypot(q.x-p.x,q.z-p.z)<1e-6)).map(q=>({x:q.x,z:q.z}));continue;}
  if(plan.suppressed.length){row.reason='native-prop-suppression';continue;}
  // Existing matches can be mixed material. Ruined occupancy is never a barrier.
  if(!all.every(slot=>[...s.structures,...plan.pieces].some(w=>matches(slot,w)&&w.status==='intact'&&w.hp>0))){row.reason='incomplete-slot-coverage';continue;}
  row.reason='complete-legal-slots';return {candidate,plan,attempts};
 }
 return {candidate:null,plan:null,attempts};
}
export function createNativeClosedDefensePolicy({startDay=1,material='zarzas',interval=30,repairWalls=true,margin=3,maxSlots=256}={}){
 if(!Number.isSafeInteger(startDay)||startDay<1||!Number.isFinite(interval)||interval<=0||!Number.isFinite(margin)||margin<2||!Number.isSafeInteger(maxSlots)||maxSlots<4||maxSlots>256)throw Error('Invalid bounded defense configuration');
 let nextAttempt=0,built=null,repairRequests=0;const history=[],owned=new Set();
 function act(s,nav,{command,reserve:protectedCash}){
  if(s.day<startDay||!permission(s,'wall')||s.raid||s.elapsed<nextAttempt)return 0;
  if(typeof command!=='function'||!Number.isFinite(protectedCash)||protectedCash<0)throw Error('Invalid command/protected cash');
  nextAttempt=s.elapsed+interval;protectedCash=Math.max(protectedCash,HIRING_RESERVE);
  for(const wall of s.structures.filter(w=>w.kind==='wall'))owned.add(wall.id);
  let pending=s.tasks.filter(t=>t.kind==='repair').reduce((n,t)=>{const p=s.structures.find(p=>p.id===t.targetId);return n+(p?Math.ceil(numberOf(Game.repairCost(p))):0);},0);
  for(const w of s.structures)if(repairWalls&&owned.has(w.id)&&['intact','ruined'].includes(w.status)&&w.hp<w.maxHp*.8&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===w.id)){
   const payment=Math.ceil(numberOf(Game.repairCost(w)));
   if(numberOf(s.ledger.balance)>=protectedCash+pending+payment&&Game.requestRepair(s,command('repair'),w.id)){repairRequests++;pending+=payment;}
  }
  const funds=Math.max(0,numberOf(s.ledger.balance)-protectedCash-pending),selected=selectClosedDefenseContour(s,nav,{material,funds,previous:built?.bounds,margin,maxSlots});
  const row={day:s.day,time:s.time,elapsed:s.elapsed,protectedCash,pendingRepairCoins:pending,funds,attempts:selected.attempts,paidCost:0,paidPieces:0,repairRequests};history.push(row);
  if(!selected.candidate){row.reason='no-affordable-complete-native-contour';return 0;}
  const {candidate,plan}=selected;row.bounds=candidate.bounds;
  if(!plan.pieces.length){row.reason='existing-complete-contour';return 0;}
  const cash=numberOf(s.ledger.balance),id=command('wall');
  if(!Game.buildWallChain(s,id,material,candidate.points,nav,{...options,maxPieces:plan.pieces.length})){row.reason='native-build-declined';return 0;}
  row.paidCost=cash-numberOf(s.ledger.balance);row.paidPieces=plan.pieces.length;row.paymentId=id;row.ids=plan.pieces.map(p=>p.id);row.gates=plan.gates;row.reason='paid-complete-native-contour';
  if(row.paidCost!==plan.cost||!row.ids.every(id=>s.structures.some(w=>w.id===id&&w.kind==='wall')))throw Error('Native defense settlement mismatch');
  for(const id of row.ids)owned.add(id);built={bounds:candidate.bounds,points:candidate.points,day:s.day,ids:[...owned]};return 1;
 }
 return {reserve:()=>0,act,report:()=>structuredClone({startDay,material,interval,repairWalls,margin,maxSlots,built,history,repairRequests,paidCost:history.reduce((n,r)=>n+r.paidCost,0),paidPieces:history.reduce((n,r)=>n+r.paidPieces,0),scope:'Opt-in all-or-nothing legal paid contours. Complete slot coverage is geometric planning, not an interception/campaign guarantee; native path/contact fixtures provide separate physical evidence. Requests are not paid repairs.'})};
}
