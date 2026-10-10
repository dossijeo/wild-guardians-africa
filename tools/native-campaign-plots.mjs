import {activeChunkRegion} from '../src/world/active-region.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {centerServicePoint} from '../src/world/centers.js';
import {footprintFluidSample} from '../src/world/fluid-placement.js';
export function sampledPlotFluidClearance(nav,p,radius){
 if(!Number.isFinite(radius)||radius<0||radius>3)throw Error('Invalid plot fluid clearance');
 if(!radius)return true;
 const polygon=Array.from({length:16},(_,i)=>({x:p.x+Math.cos(i*Math.PI/8)*radius,z:p.z+Math.sin(i*Math.PI/8)*radius}));
 return !footprintFluidSample(nav.field,polygon);
}
// Bounded searches and genuine camera residency; no permanent gigantic bounds.
export function createNativeCampaignPlots(nav,getState,{spacing=1.5,checksPerDecision=8,fluidClearance=0}={}){
 if(!Number.isFinite(fluidClearance)||fluidClearance<0||fluidClearance>3)throw Error('Invalid plot fluid clearance');
 let fluidClearanceRejected=0;
 let candidates=[],index=0,regions=new Set(),plots=[],transitions=[],lastReason='searching',reuseCursor=0,regionAnchor=null;
 const offsets=[[0,0],[96,0],[-96,0],[0,96],[0,-96],[96,96],[-96,96],[96,-96],[-96,-96]];
 const focus=p=>{
  const pose=nativeCameraPose(nav.field,[p.x,0,p.z],nav.field.canyon?0:.5,1.16,38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},p);const region=activeChunkRegion({x:pose.eye[0],z:pose.eye[2]});nav.setActiveBounds(region.bounds);return region;
 };
 function nextRegion(s){
  for(const c of s.structures.filter(c=>c.kind==='center'&&c.status==='intact'))for(const [dx,dz]of offsets){
   const region=focus({x:c.x+dx,z:c.z+dz}),key=region.cx+','+region.cz;
   if(regions.has(key))continue;regionAnchor={x:c.x+dx,z:c.z+dz};regions.add(key);transitions.push({day:s.day,time:s.time,key,bounds:region.bounds,centerId:c.id});
   const origin=centerServicePoint(c,s,.8),[x0,z0,x1,z1]=region.bounds;index=0;candidates=[];
   for(let z=Math.ceil(z0/spacing)*spacing;z<=z1;z+=spacing)for(let x=Math.ceil(x0/spacing)*spacing;x<=x1;x+=spacing)candidates.push({x,z,centerId:c.id});
   candidates.sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z)||a.z-b.z||a.x-b.x);return true;
  }return false;
 }
 function valid(p,s){const c=s.structures.find(c=>c.id===p.centerId&&c.status==='intact');if(!c)return false;
  if(!sampledPlotFluidClearance(nav,p,fluidClearance)){fluidClearanceRejected++;return false;}
  const origin=centerServicePoint(c,s,.8);return nav.placement(p.x,p.z,.4).valid&&nav.path(origin,p,.28,null,true)&&nav.path(p,origin,.28,null,true);}
 function choose(){
  const s=getState(),occupied=new Set(s.plants.filter(p=>p.alive).map(p=>p.x+','+p.z));
  // Reused plots revalidate current walls, fluids and paths; old legality is not cached.
  let attempts=0;
  for(let n=0;n<plots.length&&attempts<checksPerDecision;n++){
   const p=plots[reuseCursor++%plots.length];if(occupied.has(p.x+','+p.z))continue;attempts++;focus(p);if(valid(p,s)){lastReason='active';return p;}
  }
  if(index>=candidates.length&&!nextRegion(s)){lastReason='space';return null;}
  if(regionAnchor)focus(regionAnchor);
  for(let n=0;n<checksPerDecision&&index<candidates.length;n++){
   const p=candidates[index++];if(occupied.has(p.x+','+p.z)||!valid(p,s))continue;plots.push(p);lastReason='active';return p;
  }lastReason='searching';return null;
 }
 return {choose,reason:()=>lastReason,report:()=>({plots:plots.length,transitions:structuredClone(transitions),checksPerDecision,fluidClearance,fluidClearanceRejected,scope:'Native finite resident regions; every placement requires legal outward and return paths. Optional sampled fluid margin is a player placement preference, not a production restriction or farm size cap.'})};
}
