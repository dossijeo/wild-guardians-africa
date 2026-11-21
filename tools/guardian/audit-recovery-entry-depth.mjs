import fs from 'node:fs';
import {AnimationClip,Vector3} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {BeastRecovery} from '../../src/rendering/beast-recovery.js';
import {AuthoredBeastRecovery} from '../../src/rendering/authored-beast-recovery.js';
const model=await actorGeometry('public'+ANIMAL_ACTIONS.animals.rhino.url),binding=new BeastRagdollBinding(model,{species:'rhino'});
binding.capture();const snapshot=binding.physicalSnapshot(new Float32Array(98)),samples=BeastRecovery.contactSamples(model),p=new Vector3();
const minimum=()=>{let v=Infinity;for(const {mesh,index}of samples){mesh.getVertexPosition(index,p).applyMatrix4(mesh.matrixWorld);v=Math.min(v,p.y);}return v;};
const originalMinimum=minimum(),clip=AnimationClip.parse(JSON.parse(fs.readFileSync('content/source/animations/stand-up/rhino-candidate.json')).clip),rows=[];
for(const depth of [.02,.05,.1,.2])for(const dt of [1/120,1/60,1/30,.1]){
 const floor=originalMinimum+depth,recovery=new AuthoredBeastRecovery(binding,snapshot,{clip,surface:()=>floor});recovery.apply(0);
 let previous=minimum()-floor,maxSupportSpeed=0,maxSupportStep=0,settledAt=null;
 for(let age=0;age<.65-1e-8;){const step=Math.min(dt,.65-age);recovery.apply(step);age+=step;const value=minimum()-floor;maxSupportStep=Math.max(maxSupportStep,Math.abs(value-previous));maxSupportSpeed=Math.max(maxSupportSpeed,Math.abs(value-previous)/step);if(value>=.0099&&settledAt===null)settledAt=age;previous=value;}
 rows.push({depth,dt,maxSupportSpeed,maxSupportStep,settledAt,finalClearance:previous});recovery.restore();
}
console.log(JSON.stringify({scope:'Synthetic rhino standing snapshot with raised planar floor. Support-envelope motion only; not anatomical hip speed or a native fall.',rows},null,2));
