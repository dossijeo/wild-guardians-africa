import {canyonFrame} from '../world/terrain.js';
import {exteriorGroupWitness} from './raid-exterior-connectivity.js';
import {raidWallEnvelope,exteriorRaidWitness} from './raid-exterior-entry.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Keep the complete wave, but align its bodies along the narrow dry bank.
// Uses existing route, body-clearance, exterior and residency contracts.
export function canyonRaidFormation(state,specs,bounds,nav,approach){
 const focus=state.structures.find(s=>s.kind==='center'&&s.hp>0&&s.status!=='collapsing');
 if(!focus||typeof nav.field.riverX!=='function')return null;
 const targets=[...state.structures.filter(s=>(s.kind==='center'||s.kind==='wall')&&s.hp>0&&s.status!=='collapsing'),...state.plants.filter(p=>p.alive)];
 const box=raidWallEnvelope(state,nav),radius=Math.max(...specs.map(s=>s.radius)),spacing=radius*2+1.5;
 const bank=focus.x>=nav.field.riverX(focus.z)?1:-1;
 const order=specs.map((s,i)=>({i,r:s.radius})).sort((a,b)=>b.r-a.r||a.i-b.i);
 for(const direction of [-1,1])for(const side of [bank,-bank]){
  const entries=Array(specs.length),exits=Array(specs.length),placed=[];
  for(const {i,r} of order){
   let chosen=null;
   // A bounded bank grid permits staggered columns around props, not a single
   // rigid line which one rock could invalidate for the entire wave.
   for(let row=0;row<24&&!chosen;row++)for(const gap of [1.25,2.5,4,6]){
    const z=(box?(direction<0?box[1]:box[3]):focus.z)+direction*(12+row*spacing);
    const make=z=>({x:nav.field.riverX(z)+side*(canyonFrame(nav.field,z,side).waterHalf+radius+gap),z});
    const point=make(z),exit=make(z+direction*3);
    if([point,exit].some(p=>p.x-r<bounds[0]||p.x+r>bounds[2]||p.z-r<bounds[1]||p.z+r>bounds[3])||placed.some(j=>distance(entries[j],point)<=specs[j].radius+r+1))continue;
    if(!nav.walkable(point.x,point.z,r,null,false)||!nav.walkable(exit.x,exit.z,r,null,false)||!nav.segmentClear(point,exit,r,null,false))continue;
    if(!targets.slice().sort((a,b)=>distance(a,point)-distance(b,point)).slice(0,8).some(target=>approach({...point,radius:r},target,nav)))continue;
    chosen={point,exit};break;
   }
   if(!chosen)break;entries[i]=chosen.point;exits[i]=chosen.exit;placed.push(i);
  }
  const entry={entries,exits};
  if(placed.length===specs.length&&exteriorGroupWitness(entry,specs,box,nav,exteriorRaidWitness))return entry;
 }
 return null;
}
