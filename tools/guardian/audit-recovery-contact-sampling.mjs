import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Vector3} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {BeastRecovery} from '../../src/rendering/beast-recovery.js';
import {replaySurfacePose} from '../../tests/browser/guardian-surface-pose.js';

// Compare runtime support samples with every non-tail vertex in the SAME pose.
// Recorded floor heights cannot be used for different poses or trajectories.
const bytes=fs.readFileSync(process.argv[2]);
const json=JSON.parse(bytes[0]===31?gunzipSync(bytes):bytes);
const capture=json.report?.surfaceCapture??json;
const model=await actorGeometry('public'+ANIMAL_ACTIONS.animals[capture.species].url);
new BeastRagdollBinding(model,{species:capture.species});
const full=replaySurfacePose(model,capture),nodes=[];
model.traverse(n=>nodes.push(n));
const floors=new Map(capture.meshes.map(m=>[nodes[m.index],m.floors]));
const point=new Vector3(),samples=BeastRecovery.contactSamples(model);
let minimum=Infinity,witness=null;
for(const {mesh,index} of samples){
 const floor=floors.get(mesh)?.[index];
 if(!Number.isFinite(floor))throw Error('Missing captured floor for support sample');
 mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);
 const gap=point.y-floor;
 if(gap<minimum){minimum=gap;witness={mesh:mesh.name,index};}
}
console.log(JSON.stringify({species:capture.species,recoveryAge:capture.recoveryAge,
 full,sampled:{minimum,witness,count:samples.length},
 missedDepth:minimum-full.minimum,
 replayDifference:full.minimum-capture.minimum,
 scope:'One captured pose only; no inference about earlier penetration or future frames.'},null,2));
if(Math.abs(full.minimum-capture.minimum)>1e-6)process.exitCode=1;
