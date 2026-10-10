// Isolated QA. Reports resource demand; does not load render chunks or override
// production's active-border contract. Expansion is finite and explicit.
import {connectedCandidate,topologyFixture} from './probe-raid-entry-topology.mjs';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

export function requiredEntryChunks(entry,specs){
 const result=new Set();
 for(let i=0;i<specs.length;i++)for(const point of [entry.entries[i],entry.exits[i]]){
  const radius=specs[i].radius+1;
  for(let cz=Math.floor((point.z-radius+24)/48);cz<=Math.floor((point.z+radius+24)/48);cz++)
   for(let cx=Math.floor((point.x-radius+24)/48);cx<=Math.floor((point.x+radius+24)/48);cx++)result.add(`${cx},${cz}`);
 }
 return [...result].sort();
}
export function expandedCandidate(s,specs,bounds,side,nav,maxRings=2){
 if(!Number.isInteger(maxRings)||maxRings<0||maxRings>2)throw new RangeError('QA expansion supports zero to two rings');
 const attempts=[];
 for(let rings=0;rings<=maxRings;rings++){
  const margin=rings*48,expanded=[bounds[0]-margin,bounds[1]-margin,bounds[2]+margin,bounds[3]+margin];
  const begin=performance.now(),r=connectedCandidate(s,specs,expanded,side,nav);
  attempts.push({rings,bounds:expanded,method:r.method,accepted:!!r.entry,selectionMs:performance.now()-begin});
  if(r.entry)return {...r,selectionBounds:expanded,expandedRings:rings,attempts,requiredChunks:requiredEntryChunks(r.entry,specs)};
 }
 return {entry:null,expandedRings:null,attempts,requiredChunks:[]};
}
export function expansionProbe(shape='clipped-bounds'){
 const {s,nav}=topologyFixture(shape),view=nav.raidView;
 if(shape==='oversized-enclosure'){
  // Actual wall ring scaled enough to exceed both permitted expansion rings.
  for(const wall of s.structures)if(wall.kind==='wall'){wall.x*=8;wall.z*=8;wall.baseScaleX=8;}
  nav.setState(s);nav.setActiveBounds([-18,-18,18,18]);
 }
 const frozen=JSON.stringify(s),bounds=[...nav.activeBounds],specs=[{radius:ANIMAL_ACTIONS.animals.warthog.presentation.footprint.radius}];
 const result=expandedCandidate(s,specs,bounds,0,nav);assert.equal(JSON.stringify(s),frozen);assert.equal(nav.raidView,view);assert.deepEqual(nav.activeBounds,bounds);
 let firstHit=null,steps=0;
 if(result.entry){nav.preparedRaidEntry=()=>({entry:result.entry});spawnRaid(s,{group:['warthog']},nav);
  while(s.raid&&steps<2400&&!s.events.some(e=>e.type==='CropHit'||e.type==='StructureHit')){s.elapsed+=.05;updateRaid(s,.05,nav);steps++;}
  firstHit=s.events.find(e=>e.type==='CropHit'||e.type==='StructureHit')?.type??null;
 }
 return {shape,originalBounds:bounds,entry:result.entry,expandedRings:result.expandedRings,selectionBounds:result.selectionBounds??null,attempts:result.attempts,requiredChunks:result.requiredChunks,firstHit,steppedSeconds:steps*.05};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const rows=['clipped-bounds','closed','open','oversized-enclosure'].map(expansionProbe),out=process.argv[2];mkdirSync(out,{recursive:true});
 const footprint=['media','alta'].map(quality=>{const base=activeChunkRegion({x:0,z:0},quality),before=(base.range*2+1)**2;return {quality,baseChunks:before,oneFullRingExtra:(base.range*2+3)**2-before,twoFullRingsExtra:(base.range*2+5)**2-before};});
 const paths=['tools/probe-expanded-raid-entry.mjs','tools/probe-raid-entry-topology.mjs','tools/probe-exterior-raid-entry.mjs','tools/probe-camera-enclosure.mjs','src/simulation/raids.js','src/world/navigation.js','src/world/active-region.js'];
 writeFileSync(out+'/expanded-candidate.json',JSON.stringify({scope:'Bounded entry-selection experiment only; required chunks are demand, not proof of render readiness; no production changes or campaigns',sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')])),rows,footprint},null,2)+'\n');
 console.log(JSON.stringify({rows:rows.map(r=>({shape:r.shape,rings:r.expandedRings,firstHit:r.firstHit,requiredChunks:r.requiredChunks,attempts:r.attempts})),footprint}));
}
