import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {AnimationMixer,Group} from 'three';
import {actorAsset} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {prepareAnimalModel,prepareAnimalClips,animalGroundSamples,applyAnimalPose} from '../../src/rendering/animal-actions.js';
import {supportAnimalOnTerrain} from '../../src/rendering/animal-terrain-support.js';

const actors=[];
for(const species of ['hyena','lion','warthog','buffalo','rhino']){
 const asset=await actorAsset(new URL('../../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));
 const model=prepareAnimalModel(asset.scene,species),root=new Group();root.add(model);root.position.set(4,0,3);root.rotation.y=.7;root.updateMatrixWorld(true);
 actors.push({species,data:{model,mixer:new AnimationMixer(model),clips:prepareAnimalClips(asset.animations),groundSamples:animalGroundSamples(model),cachedSkinning:process.env.ANIMAL_SKIN_CACHE==='1'},animal:{species,status:'walking',motionPhase:0}});
}
const terrain=(x,z)=>.2*(x-4)-.1*(z-3),rows=[];
const stats=values=>{const s=values.slice().sort((a,b)=>a-b);return {count:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:s.at(-1)};};
for(const mode of ['moving','fixed'])for(const cached of [false,true,true,false]){
 for(const actor of actors)actor.data.cachedSkinning=cached?2:false;
 const perSpecies=new Map(actors.map(a=>[a.species,{pose:[],support:[],height:0}])),frames=[];
 for(let frame=0;frame<280;frame++){
  const start=performance.now();
  for(const a of actors){
   a.animal.motionPhase=mode==='fixed'?1:frame/30;const poseStart=performance.now();applyAnimalPose(a.data,a.animal,frame/30);const supportStart=performance.now();supportAnimalOnTerrain(a.data,terrain);const end=performance.now();
   if(frame>=40){const row=perSpecies.get(a.species);row.pose.push(supportStart-poseStart);row.support.push(end-supportStart);row.height+=a.data.model.position.y;}
  }
  if(frame>=40)frames.push(performance.now()-start);
 }
 rows.push({mode,cached,frame:stats(frames),species:[...perSpecies].map(([species,row])=>({species,pose:stats(row.pose),support:stats(row.support),heightChecksum:row.height}))});
}
const result={scope:'Node CPU microbenchmark, five real animal rigs and sloped analytic terrain; pose includes flat grounding, support is a separate terrain pass. No GPU, Rapier, workers, obstacles or game-frame claim.',rows};
const path=process.env.ANIMAL_SUPPORT_OUT??'docs/lighting/tree-near-retexture/performance/animal-support-cpu-abba.json';fs.writeFileSync(path,JSON.stringify(result,null,2));console.log(JSON.stringify(rows.map(({mode,cached,frame})=>({mode,cached,frame}))));
