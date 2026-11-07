import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash,webcrypto} from 'node:crypto';import {Box3,Group,Mesh,BufferGeometry,Matrix4,Vector3} from 'three';
import {authoredCenterTemplate} from '../tools/experiments/authored-center-template.mjs';import {loadAuthoredCenterTemplates} from '../src/simulation/authored-center-templates.js';import {createWorkerStructureObjects} from '../src/simulation/worker-structure-geometry.js';
const manifest=JSON.parse(await readFile('public/content/worker-center-templates.json','utf8')),catalog=JSON.parse(await readFile('public/content/destruction.json','utf8')),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('authored physical bounds remain byte-exact with production building geometry and source hashes',async()=>{
 for(const [path,hash] of Object.entries(manifest.sources))assert.equal(sha(await readFile(path)),hash,`Regenerate templates after changing ${path}`);
 for(const descriptor of catalog.buildings){const record=manifest.templates[descriptor.culture];assert.equal(record.modelSha256,sha(await readFile('public'+descriptor.url)));const {runtimeUrl,runtimeSha256,...sourceRecord}=record;assert.deepEqual(await authoredCenterTemplate(descriptor),sourceRecord,descriptor.culture);assert.equal(sha(await readFile('public/'+runtimeUrl)),runtimeSha256);assert.deepEqual((await authoredCenterTemplate(descriptor,{assetPath:'public/'+runtimeUrl})).template,record.template,descriptor.culture+' runtime');
  const center={id:'c',kind:'center',status:'intact',culture:descriptor.culture,x:12,z:-4},state={structures:[center]},nav={field:{surface:()=>2}},worker=createWorkerStructureObjects(state,nav,{[descriptor.culture]:record.template});
  try{for(const yaw of [0,.31,Math.PI/2,Math.PI]){center.yaw=yaw;worker.sync(center);const actual=new Box3().setFromObject(worker.objects.get('c')),expected=new Box3();for(const part of record.template.parts){const box=new Box3(new Vector3().fromArray(part.min),new Vector3().fromArray(part.max)),root=new Group();root.position.set(center.x,2.025,center.z);root.rotation.y=yaw;root.scale.fromArray(record.template.scale);root.updateMatrixWorld();box.applyMatrix4(root.matrixWorld.clone().multiply(new Matrix4().fromArray(part.matrix)));expected.union(box);}assert.ok(actual.min.distanceTo(expected.min)<1e-10);assert.ok(actual.max.distanceTo(expected.max)<1e-10);worker.objects.clear();}}
  finally{worker.dispose();}
 }
});
test('authored template loader accepts matching descriptors and rejects stale or malformed data',async()=>{
 const state={culture:'suajili',villages:[{culture:'suajili'}],structures:[]},load=(m,c)=>loadAuthoredCenterTemplates(state,{subtle:webcrypto.subtle,fetcher:async url=>({ok:true,json:async()=>url.includes('worker-center-templates')?m:c})});
 const result=await load(manifest,catalog);assert.deepEqual(result.suajili,manifest.templates.suajili.template);
 const stale=structuredClone(catalog);stale.buildings.find(item=>item.culture==='suajili').seed++;await assert.rejects(load(manifest,stale),/Stale/);
 const staleRuntime=structuredClone(manifest);staleRuntime.templates.suajili.runtimeSha256='0'.repeat(64);await assert.rejects(load(staleRuntime,catalog),/Stale/);
 const invalid=structuredClone(manifest);invalid.templates.suajili.template.parts[0].min[0]=null;await assert.rejects(load(invalid,catalog),/Invalid/);
});
