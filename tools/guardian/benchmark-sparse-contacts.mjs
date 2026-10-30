import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {Vector3} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastRecovery} from '../../src/rendering/beast-recovery.js';
import {SkinContactSampler} from './skin-contact-sampler-experiment.mjs';
const rows=[];
for(const species of ['hyena','lion','warthog','buffalo','rhino']){
 const model=await actorGeometry(new URL('../../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));model.updateMatrixWorld(true);
 const samples=BeastRecovery.contactSamples(model),sampler=new SkinContactSampler(samples),out=new Float64Array(samples.length*3),p=new Vector3();
 const reference=()=>{for(let i=0;i<samples.length;i++){const {mesh,index}=samples[i];mesh.getVertexPosition(index,p).applyMatrix4(mesh.matrixWorld).toArray(out,i*3);}};
 const prepared=()=>sampler.sample(out);for(let i=0;i<50;i++){reference();prepared();}
 const times={reference:[],prepared:[]};for(let i=0;i<100;i++)for(const key of i%2?['prepared','reference']:['reference','prepared']){const start=performance.now();(key==='reference'?reference:prepared)();times[key].push(performance.now()-start);}
 const stats=a=>{a.sort((a,b)=>a-b);return {medianMs:a[50],p95Ms:a[95]};};rows.push({species,samples:samples.length,reference:stats(times.reference),prepared:stats(times.prepared)});
}
const report={scope:'Node CPU microbenchmark; static pose, alternating order, 50 warmups and 100 samples each. Not browser frame performance.',rows};
fs.writeFileSync(new URL('../../docs/guardian/sparse-contact-cost.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
