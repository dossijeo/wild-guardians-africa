import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {Box3} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {SkinContactBounds as Current} from '../../src/rendering/skin-contact-bounds.js';

// Compare the current implementation to a named Git revision in the same
// process. The fixture measures CPU envelope evaluation, not a game frame.
const revision=process.env.BASELINE_REVISION??'93fe26470^';
let source=execFileSync('git',['show',`${revision}:src/rendering/skin-contact-bounds.js`],{encoding:'utf8'});
source=source.replace("from 'three'",`from '${import.meta.resolve('three')}'`).replace("from './skin-contact-indices.js'",`from '${new URL('../../src/rendering/skin-contact-indices.js',import.meta.url).href}'`);
const Baseline=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).SkinContactBounds;
const actors=[];
for(const species of ['hyena','lion','warthog','buffalo','rhino']){
 const model=await actorGeometry(new URL('../../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));
 model.position.set(12,3,-7);model.rotation.set(.1,.7,-.2);model.updateMatrixWorld(true);
 actors.push({model,baseline:new Baseline(model),current:new Current(model)});
}
const stats=v=>{v.sort((a,b)=>a-b);return {mean:v.reduce((a,b)=>a+b,0)/v.length,p95:v[Math.floor(v.length*.95)],p99:v[Math.floor(v.length*.99)]};};
const rows=[];let maxDifference=0;
const modes=process.env.REVERSE==='1'?['current','baseline','baseline','current']:['baseline','current','current','baseline'];
for(const mode of modes){
 const times=[];let checksum=0;
 for(let frame=0;frame<330;frame++){
  for(const a of actors){a.model.rotation.y=.7+Math.sin(frame/25)*.2;a.model.updateMatrixWorld(true);}
  const start=performance.now();for(const a of actors){const box=a[mode].expand(new Box3());checksum+=box.min.x+box.min.y+box.min.z+box.max.x+box.max.y+box.max.z;}if(frame>=30)times.push(performance.now()-start);
  if(frame%50===0)for(const a of actors){const x=a.baseline.expand(new Box3()),y=a.current.expand(new Box3());maxDifference=Math.max(maxDifference,x.min.distanceTo(y.min),x.max.distanceTo(y.max));}
 }
 rows.push({mode,frameMs:stats(times),checksum});
}
const result={revision,scope:'Five real animal meshes, moving root; Node CPU only, no GPU or physics.',rows,maxDifference};
const out=process.env.OUTPUT;if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
