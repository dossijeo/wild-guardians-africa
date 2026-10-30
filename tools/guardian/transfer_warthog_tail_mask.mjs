import fs from 'node:fs';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {ACTOR_CONTACT_MASKS} from '../../src/rendering/actor-contact-masks.js';
import {createHash} from 'node:crypto';
const oldHash='6d41a31b6bc7ac4163f8e484f001c7a4b7debac0fc6c93fefd3ff4a9a9fec275';
const old=await actorGeometry('public/assets/'+oldHash+'.glb'),current=await actorGeometry('public'+ANIMAL_ACTIONS.animals.warthog.url);
const source=old.getObjectByName('Mesh_0_1'),p=source.geometry.attributes.position;
const mask=Object.values(ACTOR_CONTACT_MASKS).find(m=>m.sourceSha256===oldHash);
const key=(p,i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
const points=mask.indices.map(i=>[p.getX(i),p.getY(i),p.getZ(i),key(p,i)]);
const selected=new Set(mask.indices.map(i=>key(p,i))),matched=new Set(),result={...ACTOR_CONTACT_MASKS};let count=0;
current.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const q=mesh.geometry.attributes.position,indices=[];let hash=2166136261;
 for(let i=0;i<q.count;i++){for(let k=0;k<3;k++)hash=Math.imul(hash^Math.round(q.getComponent(i,k)*1e5),16777619);const k=key(q,i);const near=selected.has(k)?k:points.find(v=>Math.hypot(v[0]-q.getX(i),v[1]-q.getY(i),v[2]-q.getZ(i))<2e-6)?.[3];if(near){indices.push(i);matched.add(near);}}
 if(indices.length){count+=indices.length;result[q.count+':'+(hash>>>0)]={species:'warthog',mesh:mesh.name,sourceSha256:createHash('sha256').update(fs.readFileSync('public'+ANIMAL_ACTIONS.animals.warthog.url)).digest('hex'),indices};}
});
if(matched.size!==selected.size)throw Error('Missing reviewed tail positions '+matched.size+'/'+selected.size);
fs.writeFileSync('src/rendering/actor-contact-masks.js','// Reviewed tail selections; current warthog transferred by source positions within 2 micrometres.\nexport const ACTOR_CONTACT_MASKS='+JSON.stringify(result)+';\n');
console.log({originalVertices:mask.indices.length,uniquePositions:selected.size,matched:matched.size,currentVertices:count});
