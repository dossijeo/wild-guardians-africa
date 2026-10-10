// Read-only exact native collision samples. A sampled pocket is not a proof.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
const [input,output]=process.argv.slice(2);
if(!input||!output||existsSync(output))throw Error('Requires retained origin diagnosis and fresh output');
const evidence=JSON.parse(readFileSync(input)),bytes=readFileSync(evidence.input);
const state=deserialize(gunzipSync(bytes).toString()),before=serialize(state);
const profileFile=`public/content/biome-${BIOME_IDS[state.biome]}.json`;
const nav=new Navigation(state.seed,state.biome,JSON.parse(readFileSync(profileFile)).profile);nav.setState(state);
const {point,radius,target}=evidence,step=1/16,halfCells=48,rows=[];
for(let iz=-halfCells;iz<=halfCells;iz++){
 const row=[];
 for(let ix=-halfCells;ix<=halfCells;ix++){
  const x=point.x+ix*step,z=point.z+iz*step;
  row.push(!nav.terrainValid(x,z,radius,false)?0:!nav.walkable(x,z,radius,null,false)?1:2);
 }
 rows.push(row);
}
const origins=[];
for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
 const q={x:Math.round(point.x)+dx,z:Math.round(point.z)+dz};
 origins.push({...q,terrain:nav.terrainValid(q.x,q.z,radius,false),body:nav.walkable(q.x,q.z,radius,null,false),segment:nav.segmentClear(point,q,radius,null,false)});
}
const services=[];
for(let i=0;i<32;i++){
 const angle=Math.atan2(evidence.outside.x-target.x,evidence.outside.z-target.z)+i*Math.PI/16;
 const q={x:target.x+Math.sin(angle)*(.6+radius),z:target.z+Math.cos(angle)*(.6+radius)};
 services.push({...q,terrain:nav.terrainValid(q.x,q.z,radius,false),body:nav.walkable(q.x,q.z,radius,null,false)});
}
assert.equal(serialize(state),before,'Mapping must preserve native state, RNG and ledger');
const files=['tools/map-native-service-pocket.mjs','src/world/navigation.js',profileFile];
const result={input,inputSha256:createHash('sha256').update(readFileSync(input)).digest('hex'),snapshot:evidence.input,snapshotSha256:createHash('sha256').update(bytes).digest('hex'),sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),point,radius,target,step,halfCells,rows,origins,services,legend:{0:'native terrain-invalid for this hostile body radius',1:'terrain-valid but native solid/prop collision',2:'native body-valid'},scope:'Natural world without proposed walls. Exact native samples on a 6m square with 1/16m spacing. Visualization and diagnosis only; sampling does not establish continuous isolation, route reachability or perimeter acceptance.'};
writeFileSync(output,JSON.stringify(result)+'\n');
console.log(JSON.stringify({cells:rows.length*rows[0].length,origins,scope:result.scope}));
