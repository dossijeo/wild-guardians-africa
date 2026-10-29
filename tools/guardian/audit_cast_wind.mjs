// CPU skinning diagnostic: production GLB and the summon action sampling rule.
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {rigForSampling} from '../prepare_watering_emitters.mjs';
const bytes=fs.readFileSync('public/content/guardian/guardian.glb');
const gltf=await new GLTFLoader().parseAsync(rigForSampling(bytes),'');
const model=gltf.scene,mixer=new THREE.AnimationMixer(model);
const actions=new Map(gltf.animations.map(c=>[c.name,mixer.clipAction(c).play()]));
const bones=[];model.traverse(b=>{if(b.isBone&&/^Mantle/.test(b.name))bones.push(b);});
const samples=[];
for(let i=0;i<=24;i++){
 const age=i/12,elapsed=3000+age;
 for(const [name,a] of actions){a.enabled=['Float','Mantle_Spell','Spell_Grow'].includes(name);a.weight=1;a.time=name==='Spell_Grow'?Math.min(a.getClip().duration,age/1.5*a.getClip().duration):elapsed%a.getClip().duration;}
 mixer.update(0);model.updateMatrixWorld(true);
 const points=[];model.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();const ids=m.geometry.attributes.skinIndex,weights=m.geometry.attributes.skinWeight;
  for(let v=0;v<ids.count;v++){let influence=0;for(let k=0;k<4;k++)if(/^Mantle/.test(m.skeleton.bones[ids.getComponent(v,k)]?.name??''))influence+=weights.getComponent(v,k);if(influence<.8)continue;const p=new THREE.Vector3();m.getVertexPosition(v,p);points.push(p.toArray());}
 });
 samples.push({age,bones:bones.map(b=>({name:b.name,q:b.quaternion.toArray()})),points});
}
const boneSweep=bones.map((b,j)=>{let max=0;for(const a of samples)for(const c of samples)max=Math.max(max,new THREE.Quaternion().fromArray(a.bones[j].q).angleTo(new THREE.Quaternion().fromArray(c.bones[j].q)));return {name:b.name,degrees:max*180/Math.PI};});
const distances=samples[0].points.map((p,j)=>Math.max(...samples.map(s=>new THREE.Vector3().fromArray(p).distanceTo(new THREE.Vector3().fromArray(s.points[j])))));
distances.sort((a,b)=>a-b);
console.log(JSON.stringify({sha256:crypto.createHash('sha256').update(bytes).digest('hex'),scope:'CPU skinning, two seconds, sampled summon action rule; no GPU or production gust/aim overlay',boneSweep,vertices:distances.length,displacementFromFirst:{median:distances[Math.floor(distances.length*.5)],p95:distances[Math.floor(distances.length*.95)],max:distances.at(-1)},actionStates:[...actions].map(([name,a])=>({name,enabled:a.enabled,weight:a.getEffectiveWeight(),time:a.time}))},null,2));
