import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {AnimationClip,Box3,Vector3} from 'three';
import {actorGeometry} from '../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {AuthoredBeastRecovery} from '../src/rendering/authored-beast-recovery.js';
import {BakedSolidContacts} from '../src/rendering/baked-solid-contacts.js';
const stats=values=>{const v=[...values].sort((a,b)=>a-b);return {mean:v.reduce((a,b)=>a+b,0)/v.length,p95:v[Math.floor(v.length*.95)],max:v.at(-1)};};
const output={scope:'Node CPU diagnostic of authored recovery, not browser FPS or a paired implementation benchmark',scenarios:[]};
for(const species of ['buffalo','rhino']){
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url)),binding=new BeastRagdollBinding(model);
 const clip=AnimationClip.parse(JSON.parse(fs.readFileSync(new URL(`../content/source/animations/stand-up/${species}-candidate.json`,import.meta.url))).clip);
 binding.capture();const snapshot=new Float32Array(98);binding.physicalSnapshot(snapshot);
 for(const solids of [false,true]){
  const contacts=new BakedSolidContacts(binding,solids?[new Box3(new Vector3(.7,0,-20),new Vector3(1,3,20))]:[]);
  const recovery=new AuthoredBeastRecovery(binding,snapshot,{clip,surface:()=>0,solidContacts:contacts});
  let clothMs=0,solidMs=0,envelopeMs=0;
  const wrap=(object,key,record)=>{const original=object[key].bind(object);object[key]=(...args)=>{const start=performance.now();const result=original(...args);record(performance.now()-start);return result;};};
  wrap(recovery.cloth,'resolve',ms=>clothMs+=ms);wrap(contacts,'resolve',ms=>solidMs+=ms);if(contacts.solidBounds)wrap(contacts.solidBounds,'expand',ms=>envelopeMs+=ms);
  const measurements={total:[],cloth:[],solids:[],envelope:[],other:[]};
  for(let pass=0;pass<4;pass++)for(let frame=1;frame<=120;frame++){
   recovery.age=0;clothMs=solidMs=envelopeMs=0;const start=performance.now();recovery.apply(recovery.duration*frame/120);recovery.restore();const total=performance.now()-start;
   if(pass){measurements.total.push(total);measurements.cloth.push(clothMs);measurements.solids.push(solidMs);measurements.envelope.push(envelopeMs);measurements.other.push(total-clothMs-solidMs);}
  }
  output.scenarios.push({species,solids,samples:recovery.samples.length,clothBones:recovery.cloth.entries.length,ms:Object.fromEntries(Object.entries(measurements).map(([k,v])=>[k,stats(v)]))});
 }
}
console.log(JSON.stringify(output,null,2));
