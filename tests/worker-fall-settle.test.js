import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Quaternion} from 'three';
import {rigForSampling} from '../tools/prepare_watering_emitters.mjs';
import {prepareWorkerClips} from '../src/rendering/worker-clips.js';
const libraries=JSON.parse(fs.readFileSync('public/content/worker-actions.json'));
for(const [profile,library]of Object.entries(libraries))test(profile+': late fall settles while preserving impact, final pose and source data',async()=>{
 const gltf=await new GLTFLoader().parseAsync(rigForSampling(fs.readFileSync('public'+library.url)),'');
 const source=gltf.animations.find(c=>c.name==='Fall'),before=source.tracks.map(t=>Array.from(t.values));
 const prepared=prepareWorkerClips(gltf.animations);assert.equal(prepareWorkerClips(gltf.animations),prepared);
 const fall=prepared.find(c=>c.name==='Fall');assert.notEqual(fall,source);
 for(let n=0;n<fall.tracks.length;n++){
  const a=source.tracks[n],b=fall.tracks[n],size=a.getValueSize(),edited=/^mixamorig(?:Head|Neck|Spine|Spine1)\.quaternion$/.test(a.name);
  assert.deepEqual(Array.from(a.values),before[n]);
  for(let i=0;i<a.times.length;i++)if(!edited||a.times[i]<=2||i===a.times.length-1)assert.deepEqual(Array.from(b.values.slice(i*size,(i+1)*size)),Array.from(a.values.slice(i*size,(i+1)*size)));
  if(edited){const end=new Quaternion().fromArray(b.values,b.values.length-4).normalize();let previous=Infinity;for(let i=0;i<b.times.length;i++)if(b.times[i]>=2){const distance=end.angleTo(new Quaternion().fromArray(b.values,i*4).normalize());assert.ok(distance<=previous+1e-6);previous=distance;}}
 }
 for(const c of gltf.animations)if(c.name!=='Fall')assert.equal(prepared.find(p=>p.name===c.name),c);
});
