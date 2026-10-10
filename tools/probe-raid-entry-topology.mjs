// QA-only refinement: direct native connectivity is a sufficient exterior
// witness, not a complete region/enclosure classifier. Production stays intact.
import {enclosureFixture} from './probe-camera-enclosure.mjs';
import {exteriorCandidate} from './probe-exterior-raid-entry.mjs';
import {cameraRaidEntry,spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {wallCollisionFrame} from '../src/world/wall-collision-frame.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

export function topologyFixture(shape){
 const {s,nav}=enclosureFixture(8);
 if(shape==='open')s.structures=s.structures.filter(w=>!(w.kind==='wall'&&w.z===20&&Math.abs(w.x)<=4));
 if(shape==='gate')Object.assign(s.structures.find(w=>w.kind==='wall'&&w.z===20&&w.x===0),{gate:true,material:'adobe'});
 if(shape==='separate'){
  const walls=s.structures.filter(w=>w.kind==='wall');
  s.structures=[s.structures[0],...walls.map(w=>({...w,id:'left-'+w.id,x:w.x-35})),...walls.map(w=>({...w,id:'right-'+w.id,x:w.x+35}))];
 }
 if(shape==='concave'){
  const nodes=[[-20,-20],[20,-20],[20,0],[0,0],[0,20],[-20,20]];s.structures=s.structures.filter(w=>w.kind!=='wall');
  for(let i=0;i<nodes.length;i++){
   const [x,z]=nodes[i],[ex,ez]=nodes[(i+1)%nodes.length],length=Math.hypot(ex-x,ez-z),n=Math.ceil(length/2);
   for(let j=0;j<n;j++)s.structures.push({id:`l-${i}-${j}`,kind:'wall',x:x+(ex-x)*(j+.5)/n,z:z+(ez-z)*(j+.5)/n,yaw:Math.atan2(-(ez-z),ex-x),material:'zarzas',hp:100,maxHp:100,status:'intact',cost:10,created:2+i*30+j});
  }
  s.plants[0].x=-8;s.plants[0].z=8;nav.setRaidView({x:-8,z:8},{x:-8,z:0});
 }
 if(shape==='no-walls')s.structures=s.structures.filter(w=>w.kind!=='wall');
 if(shape==='clipped-bounds')nav.setActiveBounds([-18,-18,18,18]);
 nav.setState(s);return {s,nav};
}

function envelopeOf(s){
 const box=[Infinity,Infinity,-Infinity,-Infinity];let count=0;
 for(const w of s.structures)if(w.kind==='wall'&&w.hp>0&&w.status!=='collapsing'){
  const f=wallCollisionFrame(w),hx=Math.abs(f.c)*f.width+Math.abs(f.s)*f.depth,hz=Math.abs(f.s)*f.width+Math.abs(f.c)*f.depth;count++;
  box[0]=Math.min(box[0],w.x-hx);box[1]=Math.min(box[1],w.z-hz);box[2]=Math.max(box[2],w.x+hx);box[3]=Math.max(box[3],w.z+hz);
 }
 return count?box:null;
}
export function exteriorWitness(point,radius,envelope,nav){
 if(!envelope)return {kind:'no-walls'};
 const [minX,minZ,maxX,maxZ]=envelope;
 if(point.x-radius>maxX||point.x+radius<minX||point.z-radius>maxZ||point.z+radius<minZ)return {kind:'outside-envelope'};
 // Constant-size native segment queries, no A* or floodfill. A failed probe
 // says nothing about routes that bend; do not call it a proof of enclosure.
 for(let i=0;i<16;i++){
  const a=i*Math.PI/8,dx=Math.sin(a),dz=Math.cos(a);
  const crossings=[dx>1e-8?(maxX+radius+1-point.x)/dx:dx< -1e-8?(minX-radius-1-point.x)/dx:Infinity,dz>1e-8?(maxZ+radius+1-point.z)/dz:dz< -1e-8?(minZ-radius-1-point.z)/dz:Infinity].filter(v=>v>0&&Number.isFinite(v));
  if(!crossings.length)continue;const distance=Math.min(...crossings),end={x:point.x+dx*distance,z:point.z+dz*distance};
  if(nav.segmentClear(point,end,radius,null,false))return {kind:'native-clear-segment',end};
 }
 return null;
}
export function connectedCandidate(s,specs,bounds,side,nav){
 const envelope=envelopeOf(s),existing=cameraRaidEntry(s,specs,bounds,nav);
 const witnesses=existing?.entries.map((p,i)=>({birth:exteriorWitness(p,specs[i].radius,envelope,nav),exit:exteriorWitness(existing.exits[i],specs[i].radius,envelope,nav)}));
 if(existing&&witnesses.every(w=>w.birth&&w.exit))return {entry:existing,method:'unchanged-native-exterior-witness',witnesses};
 return exteriorCandidate(s,specs,bounds,side,nav);
}
export function topologyProbe(shape,kind){
 const {s,nav}=topologyFixture(shape),before=JSON.stringify(s),view=nav.raidView,specs=[{radius:ANIMAL_ACTIONS.animals.warthog.presentation.footprint.radius}];
 const begin=performance.now();
 const selected=kind==='production'?{entry:cameraRaidEntry(s,specs,nav.activeBounds,nav),method:'production-camera'}:(kind==='envelope'?exteriorCandidate:connectedCandidate)(s,specs,nav.activeBounds,0,nav);
 const entryMs=performance.now()-begin;assert.equal(JSON.stringify(s),before);assert.equal(nav.raidView,view);
 if(!selected.entry)return {shape,kind,method:selected.method,entryMs,entry:null,targetKind:null,firstHit:null,limitation:'No accepted exterior entry inside current bounds'};
 const entry=selected.entry.entries[0],camera=nav.raidView.eye;
 nav.preparedRaidEntry=()=>({entry:selected.entry});spawnRaid(s,{group:['warthog']},nav);updateRaid(s,0,nav);
 const targetId=s.raid.animals[0].targetId,targetKind=targetId==='crop'?'crop':s.structures.find(t=>t.id===targetId)?.kind??null;
 let steps=0;
 while(s.raid&&steps<2400&&!s.events.some(e=>e.type==='CropHit'||e.type==='StructureHit')){s.elapsed+=.05;updateRaid(s,.05,nav);steps++;}
 const hit=s.events.find(e=>e.type==='CropHit'||e.type==='StructureHit');
 return {shape,kind,method:selected.method,entryMs,entry,distanceFromEye:Math.hypot(entry.x-camera.x,entry.z-camera.z),targetKind,firstHit:hit?.type??null,steppedSeconds:steps*.05,witnesses:selected.witnesses??null};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const shapes=['closed','open','gate','separate','concave','no-walls','clipped-bounds'],rows=[];
 for(const shape of shapes)for(const kind of ['production','envelope','connected'])rows.push(topologyProbe(shape,kind));
 const out=process.argv[2];mkdirSync(out,{recursive:true});
 const paths=['tools/probe-raid-entry-topology.mjs','tools/probe-exterior-raid-entry.mjs','tools/probe-camera-enclosure.mjs','src/simulation/raids.js','src/world/navigation.js','src/world/wall-collision-frame.js'];
 writeFileSync(out+'/topology-candidates.json',JSON.stringify({scope:'Isolated native actor fixtures on synthetic flat terrain; sufficient direct exterior witness only; not production, complete topology detection, biome campaign, or render QA',sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')])),rows},null,2)+'\n');
 console.log(JSON.stringify(rows.map(r=>({shape:r.shape,kind:r.kind,method:r.method,distance:r.distanceFromEye,firstHit:r.firstHit,limitation:r.limitation}))));
}
