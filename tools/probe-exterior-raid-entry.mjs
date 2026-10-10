// Isolated candidate: never imported by production. Envelope is deliberately
// conservative and does not claim to detect topological enclosure or gates.
import {cameraRaidEntry,chooseRaidEntry,spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {wallCollisionFrame} from '../src/world/wall-collision-frame.js';
import {enclosureFixture} from './probe-camera-enclosure.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

export function exteriorCandidate(s,specs,bounds,side,nav){
 const walls=s.structures.filter(w=>w.kind==='wall'&&w.hp>0&&w.status!=='collapsing');
 if(!walls.length)return {entry:chooseRaidEntry(s,specs,bounds,side,nav),method:'unchanged-no-walls'};
 const envelope=[Infinity,Infinity,-Infinity,-Infinity];
 for(const w of walls){const f=wallCollisionFrame(w),hx=Math.abs(f.c)*f.width+Math.abs(f.s)*f.depth,hz=Math.abs(f.s)*f.width+Math.abs(f.c)*f.depth;
  envelope[0]=Math.min(envelope[0],w.x-hx);envelope[1]=Math.min(envelope[1],w.z-hz);envelope[2]=Math.max(envelope[2],w.x+hx);envelope[3]=Math.max(envelope[3],w.z+hz);
 }
 const outside=(p,r)=>p.x-r>envelope[2]||p.x+r<envelope[0]||p.z-r>envelope[3]||p.z+r<envelope[1];
 const accept=entry=>entry&&entry.entries.every((p,i)=>outside(p,specs[i].radius)&&outside(entry.exits[i],specs[i].radius));
 const original=nav.raidView;
 try{
  const existing=cameraRaidEntry(s,specs,bounds,nav);
  if(accept(existing))return {entry:existing,method:'unchanged-exterior-camera',envelope};
  const focus=s.structures.find(v=>v.kind==='center'&&v.hp>0);
  if(focus&&original){
   const dx=original.eye.x-original.target.x,dz=original.eye.z-original.target.z,length=Math.hypot(dx,dz);
   if(length>1e-6){
    const bx=dx/length,bz=dz/length;
    // Move beyond the first envelope edge in the original camera heading.
    // This is a candidate compromise: nearby arrival is no longer relative to
    // the actual camera when that camera lies inside the defended region.
    const crossings=[Math.abs(bx)>1e-8?(envelope[bx>0?2:0]-focus.x)/bx:Infinity,Math.abs(bz)>1e-8?(envelope[bz>0?3:1]-focus.z)/bz:Infinity].filter(v=>v>=0&&Number.isFinite(v));
    const t=crossings.length?Math.min(...crossings):0;
    const margin=Math.max(...specs.map(v=>v.radius))+1;
    nav.raidView={eye:{x:focus.x+bx*(t+margin),z:focus.z+bz*(t+margin)},target:{x:focus.x,z:focus.z}};
    const projected=cameraRaidEntry(s,specs,bounds,nav);
    if(accept(projected))return {entry:projected,method:'projected-exterior-camera',envelope};
   }
  }
  nav.raidView=null;
  const edge=chooseRaidEntry(s,specs,bounds,side,nav);
  return {entry:accept(edge)?edge:null,method:'active-edge-fallback',envelope};
 }finally{nav.raidView=original;}
}

export function runProbe({heading=0,group=['warthog'],candidate=false}={}){
 const {s,nav}=enclosureFixture(8),eye={x:Math.sin(heading)*8,z:Math.cos(heading)*8};
 nav.setRaidView(eye,{x:0,z:0});
 const originalView=JSON.stringify(nav.raidView),specs=group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
 let selection=null,entryMs=null;
 if(candidate){const begin=performance.now();selection=exteriorCandidate(s,specs,nav.activeBounds,0,nav);entryMs=performance.now()-begin;
  assert.equal(JSON.stringify(nav.raidView),originalView);assert.ok(selection.entry);
  nav.preparedRaidEntry=()=>({entry:selection.entry});
 }
 const begin=performance.now();spawnRaid(s,{group},nav);const spawnMs=performance.now()-begin;assert.ok(s.raid);
 const births=s.raid.animals.map(a=>({species:a.species,radius:a.radius,birth:{...a.spawn},insideSquare:Math.abs(a.x)<20&&Math.abs(a.z)<20,distanceFromEye:Math.hypot(a.x-eye.x,a.z-eye.z)}));
 updateRaid(s,0,nav);
 const targets=s.raid.animals.map(a=>({species:a.species,targetId:a.targetId,kind:a.targetId==='crop'?'crop':s.structures.find(t=>t.id===a.targetId)?.kind??null}));
 let steps=0;
 while(s.raid&&steps<2400&&!s.events.some(e=>e.type==='CropHit'||e.type==='StructureHit')){s.elapsed+=.05;updateRaid(s,.05,nav);steps++;}
 const hit=s.events.find(e=>e.type==='CropHit'||e.type==='StructureHit');
 return {candidate,heading,group,method:selection?.method??'production',entryMs,spawnMs,births,targets,firstHit:hit?{type:hit.type,targetId:hit.targetId}:null,steps,steppedSeconds:steps*.05};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const rows=[];
 for(const heading of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const candidate of [false,true])rows.push(runProbe({heading,candidate}));
 rows.push(runProbe({group:['warthog','hyena','buffalo','lion','rhino'],candidate:true}));
 const out=process.argv[2];mkdirSync(out,{recursive:true});
 const paths=['tools/probe-exterior-raid-entry.mjs','tools/probe-camera-enclosure.mjs','src/simulation/raids.js','src/world/navigation.js','src/world/wall-collision-frame.js'];
 writeFileSync(out+'/exterior-candidate.json',JSON.stringify({scope:'QA-only conservative envelope candidate in a synthetic closed square; isolated native actors, not production integration, biome campaign, or GPU benchmark',sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')])),rows},null,2)+'\n');
 console.log(JSON.stringify(rows.map(r=>({candidate:r.candidate,heading:r.heading,group:r.group,method:r.method,entryMs:r.entryMs,spawnMs:r.spawnMs,inside:r.births.filter(a=>a.insideSquare).length,firstHit:r.firstHit,steppedSeconds:r.steppedSeconds}))));
}
