import {wallCollisionFrame} from '../world/wall-collision-frame.js';
const outside=(p,r,b)=>p.x-r>b[2]||p.x+r<b[0]||p.z-r>b[3]||p.z+r<b[1];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function extend(box,x,z){box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],z);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],z);}
export function raidWallEnvelope(state,nav){
 let box=null;
 for(const w of state.structures){
  if(w.kind!=='wall'||w.hp<=0||w.status==='collapsing')continue;
  const f=wallCollisionFrame(w),x=Math.abs(f.c)*f.width+Math.abs(f.s)*f.depth,z=Math.abs(f.s)*f.width+Math.abs(f.c)*f.depth;
  box??=[Infinity,Infinity,-Infinity,-Infinity];extend(box,w.x-x,w.z-z);extend(box,w.x+x,w.z+z);
 }
 // Include buildings that can complete a mixed constructed enclosure.
 if(box)for(const o of nav?.obstacles??[])if(['center','house'].includes(o.kind)&&o.footprint)for(const p of o.footprint)extend(box,p.x,p.z);
 return box;
}
function crossings(p,dx,dz,b,r){
 const result=[];
 if(Math.abs(dx)>1e-8)result.push(((dx>0?b[2]+r+1:b[0]-r-1)-p.x)/dx);
 if(Math.abs(dz)>1e-8)result.push(((dz>0?b[3]+r+1:b[1]-r-1)-p.z)/dz);
 return result.filter(t=>t>0&&Number.isFinite(t));
}
// Sufficient exterior witnesses, not an enclosure classifier. Failed rays
// never prove enclosure. A conservative fallback may reject bend-only routes.
export function exteriorRaidWitness(p,r,box,nav){
 if(!box)return true;if(!nav.segmentClear)return false;
 const active=nav.activeBounds??box,b=[Math.min(active[0],box[0]-48),Math.min(active[1],box[1]-48),Math.max(active[2],box[2]+48),Math.max(active[3],box[3]+48)];
 // Reference bounds also cover nearby natural barriers: being outside the
 // finite wall AABB alone does not certify a wall plus cliff pocket.
 if(outside(p,r,b))return true;
 for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,dx=Math.sin(angle),dz=Math.cos(angle),t=Math.min(...crossings(p,dx,dz,b,r));
  if(Number.isFinite(t)&&nav.segmentClear(p,{x:p.x+dx*t,z:p.z+dz*t},r,null,false))return true;
 }
 return false;
}
function groupWitness(entry,specs,box,nav){
 return entry&&entry.entries.length===specs.length&&entry.exits.length===specs.length&&entry.entries.every((p,i)=>{
  const radius=specs[i].radius,exit=entry.exits[i];
  if(!exteriorRaidWitness(p,radius,box,nav))return false;
  // The exit may share the birth's exterior certificate through a verified
  // full-radius segment. Independent straight rays are not necessary when
  // procedural props obstruct only the exit's discretely sampled ray angles.
  return exteriorRaidWitness(exit,radius,box,nav)||!!nav.segmentClear?.(exit,p,radius,null,false);
 });
}
function localView(nav,eye,focus){const local=Object.create(nav);local.raidView={eye,target:focus};return local;}
function formation(state,specs,bounds,nav,camera,eye,focus,dx,dz,box,radius){
 const entries=[],exits=[],columns=Math.ceil(Math.sqrt(specs.length)),spacing=radius*2+4;
 for(let j=0;j<specs.length;j++){
  const lateral=(j%columns-(columns-1)/2)*spacing,back=Math.floor(j/columns)*spacing;
  const anchor={x:eye.x+dx*back-dz*lateral,z:eye.z+dz*back+dx*lateral},single=localView(nav,anchor,focus);
  const piece=camera(state,[specs[j]],bounds,single,single.raidView,0);
  if(!groupWitness(piece,[specs[j]],box,nav)||entries.some((p,k)=>distance(p,piece.entries[0])<=specs[k].radius+specs[j].radius+1))return null;
  entries.push(piece.entries[0]);exits.push(piece.exits[0]);
 }
 return {entries,exits,selectionBounds:bounds};
}
export function exteriorRaidEntry(state,specs,bounds,side,nav,base,camera){
 const box=raidWallEnvelope(state,nav),entry=base(state,specs,bounds,side,nav);
 if(groupWitness(entry,specs,box,nav))return entry;
 const focus=state.structures.find(t=>t.kind==='center'&&t.hp>0&&t.status!=='collapsing')??state.villages[0];
 if(!focus)return null;
 const view=nav.raidView,heading=view?Math.atan2(view.eye.x-view.target.x,view.eye.z-view.target.z):side*Math.PI/2;
 const radius=Math.max(...specs.map(s=>s.radius)),padding=(radius*2+1.1)*(specs.length+6)+20;
 // Direct geometric projection, not successive full-region ring loads.
 // Sixteen directions; no new A* searches in projected camera/formation paths.
 for(let i=0;i<16;i++){
  const angle=heading+(i===0?0:Math.ceil(i/2)*(i%2?-1:1)*Math.PI/8),dx=Math.sin(angle),dz=Math.cos(angle);
  const positive=box?crossings(focus,dx,dz,box,radius):[];if(box&&!positive.length)continue;
  const t=box?Math.min(...positive):Math.max(8,view?distance(view.eye,focus):0);
  const eye={x:focus.x+dx*t,z:focus.z+dz*t};
  const expanded=[Math.min(bounds[0],eye.x-padding),Math.min(bounds[1],eye.z-padding),Math.max(bounds[2],eye.x+padding),Math.max(bounds[3],eye.z+padding)];
  const local=localView(nav,eye,focus),candidate=camera(state,specs,expanded,local,local.raidView,0);
  if(groupWitness(candidate,specs,box,nav))return {...candidate,selectionBounds:expanded};
  const grid=formation(state,specs,expanded,nav,camera,eye,focus,dx,dz,box,radius);if(grid)return grid;
 }
 return null;
}
