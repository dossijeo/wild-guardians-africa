import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {Box3} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {SkinContactBounds} from '../../src/rendering/skin-contact-bounds.js';
import {unrollSkinBounds} from './skin_bounds_unroll_candidate.mjs';

// Evaluate an isolated candidate without altering the production sampler. The
// four influences remain in the same order, including zero and unusual weights.
let source=fs.readFileSync(new URL('../../src/rendering/skin-contact-bounds.js',import.meta.url),'utf8');
source=source.replace("from 'three'",`from '${import.meta.resolve('three')}'`);
source=source.replace("from './skin-contact-indices.js'",`from '${new URL('../../src/rendering/skin-contact-indices.js',import.meta.url).href}'`);
source=unrollSkinBounds(source);
const Candidate=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).SkinContactBounds;
const actors=[];
for(const species of ['hyena','lion','warthog','buffalo','rhino']){
 const model=await actorGeometry(new URL('../../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));
 model.position.set(12,3,-7);model.rotation.set(.1,.7,-.2);model.updateMatrixWorld(true);
 actors.push({species,model,original:new SkinContactBounds(model),candidate:new Candidate(model)});
}
const stats=values=>{const v=values.slice().sort((a,b)=>a-b);return {mean:v.reduce((a,b)=>a+b,0)/v.length,p95:v[Math.floor(v.length*.95)],p99:v[Math.floor(v.length*.99)],max:v.at(-1)};};
const rows=[];let maxDifference=0;
for(const mode of ['original','candidate','candidate','original']){
 const frames=[];let checksum=0;
 for(let frame=0;frame<230;frame++){
  for(const a of actors){a.model.rotation.y=.7+Math.sin(frame/25)*.2;a.model.updateMatrixWorld(true);}
  const t=performance.now();
  for(const a of actors){const b=a[mode].expand(new Box3());checksum+=b.min.x+b.min.y+b.min.z+b.max.x+b.max.y+b.max.z;}
  if(frame>=30)frames.push(performance.now()-t);
  if(frame%40===0)for(const a of actors){const x=a.original.expand(new Box3()),y=a.candidate.expand(new Box3());maxDifference=Math.max(maxDifference,x.min.distanceTo(y.min),x.max.distanceTo(y.max));}
 }
 rows.push({mode,frame:stats(frames),checksum});
}
const result={scope:'Node CPU microbenchmark of full skin-contact envelope of five GLB rigs, moving root; no GPU, physics or total frame.',rows,maxDifference};
fs.writeFileSync('docs/lighting/tree-near-retexture/performance/skin-bounds-unroll-abba.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
