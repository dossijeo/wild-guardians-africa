// Offline articulated fallback clips from the same solver and current source rigs.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import R from '@dimforge/rapier3d-compat';
import {beastSkin} from '../../tests/helpers/beast-skin.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {BeastRagdollSolver,RAGDOLL_CONFIG,RAGDOLL_LINKS} from '../../src/simulation/beast-ragdoll.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {ATTACK} from '../../src/simulation/guardian-combat.js';
await R.init();
const output=process.argv[2];if(!output)throw Error('Output directory required');fs.mkdirSync(output,{recursive:true});
const chunks=[],clips=[];let offset=0;
for(const species of Object.keys(ANIMAL_ACTIONS.animals)){
 const model=beastSkin(species),binding=new BeastRagdollBinding(model),pose=binding.capture(),colliders=binding.colliders();
 const source=fs.readFileSync('public'+ANIMAL_ACTIONS.animals[species].url),sourceSha256=createHash('sha256').update(source).digest('hex');
 for(const [directionName,direction] of [['front',{x:0,y:0,z:1}],['side',{x:1,y:0,z:0}],['down',{x:0,y:-.8,z:1}]]){
  const solver=new BeastRagdollSolver(R);solver.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});
  const actor=solver.add(species,{pose,colliders,mass:ATTACK.profiles[species].mass,direction}),frames=[...actor.pose];let quiet=0,ended=false;
  for(let i=1;i<=480;i++){solver.step();quiet=actor.settled?quiet+1:0;if(i%3===0){frames.push(...actor.pose);if(quiet>=18){ended=true;break;}}}
  if(!ended)throw Error('Unsettled fallback '+species+'/'+directionName);
  const values=new Float32Array(frames);if(!values.every(Number.isFinite))throw Error('Invalid baked pose');
  const bytes=Buffer.from(values.buffer);chunks.push(bytes);
  clips.push({species,direction:directionName,sourceSha256,source:ANIMAL_ACTIONS.animals[species].url,byteOffset:offset,floatCount:values.length,frames:values.length/98,sampleRate:20,duration:(values.length/98-1)/20,parents:pose.parents,initialHip:frames.slice(0,3),settled:true});offset+=bytes.length;solver.dispose();
 }
 model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
}
const bytes=Buffer.concat(chunks);fs.writeFileSync(output+'/falls.bin',bytes);fs.writeFileSync(output+'/falls.json',JSON.stringify({version:1,scope:'Offline flat-ground rest-pose falls. Runtime collision adaptation and visual acceptance still required.',frameStride:98,bones:RAGDOLL_LINKS.map(r=>r[0]),config:RAGDOLL_CONFIG,byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),clips},null,2)+'\n');console.log({clips:clips.length,bytes:bytes.length,durations:clips.map(c=>[c.species,c.direction,c.duration])});
