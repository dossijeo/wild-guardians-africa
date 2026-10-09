import {centerBoundaryPoint} from './centers.js';
import {operational} from '../simulation/rules.js';
import {actorSegmentClear} from '../simulation/actor-motion.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const headings=[0,-Math.PI/6,Math.PI/6,-Math.PI/3,Math.PI/3,-Math.PI/2,Math.PI/2,Math.PI];

// All route/terrain answers come from native navigation. This packs a complete
// group into multiple rows; it does not resize bodies or alter selected species.
export function connectedRaidPacking(s,specs,bounds,nav,findApproach,diagnostic=null){
 const centers=s.structures.filter(operational),focus=centers[0];if(!focus)return null;
 const [minX,minZ,maxX,maxZ]=bounds,largest=Math.max(...specs.map(v=>v.radius)),spacing=1.5;
 const view=nav.raidView,heading=view?Math.atan2(view.eye.x-view.target.x,view.eye.z-view.target.z):0;
 const inside=(p,r)=>p.x-r>=minX&&p.x+r<=maxX&&p.z-r>=minZ&&p.z+r<=maxZ;
 const near=p=>distance(p,focus)<12||(view&&distance(p,view.eye)<20);
 const order=specs.map((v,i)=>({i,radius:v.radius})).sort((a,b)=>b.radius-a.radius||a.i-b.i);
 // Search lattice precision does not define body spacing: each accepted pair
 // is checked against its own two native radii plus the original one-metre gap.
 const offsets=[];for(const row of [0,1,-1,2,-2,3,-3,4,-4,5,-5])for(const column of [0,1,-1,2,-2,3,-3,4,-4,5,-5])offsets.push({row,column});
 offsets.sort((a,b)=>a.row*a.row+a.column*a.column-b.row*b.row-b.column*b.column);
 for(const turn of headings){
  const direction=heading+turn,anchor=centerBoundaryPoint(focus,direction,largest+2,s);
  diagnostic?.('anchor',{anchor,direction});
  if(!inside(anchor,largest)||!near(anchor)||!nav.walkable(anchor.x,anchor.z,largest,null,false)){diagnostic?.('anchor-invalid',{anchor,direction});continue;}
  const paths=new Map();let valid=true;
  for(const {radius} of order){
   if(paths.has(radius))continue;const approach=findApproach(anchor,focus,radius);diagnostic?.('anchor-route',{radius,found:!!approach});if(!approach){valid=false;break;}
   let previous=anchor;
   for(const point of approach.path){if(!nav.segmentClear(previous,point,radius,null,false)||!nav.segmentClear(point,previous,radius,null,false)){valid=false;break;}previous=point;}
   if(!valid)break;paths.set(radius,approach);
  }
  if(!valid)continue;
  const entries=Array(specs.length),exits=Array(specs.length),placed=[];
  const connectors=new Map();
  const escape=(actor,others)=>{
   const outward=Math.atan2(actor.x-focus.x,actor.z-focus.z);
   for(const offset of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,3*Math.PI/4,-3*Math.PI/4,Math.PI]){
    const candidate={x:actor.x+Math.sin(outward+offset)*3,z:actor.z+Math.cos(outward+offset)*3};
    if(!inside(candidate,actor.radius)||!nav.walkable(candidate.x,candidate.z,actor.radius,null,false))continue;
    if(!nav.segmentClear(actor,candidate,actor.radius,null,false)||!nav.segmentClear(candidate,actor,actor.radius,null,false)||!actorSegmentClear(actor,candidate,actor,others))continue;
    return candidate;
   }
   return null;
  };
  for(const {i,radius} of order){
   let chosen=null;
   for(const {row,column} of offsets){
    const point={x:anchor.x+Math.sin(direction)*row*spacing+Math.cos(direction)*column*spacing,z:anchor.z+Math.cos(direction)*row*spacing-Math.sin(direction)*column*spacing};
    if(!inside(point,radius)||!near(point)||!nav.walkable(point.x,point.z,radius,null,false))continue;
    if(placed.some(other=>distance(point,other)<=radius+other.radius+1))continue;
    const actor={...point,radius,i};
    // Keep every earlier body's genuine escape corridor unobstructed.
    if(placed.some(other=>!actorSegmentClear(other,exits[other.i],other,[actor])))continue;
    const exit=escape(actor,placed);if(!exit)continue;
    if(!nav.segmentClear(point,anchor,radius,null,false)||!nav.segmentClear(anchor,point,radius,null,false)){
     const key=`${radius}:${row}:${column}`;
     if(!connectors.has(key)){
      const path=nav.approachPath(point,anchor,radius);let previous=point,clear=!!path;
      for(const p of path??[]){if(!nav.segmentClear(previous,p,radius,null,false)||!nav.segmentClear(p,previous,radius,null,false)){clear=false;break;}previous=p;}
      connectors.set(key,clear);
     }
     if(!connectors.get(key))continue;
    }
    chosen={point,exit};break;
   }
   if(!chosen){diagnostic?.('packing-failed',{i,radius,placed:placed.length});valid=false;break;}entries[i]=chosen.point;exits[i]=chosen.exit;placed.push({...chosen.point,radius,i});
  }
  if(!valid)continue;
  for(const actor of placed){
   const others=placed.filter(other=>other!==actor),exit=exits[actor.i];
   if(!actorSegmentClear(actor,exit,actor,others)){valid=false;break;}
   if(!exit){diagnostic?.('escape-failed',{i:actor.i,radius:actor.radius,placed:placed.length});valid=false;break;}exits[actor.i]=exit;
  }
  if(valid){diagnostic?.('complete',{placed:placed.length});return {entries,exits};}
 }
 return null;
}
