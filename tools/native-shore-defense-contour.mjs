// QA planning geometry only. Water is excluded from the proposed occupied
// envelope; every resampled wall must still pass native quoting and proof.
import {containsPoint} from '../src/world/footprints.js';
import {centerFootprint} from '../src/world/centers.js';
import {operational} from '../src/simulation/rules.js';
export function shoreDefenseContours(s,nav,{padding=2,step=.5,maxCells=20000,waterFringe=0}={}){
 if(!Number.isFinite(padding)||padding<1||padding>6||![.25,.5,1].includes(step)||!Number.isFinite(waterFringe)||waterFringe<0||waterFringe>.2||!Number.isSafeInteger(maxCells)||maxCells<1||maxCells>30000)throw Error('Invalid bounded shore envelope');
 const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(c=>c.kind==='center'&&operational(c)).flatMap(c=>centerFootprint(c,s).footprint)];
 if(!land.length)return {candidates:[],reason:'no-land'};
 const rows=new Map();
 for(const p of land)for(let z=Math.floor((p.z-padding)/step);z<=Math.ceil((p.z+padding)/step);z++){
  const row=rows.get(z)??[Infinity,-Infinity];row[0]=Math.min(row[0],Math.floor((p.x-padding)/step));row[1]=Math.max(row[1],Math.ceil((p.x+padding)/step));rows.set(z,row);
 }
 const cells=new Set();let scanned=0;
 for(const [z,[min,max]] of rows)for(let x=min;x<=max;x++){
  if(++scanned>maxCells)return {candidates:[],reason:'shore-cell-bound',scanned};
  const px=(x+.5)*step,pz=(z+.5)*step;
  // A narrow shore fringe is a proposal, never permission to build on water.
  // Native wallPlacement still rejects every entirely submerged piece.
  if(!nav.field.fluidInside(px,pz)||waterFringe&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>!nav.field.fluidInside(px+dx*waterFringe,pz+dz*waterFringe)))cells.add(`${x},${z}`);
 }
 const edges=new Map(),key=(x,z)=>`${x},${z}`;
 const add=(ax,az,bx,bz)=>{const a=key(ax,az),list=edges.get(a)??[];list.push({x:bx,z:bz});edges.set(a,list);};
 for(const id of cells){const [x,z]=id.split(',').map(Number);
  if(!cells.has(key(x,z-1)))add(x,z,x+1,z);
  if(!cells.has(key(x+1,z)))add(x+1,z,x+1,z+1);
  if(!cells.has(key(x,z+1)))add(x+1,z+1,x,z+1);
  if(!cells.has(key(x-1,z)))add(x,z+1,x,z);
 }
 const loops=[];
 while(edges.size){
  const first=edges.keys().next().value,[x,z]=first.split(',').map(Number),points=[{x,z}];let at=first,closed=false;
  for(let i=0;i<=scanned*4;i++){
   const list=edges.get(at);if(!list?.length)break;
   const q=list.shift();if(!list.length)edges.delete(at);points.push(q);at=key(q.x,q.z);
   if(at===first){closed=true;break;}
  }
  if(!closed)continue;
  const poly=points.slice(0,-1).map(p=>({x:p.x*step,z:p.z*step}));
  if(!land.every(p=>containsPoint(poly,p.x,p.z)))continue;
  const simple=poly.filter((p,i)=>{const a=poly[(i+poly.length-1)%poly.length],b=poly[(i+1)%poly.length];return Math.abs((p.x-a.x)*(b.z-p.z)-(p.z-a.z)*(b.x-p.x))>1e-8;});
  const bounds=simple.reduce((b,p)=>[Math.min(b[0],p.x),Math.min(b[1],p.z),Math.max(b[2],p.x),Math.max(b[3],p.z)],[Infinity,Infinity,-Infinity,-Infinity]);
  loops.push({bounds,points:[...simple,simple[0]].map(p=>[p.x,p.z]),routed:true,shoreRouted:true});
 }
 return {candidates:loops.map(c=>({...c,shoreParameters:{padding,step,maxCells,waterFringe}})),reason:loops.length?'bounded-shore-envelope':'no-single-enclosing-shore-loop',scanned};
}
