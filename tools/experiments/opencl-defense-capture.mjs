// Read-only QA capture. No production import or gameplay mutation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import * as Game from '../../src/simulation/game.js';
import {nativePerimeterProof} from '../native-perimeter-proof.mjs';

const [directory,output,mode='capture',gpuResultsPath]=process.argv.slice(2);
assert(directory&&output&&['baseline','capture','replay'].includes(mode));
const snapshot=readFileSync(`${directory}/partial-state.json.gz`),state=deserialize(gunzipSync(snapshot).toString('utf8'));
const before=serialize(state),partial=JSON.parse(readFileSync(`${directory}/partial.json`));
const candidate=partial.receipts.defense.planned;
const biomeProfile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile;
const nav=new Navigation(state.seed,state.biome,biomeProfile);nav.setState(state);
const plan=Game.quoteWallChain(state,partial.receipts.defense.material,candidate.points,nav,{smooth:false,snap:false});
assert.equal(serialize(state),before,'Navigation changed the real snapshot');
const key=(x,z,radius,worker,allowFluid)=>JSON.stringify([x,z,radius,worker,allowFluid]);
const samples=new Map(),limit=Number(process.env.OPENCL_QA_SAMPLE_LIMIT??4096),stats={terrainCalls:0,captured:0,replayed:0,fallbacks:0,gpuRejected:0};
assert(Number.isSafeInteger(limit)&&limit>0&&limit<=65536);
const gpu=mode==='replay'?new Map(JSON.parse(readFileSync(gpuResultsPath,'utf8')).map(v=>[v.key,v])):null;
const originalView=nav.forBuildingPlacement.bind(nav);
if(mode!=='baseline')nav.forBuildingPlacement=(...args)=>{
 const view=originalView(...args),original=view.terrainValid;
 view.terrainValid=function(x,z,radius=.3,worker=false,allowFluid=false){
  stats.terrainCalls++;
  const id=key(x,z,radius,worker,allowFluid),known=gpu?.get(id);
  if(known&&known.accepted){stats.replayed++;return known.value;}
  stats.fallbacks++;
  const result=original.call(this,x,z,radius,worker,allowFluid);
  if(mode==='capture'&&samples.size<limit&&!samples.has(id)&&[x,z,radius].every(Number.isFinite))samples.set(id,{key:id,x,z,radius,worker,allowFluid,nativeResult:result});
  else if(known&&!known.accepted)stats.gpuRejected++;
  return result;
 };
 return view;
};
const started=performance.now();
const proof=nativePerimeterProof(state,nav,plan,candidate.bounds,{outline:candidate.shoreRouted?candidate.points:null});
const elapsedMs=performance.now()-started;
assert.equal(serialize(state),before,'Proof changed the real snapshot');
let preparationMs=0;
if(mode==='capture'){
 const prepStarted=performance.now();
 const field=nav.field;
 for(const sample of samples.values()){
  const heights=[];let cpuSlopeValid=true;
  for(let i=0;i<5;i++){
   const dx=i===1?sample.radius:i===2?-sample.radius:0,dz=i===3?sample.radius:i===4?-sample.radius:0;
   const px=sample.x+dx,pz=sample.z+dz;
   const a=Math.max(field.surface(px+.8,pz),field.riverLevel),b=Math.max(field.surface(px-.8,pz),field.riverLevel);
   const c=Math.max(field.surface(px,pz+.8),field.riverLevel),d=Math.max(field.surface(px,pz-.8),field.riverLevel);
   heights.push(a,b,c,d);
   if(Math.hypot(a-b,c-d)/1.6>.5)cpuSlopeValid=false;
  }
  sample.heights=heights;sample.cpuSlopeValid=cpuSlopeValid;
 }
 stats.captured=samples.size;
 preparationMs=performance.now()-prepStarted;
}
const sha=v=>createHash('sha256').update(v).digest('hex');
const report={branchBase:'7fd47aad',snapshotSha256:sha(snapshot),stateSha256:sha(before),proofSha256:sha(JSON.stringify(proof)),mode,elapsedMs,preparationMs,stats,proof,
 scope:'Read-only hypothetical native defensive proof, not a real paid wall or campaign outcome. GPU data is rejected on mismatch and all uncaptured native queries use CPU.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
if(mode==='capture')writeFileSync(`${output}.workload.json.gz`,gzipSync(JSON.stringify([...samples.values()])));
console.log(JSON.stringify({elapsedMs,preparationMs,stats,proofSha256:report.proofSha256,valid:proof.valid,reason:proof.reason}));
