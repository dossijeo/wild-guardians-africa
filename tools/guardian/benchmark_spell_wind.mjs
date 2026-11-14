import {readFileSync} from 'node:fs';
import {cpus} from 'node:os';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {rigForSampling} from '../prepare_watering_emitters.mjs';
import {spellWindBinding,applySpellWind} from '../../src/rendering/guardian-spell-wind.js';
const gltf=await new GLTFLoader().parseAsync(rigForSampling(readFileSync('public/content/guardian/guardian.glb')),'');
const bones=[];gltf.scene.traverse(b=>{if(b.isBone&&/^(Mantle|Feather|Wood)/.test(b.name))bones.push(b);});
const current=bones.map(spellWindBinding).filter(Boolean),previous=bones.map((bone,i)=>({bone,phase:i*.71})),rest=bones.map(b=>b.quaternion.clone());
if(current.length!==24)throw Error('Expected all 24 installed wind bones, got '+current.length);
const ease=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
function old(age){const gust=Math.sin(Math.PI*ease(age/.55))*Math.exp(-Math.max(0,age-.35)*3)+.3*Math.sin(Math.PI*ease((age-1.5)/.7));for(const {bone,phase} of previous){bone.rotation.x+=gust*.16*Math.sin(phase-age*7);bone.rotation.z+=gust*.12*Math.cos(phase-age*5);}}
function run(mode,count){const start=performance.now();for(let i=0;i<count;i++){for(let b=0;b<bones.length;b++)bones[b].quaternion.copy(rest[b]);const age=(i%133)/60;if(mode==='previous')old(age);else applySpellWind(current,age);}return (performance.now()-start)/count;}
for(let i=0;i<4;i++){run('previous',2000);run('current',2000);}
const rows=[];for(let block=0;block<12;block++)for(const mode of block%2?['current','previous','previous','current']:['previous','current','current','previous'])rows.push({block,mode,msPerUpdate:run(mode,4000)});
const summaries={};for(const mode of ['previous','current']){const v=rows.filter(r=>r.mode===mode).map(r=>r.msPerUpdate).sort((a,b)=>a-b);summaries[mode]={medianBatchMsPerUpdate:v[Math.floor(v.length/2)],minBatchMsPerUpdate:v[0],maxBatchMsPerUpdate:v.at(-1)};}
console.log(JSON.stringify({scope:'Node CPU microbenchmark of secondary wind plus identical quaternion restoration, installed rig. Batch averages are not frame percentiles. Excludes mixer, skinning, render, VFX, GPU and gameplay. Not raid-performance acceptance.',node:process.version,cpu:cpus()[0].model,bones:bones.length,matchedBindings:current.length,updatesPerBatch:4000,summaries,rows},null,2));
