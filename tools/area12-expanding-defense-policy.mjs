// Candidate player policy only: paid new pieces/ordinary repair commands.
import * as Game from '../src/simulation/game.js';
import {centerFootprint} from '../src/world/centers.js';
import {wallStroke} from '../src/world/wall-layout.js';
import {numberOf} from '../src/simulation/money.js';
import {permission,operational,wallSpec} from '../src/simulation/rules.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
export function createArea12ExpandingDefensePolicy({startDay=2,material='zarzas',interval=30}={}){
 const cost=wallSpec(material).cost;let nextAttempt=0,capitalTarget=200,built=null,repairRequests=0;
 const history=[],owned=new Set();
 const reserve=s=>s.day>=startDay?capitalTarget:0;
 function act(s,nav,{command,reserve:protectedCash}){
  if(s.day<startDay||!permission(s,'wall')||s.raid||s.elapsed<nextAttempt)return 0;
  nextAttempt=s.elapsed+interval;
  if(!Number.isFinite(protectedCash)||protectedCash<0)throw Error('Invalid protected cash');
  protectedCash=Math.max(protectedCash,HIRING_RESERVE);
  let pending=s.tasks.filter(t=>t.kind==='repair').reduce((n,t)=>{const p=s.structures.find(p=>p.id===t.targetId);return n+(p?Math.ceil(numberOf(Game.repairCost(p))):0);},0);
  // Request native repairs, but do not count uncompleted requests as useful work.
  for(const wall of s.structures)if(owned.has(wall.id)&&['intact','ruined'].includes(wall.status)&&wall.hp<wall.maxHp*.8&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===wall.id)){
   const payment=Math.ceil(numberOf(Game.repairCost(wall)));
   if(numberOf(s.ledger.balance)>=protectedCash+pending+payment){Game.requestRepair(s,command('repair'),wall.id);repairRequests++;pending+=payment;}
  }
  const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)];
  if(!land.length)return 0;
  const raw=land.reduce((b,p)=>[Math.min(b[0],p.x),Math.min(b[1],p.z),Math.max(b[2],p.x),Math.max(b[3],p.z)],[Infinity,Infinity,-Infinity,-Infinity]);
  // Fixed grid prevents tiny plot changes from generating near-duplicate rings.
  const next=[Math.floor((raw[0]-3)/6)*6,Math.floor((raw[1]-3)/6)*6,Math.ceil((raw[2]+3)/6)*6,Math.ceil((raw[3]+3)/6)*6];
  const previous=history.at(-1)?.bounds;
  const bounds=previous?[Math.min(previous[0],next[0]),Math.min(previous[1],next[1]),Math.max(previous[2],next[2]),Math.max(previous[3],next[3])]:next;
  const [x0,z0,x1,z1]=bounds,points=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],options={smooth:false,snap:false};
  const slots=wallStroke(points,s.structures,options),funds=Math.max(0,numberOf(s.ledger.balance)-protectedCash-pending),maxPieces=Math.floor(funds/cost);
  capitalTarget=Math.min(500,Math.max(200,slots.length*cost));
  const row={day:s.day,time:s.time,elapsed:s.elapsed,bounds,expectedSlots:slots.length,availablePieces:maxPieces,paidPieces:0,paidCost:0,gaps:[]};
  if(!maxPieces){row.reason='budget';history.push(row);return 0;}
  const plan=Game.previewWallChain(s,material,points,nav,{...options,maxPieces});
  const planned=new Set(plan.pieces.map(p=>`${p.x},${p.z}`));
  for(const slot of slots)if(!planned.has(`${slot.x},${slot.z}`)){
   const piece={kind:'wall',material,gate:false,baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle};
   const check=nav.wallPlacement(piece);
   row.gaps.push({x:slot.x,z:slot.z,reason:!check.valid?check.reason??'native-placement':plan.pieces.length>=maxPieces?'budget-limit':'crop-overlap-or-native-omission'});
  }
  if(plan.pieces.length&&Game.buildWallChain(s,command('wall'),material,points,nav,{...options,maxPieces})){
   row.paidPieces=plan.pieces.length;row.paidCost=plan.cost;row.ids=plan.pieces.map(p=>p.id);row.gates=plan.gates;
   for(const id of row.ids)owned.add(id);
   built={day:s.day,bounds,points,cost:plan.cost,pieces:plan.pieces.length,expectedPieces:slots.length,ids:[...owned]};history.push(row);return 1;
  }
  row.reason='no-new-legal-pieces';history.push(row);return 0;
 }
 return {reserve,act,report:s=>structuredClone({startDay,material,capitalTarget,built,history,repairRequests,paidCost:history.reduce((n,r)=>n+r.paidCost,0),paidPieces:history.reduce((n,r)=>n+r.paidPieces,0),scope:'Paid expanding native perimeters; actual interception not established by construction alone; repairs requested never counted as completion'})};
}
