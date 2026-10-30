import fs from 'node:fs';
import {Box3,Vector3} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {BakedBeastFall} from '../../src/rendering/baked-beast-fall.js';
import {BakedRagdollClip} from '../../src/simulation/baked-ragdoll-clip.js';
import {BakedSolidContacts} from '../../src/rendering/baked-solid-contacts.js';
const root=new URL('../../public/',import.meta.url),base=new URL('content/guardian/ragdoll-fallback/',root),meta=JSON.parse(fs.readFileSync(new URL('falls.json',base))),bytes=fs.readFileSync(new URL('falls.bin',base)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const results=[];
for(const species of ['buffalo','rhino']){
 const model=await actorGeometry(new URL('.'+ANIMAL_ACTIONS.animals[species].url,root)),binding=new BeastRagdollBinding(model),clip=new BakedRagdollClip(meta.clips.find(c=>c.species===species&&c.direction==='side'),buffer);
 for(const mode of ['sampled','matrix','matrix','sampled']){
  const contacts=new BakedSolidContacts(binding,[new Box3(new Vector3(1,0,-20),new Vector3(1.3,2.5,20))]);if(mode==='sampled')contacts.solidBounds=null;
  const fall=new BakedBeastFall(binding,clip,{surface:()=>0,solidContacts:contacts}),times=[],resolve=contacts.resolve.bind(contacts);
  contacts.resolve=surface=>{const t=performance.now();const out=resolve(surface);times.push(performance.now()-t);return out;};
  for(let frame=1;frame<=180;frame++)fall.apply(frame/60);fall.restore();
  const warm=times.slice(30).sort((a,b)=>a-b);results.push({species,mode,sparseSamples:contacts.samples.length,fullSamples:contacts.solidBounds?.meshes.reduce((n,m)=>n+m.indices.length,0)??0,frames:warm.length,meanMs:warm.reduce((a,b)=>a+b,0)/warm.length,p95Ms:warm[Math.floor(warm.length*.95)],maxMs:warm.at(-1)});
 }
}
console.log(JSON.stringify({scope:'Node CPU microbenchmark of resolve only; no browser, rendering or FPS claim. ABBA order; first 30 frames discarded.',results},null,2));

