import * as THREE from 'three';
import {writeFile} from 'node:fs/promises';
import {TerrainField} from '../../src/world/terrain.js';
import {BlenderGroundDetails,markGroundDetailEvent} from '../../src/rendering/blender-ground-details.js';

const scene=new THREE.Scene(),field=new TerrainField({seed:'712',biome:'savanna',river:true,relief:1});
const details=new BlenderGroundDetails({},scene,'savanna');
details.global=true;details.geometry=new THREE.BoxGeometry();details.material=new THREE.MeshBasicMaterial();
details.mesh=new THREE.InstancedMesh(details.geometry,details.material,1);scene.add(details.mesh);
const state={plants:[],structures:[],villages:[]};
for(let cx=-2;cx<=2;cx++)for(let cz=-2;cz<=2;cz++)details.chunk(cx,cz,field,state);
const resident=details.chunks.size,instances=details.count;
const sites=details.chunks.get('0,0').filter(p=>Math.abs(p.x)<15&&Math.abs(p.z)<15).slice(0,14);
if(sites.length<14)throw Error('Benchmark seed did not provide 14 nearby detail sites');
const walls=sites.map((site,index)=>({id:`benchmark-wall-${index}`,kind:'wall',status:'intact',x:site.x,z:site.z}));
const samples=[];
for(let iteration=0;iteration<34;iteration++){
  state.structures=walls;
  markGroundDetailEvent(details,state,{type:'WallChainBuilt',targetId:walls[0].id,count:walls.length});
  const buildMs=details.flush(field,state);
  state.structures=[];
  for(const wall of walls)markGroundDetailEvent(details,state,{type:'WallRemoved',targetId:wall.id},()=>wall);
  const removeMs=details.flush(field,state);
  if(iteration>=4)samples.push({buildMs,removeMs});
}
const sorted=(key)=>samples.map(sample=>sample[key]).sort((a,b)=>a-b);
const statistic=key=>{const values=sorted(key);return {medianMs:values[Math.floor(values.length/2)],p95Ms:values[Math.floor(values.length*.95)],minMs:values[0],maxMs:values.at(-1)};};
const report={scenario:'25 resident 48 m chunks, 14 synthetic wall positions inside one local chunk, build/demolish alternating; renderer-only CPU benchmark',seed:'712',residentChunks:resident,initialInstances:instances,samples:samples.length,build:statistic('buildMs'),remove:statistic('removeMs'),resampledChunks:details.refreshStats.chunks,resampledCandidates:details.refreshStats.candidates,possibleFullResamples:details.refreshStats.batches*resident,idleFlushMs:details.flush(field,state),instanceBufferBytes:details.mesh.instanceMatrix.array.byteLength};
await writeFile('docs/qa/global-visual-lab/ground-detail-event-benchmark.json',JSON.stringify(report,null,2)+'\n');
console.log(report);
details.dispose();details.geometry.dispose();details.material.dispose();
