// Native campaign player policy only: paid new pieces/ordinary repair commands.
import * as Game from '../src/simulation/game.js';
import {centerFootprint,centerServicePoint} from '../src/world/centers.js';
import {wallStroke,wallStrokeLine} from '../src/world/wall-layout.js';
import {wallCollisionFrame} from '../src/world/wall-collision-frame.js';
import {numberOf} from '../src/simulation/money.js';
import {permission,operational,wallSpec} from '../src/simulation/rules.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
export function createNativeExpandingDefensePolicy({startDay=2,material='zarzas',interval=30,repairWalls=true,repairFraction=0.8,reserveMode='none',serviceSide=false}={}){
 if(!['none','next-stroke'].includes(reserveMode))throw Error('Invalid defense reserve mode');
 if(!(repairFraction>0&&repairFraction<=1))throw Error('Invalid repair fraction');
 const cost=wallSpec(material).cost;let nextAttempt=0,capitalTarget=0,built=null,repairRequests=0;
 const history=[],owned=new Set();
 const reserve=s=>reserveMode==='next-stroke'&&s.day>=startDay?capitalTarget:0;
 function serviceSideStatus(s,nav,slot){
  const centers=s.structures.filter(operational),
    piece={kind:'wall',material,gate:false,baseScaleX:slot.scaleX,
      x:slot.x,z:slot.z,yaw:-slot.angle},frame=wallCollisionFrame(piece),
    offset=frame.depth+.28+.6;
  let unknown=false;
  for(const sign of [1,-1]){
   const side={x:frame.x+Math.sin(frame.yaw)*offset*sign,
     z:frame.z+Math.cos(frame.yaw)*offset*sign};
   if(!nav.walkable(side.x,side.z,.28,null,true))continue;
   for(const center of centers){
    const source=centerServicePoint(center,s,.8),connected=
      nav.regionConnected(source,side,.28,null,true);
    if(connected===true)return 'reachable';
    if(connected===null)unknown=true;
   }
  }
  return unknown?'unknown':'blocked';
 }
 function act(s,nav,{command,reserve:protectedCash}){
  if(s.day<startDay||!permission(s,'wall')||s.raid||s.elapsed<nextAttempt)return 0;
  nextAttempt=s.elapsed+interval;
  if(!Number.isFinite(protectedCash)||protectedCash<0)throw Error('Invalid protected cash');
  protectedCash=Math.max(protectedCash,HIRING_RESERVE);
  let pending=s.tasks.filter(t=>t.kind==='repair').reduce((n,t)=>{const p=s.structures.find(p=>p.id===t.targetId);return n+(p?Math.ceil(numberOf(Game.repairCost(p))):0);},0);
  // Request native repairs, but do not count uncompleted requests as useful work.
  for(const wall of s.structures)if(repairWalls&&owned.has(wall.id)&&['intact','ruined'].includes(wall.status)&&wall.hp<wall.maxHp*repairFraction&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===wall.id)){
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
  capitalTarget=slots.length*cost;
  const row={day:s.day,time:s.time,elapsed:s.elapsed,bounds,expectedSlots:slots.length,availablePieces:maxPieces,paidPieces:0,paidCost:0,gaps:[]};
  if(!maxPieces){row.reason='budget';history.push(row);return 0;}
  if(serviceSide){
   row.policy='service-side';row.ids=[];row.gates=0;
   for(const slot of slots){
    if(row.paidPieces>=maxPieces){row.gaps.push({x:slot.x,z:slot.z,reason:'budget-limit'});continue;}
    const status=serviceSideStatus(s,nav,slot);
    if(status!=='reachable'){
     row.gaps.push({x:slot.x,z:slot.z,reason:`service-side-${status}`});continue;
    }
    const stroke=wallStrokeLine([slot]),plan=Game.previewWallChain(s,material,stroke,nav,
      {...options,maxPieces:1});
    if(!plan.pieces.length){
     const piece={kind:'wall',material,gate:false,baseScaleX:slot.scaleX,
       x:slot.x,z:slot.z,yaw:-slot.angle},check=nav.wallPlacement(piece);
     row.gaps.push({x:slot.x,z:slot.z,reason:check.valid?
       'crop-overlap-or-native-omission':check.reason??'native-placement'});
     continue;
    }
    if(plan.pieces.length!==1||Math.hypot(plan.pieces[0].x-slot.x,
      plan.pieces[0].z-slot.z)>.01)throw Error('Service-side slot preview changed the wall geometry');
    if(!Game.buildWallChain(s,command('wall'),material,stroke,nav,
      {...options,maxPieces:1}))throw Error('Service-side paid wall was not committed');
    const id=plan.pieces[0].id;
    if(!s.structures.some(w=>w.id===id&&w.kind==='wall'))
      throw Error('Preview ID does not name an actual paid wall');
    owned.add(id);row.ids.push(id);row.paidPieces++;row.paidCost+=plan.cost;
    row.gates+=plan.gates;
   }
   if(row.paidPieces){built={day:s.day,bounds,points,cost:row.paidCost,
     pieces:row.paidPieces,expectedPieces:slots.length,ids:[...owned]};
     history.push(row);return 1;}
   row.reason='no-serviceable-legal-pieces';history.push(row);return 0;
  }
  const plan=Game.previewWallChain(s,material,points,nav,{...options,maxPieces});
  const planned=new Set(plan.pieces.map(p=>`${p.x},${p.z}`));
  for(const slot of slots)if(!planned.has(`${slot.x},${slot.z}`)){
   const piece={kind:'wall',material,gate:false,baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle};
   const check=nav.wallPlacement(piece);
   row.gaps.push({x:slot.x,z:slot.z,reason:!check.valid?check.reason??'native-placement':plan.pieces.length>=maxPieces?'budget-limit':'crop-overlap-or-native-omission'});
  }
  if(plan.pieces.length&&Game.buildWallChain(s,command('wall'),material,points,nav,{...options,maxPieces})){
   row.paidPieces=plan.pieces.length;row.paidCost=plan.cost;row.ids=plan.pieces.map(p=>p.id);row.gates=plan.gates;
   for(const id of row.ids){if(!s.structures.some(w=>w.id===id&&w.kind==='wall'))throw Error('Preview ID does not name an actual paid wall');owned.add(id);}
   built={day:s.day,bounds,points,cost:plan.cost,pieces:plan.pieces.length,expectedPieces:slots.length,ids:[...owned]};history.push(row);return 1;
  }
  row.reason='no-new-legal-pieces';history.push(row);return 0;
 }
 return {reserve,act,report:s=>structuredClone({startDay,material,reserveMode,serviceSide,repairWalls,repairFraction,capitalTarget,built,history,repairRequests,paidCost:history.reduce((n,r)=>n+r.paidCost,0),paidPieces:history.reduce((n,r)=>n+r.paidPieces,0),scope:'Paid expanding native perimeters; actual interception not established by construction alone; repairs requested never counted as completion'})};
}
