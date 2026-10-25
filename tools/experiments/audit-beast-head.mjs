import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from '../glb-container.mjs';
import {prepareAnimalClips,applyAnimalPose,animalGroundSamples} from '../../src/rendering/animal-actions.js';
const species=process.argv[2]??'lion',degrees=Number(process.argv[3]??15);
const lib=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals[species];
const after=readGlb(await readFile(`.codex-tmp/beast-head/${species}-${degrees}.glb`)),source=after.json.asset.extras?.wildHeadPosture?.source??lib.url;
assert(/^\/assets\/[a-f0-9]{64}\.glb$/.test(source));
const before=readGlb(source===lib.url?await readFile('public'+source):execFileSync('git',['show','3c1db05fd:public'+source],{maxBuffer:150*1024*1024}));
assert(Buffer.from(before.bin).equals(Buffer.from(after.bin.subarray(0,before.bin.length))));
for(const key of ['nodes','meshes','skins','materials','images','textures','samplers'])assert.deepEqual(after.json[key],before.json[key],key);
let unchangedChannels=0;
for(const a of before.json.animations){const b=after.json.animations.find(b=>b.name===a.name);assert.deepEqual(a.channels,b.channels);for(const c of a.channels){const n=before.json.nodes[c.target.node].name;if(['Neck','Head'].includes(n)&&c.target.path==='rotation'&&a.name!=='restpose')continue;assert.deepEqual(a.samplers[c.sampler],b.samplers[c.sampler]);unchangedChannels++;}}
async function load(g){const json=structuredClone(g.json);for(const m of json.materials){delete m.normalTexture;delete m.pbrMetallicRoughness?.baseColorTexture;}const bytes=writeGlb(json,g.bin),gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');const model=gltf.scene;model.updateMatrixWorld(true);return {model,mixer:new THREE.AnimationMixer(model),clips:prepareAnimalClips(gltf.animations),groundSamples:animalGroundSamples(model),bind:model.getObjectByName('Head').getWorldQuaternion(new THREE.Quaternion()).invert()};}
const pair=await Promise.all([load(before),load(after)]),report={species,degrees,source,unchangedChannels,geometryAndImages:'Byte-identical',clips:[],scope:'129 phases per clip using production pose/grounding; gaze is a diagnostic bind-relative axis, not absolute eye direction.'};
for(const clip of pair[0].clips){if(clip.name==='restpose')continue;const ranges=pair.map(()=>[Infinity,-Infinity]);let maxBodyDelta=0;
 for(let i=0;i<129;i++){
  const time=clip.duration*i/129,attack=!['Walking','Running'].includes(clip.name),animal=attack?{species,status:'attacking',animation:clip.name,attackId:clip.name,attackDuration:clip.duration,attackRemaining:clip.duration-time}:{species,status:clip.name==='Running'?'entering':'walking',motionPhase:time};
  for(const [j,data] of pair.entries()){applyAnimalPose(data,animal,0);data.model.updateMatrixWorld(true);const q=data.model.getObjectByName('Head').getWorldQuaternion(new THREE.Quaternion()).multiply(data.bind),gaze=new THREE.Vector3(0,0,1).applyQuaternion(q),pitch=THREE.MathUtils.radToDeg(Math.atan2(gaze.y,Math.hypot(gaze.x,gaze.z)));ranges[j][0]=Math.min(ranges[j][0],pitch);ranges[j][1]=Math.max(ranges[j][1],pitch);}
  pair[0].model.traverse(b=>{if(!b.isBone||['Neck','Head','Head_top'].includes(b.name))return;const next=pair[1].model.getObjectByName(b.name);for(let k=0;k<16;k++)maxBodyDelta=Math.max(maxBodyDelta,Math.abs(b.matrixWorld.elements[k]-next.matrixWorld.elements[k]));});
 }
 assert(maxBodyDelta<1e-7,'Body/cloth changed');assert(ranges[1][1]-ranges[1][0]>.1,'Frozen head');report.clips.push({name:clip.name,duration:clip.duration,beforePitch:ranges[0],afterPitch:ranges[1],maxBodyDelta});
}
await writeFile(`docs/qa/beast-integration-20261025/${species}/head-${degrees}/audit.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
