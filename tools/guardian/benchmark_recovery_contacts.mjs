import fs from 'node:fs';
import os from 'node:os';
import {AnimationClip,Box3,Vector3} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {AuthoredBeastRecovery} from '../../src/rendering/authored-beast-recovery.js';
import {BakedSolidContacts} from '../../src/rendering/baked-solid-contacts.js';
const rows=[];
for(const species of ['hyena','lion','warthog','buffalo','rhino']){
 const model=await actorGeometry('public'+ANIMAL_ACTIONS.animals[species].url),binding=new BeastRagdollBinding(model);binding.capture();const snapshot=new Float32Array(98);binding.physicalSnapshot(snapshot);
 const clip=AnimationClip.parse(JSON.parse(fs.readFileSync(`content/source/animations/stand-up/${species}-candidate.json`)).clip),recovery=new AuthoredBeastRecovery(binding,snapshot,{clip,surface:()=>0});
 const contacts={baseline:null,far:new BakedSolidContacts(binding,[new Box3(new Vector3(7,0,-2),new Vector3(8,3,2))]),near:new BakedSolidContacts(binding,[new Box3(new Vector3(-5,0,.4),new Vector3(5,3,.7))])};
 for(const mode of ['baseline','far','near']){recovery.solidContacts=contacts[mode];for(let i=0;i<180;i++){recovery.age=0;recovery.apply((i%180)/180*recovery.duration);}}
 const measured={baseline:[],far:[],near:[]};
 for(const mode of ['baseline','far','far','baseline','baseline','near','near','baseline']){recovery.solidContacts=contacts[mode];const values=[];for(let i=0;i<240;i++){recovery.age=0;const t=performance.now();recovery.apply(i/240*recovery.duration);values.push(performance.now()-t);}measured[mode].push(values);}
 for(const [mode,runs]of Object.entries(measured)){const v=runs.flat().sort((a,b)=>a-b),at=p=>v[Math.floor((v.length-1)*p)];rows.push({species,mode,samples:contacts.far.samples.length,iterations:v.length,medianMs:at(.5),p95Ms:at(.95),p99Ms:at(.99),maxMs:at(1)});}
 recovery.restore();
}
const output=process.argv[2]??'test-results/contact-cost.json';fs.writeFileSync(output,JSON.stringify({scope:'Node CPU microbenchmark, actual production GLTFs, deterministic recovery poses, warmup and ABBA order. Not browser FPS/GPU or a gameplay benchmark.',node:process.version,cpu:os.cpus()[0].model,rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
