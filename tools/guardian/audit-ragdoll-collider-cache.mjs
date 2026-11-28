import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {replaySurfacePose} from '../../tests/browser/guardian-surface-pose.js';
const capture=JSON.parse(gunzipSync(fs.readFileSync('tests/fixtures/rhino-recovery-negative-surface-pose.json.gz')));
const model=await actorGeometry('public'+ANIMAL_ACTIONS.animals.rhino.url);
const binding=new BeastRagdollBinding(model,{species:'rhino'});
binding.capture();binding.colliders();
replaySurfacePose(model,capture);binding.capture();
const cached=binding.colliders();
const costs=[];
for(let i=0;i<12;i++){const start=performance.now();binding.colliders({refit:true});costs.push(performance.now()-start);}
model.traverse(n=>{if(n.isSkinnedMesh)n.geometry=n.geometry.clone();});
const fresh=binding.colliders();
const rows=fresh.map((f,i)=>{
 const c=cached[i];if(!f||!c)return {part:binding.entries[i].bone.name,available:false};
 let maximumLoss=0;
 for(let k=0;k<96;k++){
  const y=1-2*(k+.5)/96,r=Math.sqrt(1-y*y),theta=k*2.399963229728653,x=Math.cos(theta)*r,z=Math.sin(theta)*r;
  const support=h=>{let max=-Infinity;for(let j=0;j<h.length;j+=3)max=Math.max(max,h[j]*x+h[j+1]*y+h[j+2]*z);return max;};
  maximumLoss=Math.max(maximumLoss,support(f.hull)-support(c.hull));
 }
 return {part:binding.entries[i].bone.name,cachedSamples:c.samples,freshSamples:f.samples,maximumSupportLoss:maximumLoss};
});
console.log(JSON.stringify({scope:'Standing-pose cache reused at captured recovery pose versus full refit; not the original live collider snapshot.',refitMilliseconds:costs,rows},null,2));
