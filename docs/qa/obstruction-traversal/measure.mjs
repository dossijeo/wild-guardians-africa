import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {obstructionRecord} from '../../../src/rendering/obstruction-source.js';
import {packLodCoverage} from '../../../src/rendering/asset-lod.js';
const root=process.cwd(),dir=path.join(root,'.cache/obstruction-traversal');
await fs.mkdir(dir,{recursive:true});
const source=gunzipSync(await fs.readFile(new URL('./baseline-source.js.gz',import.meta.url))).toString('utf8');
const old="   const fades=[...batches.map(b=>b.fade),...group.children.filter(m=>!m.userData?.nativeLodBatch).map(m=>m.geometry?.userData.obstruction)];\n   for(const fade of fades){";
const replacement="   // Visit logical LOD populations once, then legacy meshes in their original order.\n   // Coverage packing changes attributes only; it never changes these inventories.\n   for(let source=0;source<2;source++){\n    const entries=source?group.children:batches;\n    for(let index=0;index<entries.length;index++){\n     const entry=entries[index];\n     const fade=source?(entry.userData?.nativeLodBatch?null:entry.geometry?.userData.obstruction):entry.fade;";
const normalized=source.replaceAll('\r\n','\n');
assert.ok(normalized.includes(old));
const candidate=normalized.replace(old,replacement).replace('   }\n  }\n  return stats;','    }\n   }\n  }\n  return stats;');
function imports(text){return text.replace(/from '(\.\.?\/[^']+)'/g,(_,relative)=>`from '${pathToFileURL(path.resolve(root,'src/rendering',relative)).href}'`);}
await fs.writeFile(path.join(dir,'baseline.mjs'),imports(normalized));
await fs.writeFile(path.join(dir,'candidate.mjs'),imports(candidate));
await fs.writeFile(path.join(dir,'candidate-source.js'),candidate);
const baseline=(await import(pathToFileURL(path.join(dir,'baseline.mjs')))).updateObstructions;
const proposed=(await import(pathToFileURL(path.join(dir,'candidate.mjs')))).updateObstructions;
function fixture(groups){
 const chunks=new Map(),fades=[],batches=[];
 for(let c=0;c<groups;c++){
  const group=new THREE.Group();group.userData.lodBatches=[];
  const makeFade=(slot)=>{const instances=Array.from({length:32},(_,i)=>({x:(i%8)*3-10+c%7,z:Math.floor(i/8)*5-10+Math.floor(c/7),y:0,sx:1,sy:1,sz:1,yaw:i*.21}));const fade={records:instances.map(p=>obstructionRecord(p,{min:[-2,0,-2],max:[2,10,2]})),attribute:new THREE.InstancedBufferAttribute(new Float32Array(32).fill(1),1),fresh:true};fades.push(fade);return fade;};
  for(let b=0;b<3;b++){
   const fade=makeFade(b),batch={fade,meshes:[],orders:[],packs:0};
   for(let l=0;l<3;l++){const geometry=new THREE.BufferGeometry();geometry.userData.obstruction={attribute:new THREE.InstancedBufferAttribute(new Float32Array(32).fill(1),1)};const mesh=new THREE.Mesh(geometry);mesh.userData.nativeLodBatch=batch;group.add(mesh);batch.meshes.push(mesh);batch.orders.push(Array.from({length:32},(_,i)=>31-i));}
   batch.packCoverage=()=>{batch.packs++;packLodCoverage(batch);};group.userData.lodBatches.push(batch);batches.push(batch);
  }
  group.userData.lodBatches.push({fade:null});
  for(let l=0;l<2;l++){const mesh=new THREE.Mesh(new THREE.BufferGeometry());mesh.geometry.userData.obstruction=makeFade(l);group.add(mesh);}
  group.add(new THREE.Object3D());chunks.set(String(c),group);
 }
 const camera=new THREE.PerspectiveCamera(60,1.5);camera.position.set(0,8,4);
 return {chunks,fades,batches,camera,target:new THREE.Vector3(0,5,-10)};
}
function step(update,f,i,mode){if(mode==='moving')f.camera.position.x=Math.sin(i*.07)*5;return update(f.chunks,f.camera,f.target,.016,{enabled:i%251!==250});}
const checks=[];
for(const groups of [25,49]){
 const a=fixture(groups),b=fixture(groups);
 for(let i=0;i<800;i++){
  if(i===300){a.chunks.delete('0');b.chunks.delete('0');}
  if(i===400){for(const f of [a,b]){f.fades[5].records=f.fades[5].records.map(r=>({...r,x:100}));f.fades[5].fresh=true;}}
  assert.deepEqual(step(baseline,a,i,'moving'),step(proposed,b,i,'moving'));
  for(let n=0;n<a.fades.length;n++){assert.deepEqual(a.fades[n].attribute.array,b.fades[n].attribute.array);assert.equal(a.fades[n].attribute.version,b.fades[n].attribute.version);}
  for(let n=0;n<a.batches.length;n++){assert.equal(a.batches[n].packs,b.batches[n].packs);for(let l=0;l<3;l++){assert.deepEqual(a.batches[n].meshes[l].geometry.userData.obstruction.attribute.array,b.batches[n].meshes[l].geometry.userData.obstruction.attribute.array);assert.equal(a.batches[n].meshes[l].geometry.userData.obstruction.attribute.version,b.batches[n].meshes[l].geometry.userData.obstruction.attribute.version);}}
 }
 checks.push({groups,frames:800,exact:true});
}
const quantile=(a,q)=>a.toSorted((a,b)=>a-b)[Math.floor((a.length-1)*q)];
const measurements=[];
for(const groups of [25,49])for(const mode of ['settled','moving']){
 const a=fixture(groups),b=fixture(groups);for(let i=0;i<200;i++){step(baseline,a,i,mode);step(proposed,b,i,mode);}
 const lots=[];
 for(let lot=0;lot<8;lot++){
  const samples={baseline:[],candidate:[]};const order=lot%2?['candidate','baseline','baseline','candidate']:['baseline','candidate','candidate','baseline'];
  for(const name of order){const update=name==='baseline'?baseline:proposed,f=name==='baseline'?a:b;for(let i=0;i<400;i++){const start=performance.now();step(update,f,i,mode);samples[name].push(performance.now()-start);}}
  lots.push(Object.fromEntries(Object.entries(samples).map(([name,v])=>[name,{medianMs:quantile(v,.5),p95Ms:quantile(v,.95)}])));
 }
 measurements.push({groups,mode,lots,medianMs:Object.fromEntries(['baseline','candidate'].map(name=>[name,quantile(lots.map(l=>l[name].medianMs),.5)])),p95Ms:Object.fromEntries(['baseline','candidate'].map(name=>[name,quantile(lots.map(l=>l[name].p95Ms),.5)]))});
}
const hash=t=>createHash('sha256').update(t).digest('hex');
const report={node:process.version,createdAt:new Date().toISOString(),baselineHash:hash(normalized),candidateHash:hash(candidate),checks,measurements,limits:'CPU benchmark with native Three.js attributes and real packLodCoverage; no browser GPU, FPS, heap or visual claim. Long campaign processes run concurrently.'};
await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
