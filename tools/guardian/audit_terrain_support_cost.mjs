import {performance} from 'node:perf_hooks';
import {Group} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {animalFootSamples,supportAnimalOnTerrain} from '../../src/rendering/animal-terrain-support.js';
const report={scope:'Node CPU microbenchmark; warm single-model support on analytic plane, not game frame/GPU acceptance.',actors:[]};
for(const species of Object.keys(ANIMAL_ACTIONS.animals)){
 const model=await actorGeometry(new URL('../../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url)),root=new Group();root.add(model);model.scale.setScalar(ANIMAL_ACTIONS.animals[species].presentation.scale);root.updateMatrixWorld(true);
 const start=performance.now(),samples=animalFootSamples(model),setupMs=performance.now()-start,times=[],surface=(x,z)=>.2*x-.1*z;
 for(let i=0;i<550;i++){model.position.y=0;root.rotation.y=i*.01;root.updateMatrixWorld(true);const t=performance.now();supportAnimalOnTerrain({model},surface);if(i>=50)times.push(performance.now()-t);}
 times.sort((a,b)=>a-b);report.actors.push({species,samples:samples.length,setupMs,medianMs:times[250],p95Ms:times[475],maxMs:times[499]});
}
console.log(JSON.stringify(report,null,2));
