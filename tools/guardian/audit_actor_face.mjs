import fs from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {AnimationMixer,LoopOnce,Vector3,Quaternion,Matrix4} from 'three';
function geometryOnly(bytes){
 const n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n));
 for(const m of g.materials??[]){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;delete m.extensions;}
 const json=Buffer.from(JSON.stringify(g)),size=Math.ceil(json.length/4)*4,bin=bytes.subarray(20+n),out=Buffer.alloc(20+size+bin.length,32);bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(size,12);json.copy(out,20);bin.copy(out,20+size);return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);
}
const [source,edited,output]=process.argv.slice(2);if(!source||!edited||!output)throw Error('source.glb edited.glb report.json');
await MeshoptDecoder.ready;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),a=await loader.parseAsync(geometryOnly(fs.readFileSync(source)),''),b=await loader.parseAsync(geometryOnly(fs.readFileSync(edited)),''),am=new AnimationMixer(a.scene),bm=new AnimationMixer(b.scene),bones=[];
a.scene.traverse(o=>{if(o.isBone){const copy=b.scene.getObjectByName(o.name);if(!copy?.isBone)throw Error('Missing bone '+o.name);bones.push([o,copy]);}});
const report={source,edited,bones:bones.length,samples:0,maxPosition:0,maxAngle:0,clips:[]},ap=new Vector3(),bp=new Vector3(),aq=new Quaternion(),bq=new Quaternion();
// Preserve the active model's lower-body geometry and named bone weights.
// This catches regressions to the separately repaired feet when editing a face.
if(process.argv.includes('--hyena-body')){
 const grid=new Map(),cell=1e-4;let checked=0,maxPosition=0,maxWeight=0;
 const visit=(root,fn)=>{root.updateMatrixWorld(true);root.traverse(mesh=>{if(!mesh.isSkinnedMesh||!mesh.name.startsWith('Mesh_0'))return;mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld);if(p.y>=1.1)continue;const weights={};for(let k=0;k<4;k++){const w=mesh.geometry.attributes.skinWeight.getComponent(i,k),name=mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(i,k)].name;weights[name]=(weights[name]??0)+w;}if((weights.Neck??0)>.999999)continue;fn(p,weights);}});};
 visit(a.scene,(p,weights)=>{const key=[p.x,p.y,p.z].map(v=>Math.floor(v/cell)).join(',');if(!grid.has(key))grid.set(key,[]);grid.get(key).push({p,weights});});
 visit(b.scene,(p,weights)=>{const xyz=[p.x,p.y,p.z].map(v=>Math.floor(v/cell));let match=null,distance=Infinity;for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const item of grid.get([xyz[0]+x,xyz[1]+y,xyz[2]+z].join(','))??[]){const d=p.distanceTo(item.p);if(d<distance){match=item;distance=d;}}assert.ok(match&&distance<1e-5,'Lower-body geometry changed '+p.toArray());maxPosition=Math.max(maxPosition,distance);for(const name of new Set([...Object.keys(weights),...Object.keys(match.weights)]))maxWeight=Math.max(maxWeight,Math.abs((weights[name]??0)-(match.weights[name]??0)));checked++;});
 assert.ok(checked>1000);assert.ok(maxWeight<1e-4,'Lower-body weights changed '+maxWeight);report.lowerBody={vertices:checked,maxPosition,maxWeight,scope:'World Y below 1.1m excluding intentionally restored rigid Neck collar components; source skin positions and named weights'};
}
// Hyena-specific regression gate: lower and upper muzzle must stay together
// under native head motion. Bone-track parity alone cannot detect bad skinning.
const muzzle=[];const lionMuzzle=process.argv.includes('--lion-muzzle'),checkMuzzle=process.argv.includes('--hyena-muzzle')||lionMuzzle;
if(checkMuzzle){
 b.scene.updateMatrixWorld(true);const head=b.scene.getObjectByName('Head');assert.ok(head);
 const inverse=new Matrix4().copy(head.matrixWorld).invert();
 b.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh||!mesh.name.startsWith('Mesh_0'))return;mesh.skeleton.update();
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){
   const point=mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld);
   if(lionMuzzle?(Math.abs(point.x)<.04&&point.y>1.49&&point.y<1.60&&point.z>.18):(Math.abs(point.x)<.11&&point.y>1.3&&point.y<1.55&&point.z>.65))muzzle.push({mesh,index:i,rest:point.toArray(),local:point.applyMatrix4(inverse)});
  }
 });assert.ok(muzzle.length>30,'Muzzle selection changed; re-inspect coordinate calibration');
 report.muzzle={vertices:muzzle.length,maxHeadRelativeError:0,scope:'neutral core muzzle skin through all native clips'};
}
for(const clip of a.animations){
 const other=b.animations.find(c=>c.name===clip.name);if(!other)throw Error('Missing clip '+clip.name);if(Math.abs(clip.duration-other.duration)>1e-6)throw Error('Duration changed');
 am.stopAllAction();bm.stopAllAction();const aa=am.clipAction(clip).reset().setLoop(LoopOnce,1),ba=bm.clipAction(other).reset().setLoop(LoopOnce,1);aa.clampWhenFinished=ba.clampWhenFinished=true;aa.play();ba.play();
 for(let i=0;i<=40;i++){const time=clip.duration*i/40;am.setTime(time);bm.setTime(time);a.scene.updateMatrixWorld(true);b.scene.updateMatrixWorld(true);for(const [x,y] of bones){const positionError=x.getWorldPosition(ap).distanceTo(y.getWorldPosition(bp)),angleError=x.getWorldQuaternion(aq).normalize().angleTo(y.getWorldQuaternion(bq).normalize());if(positionError>report.maxPosition){report.maxPosition=positionError;report.worstPosition={bone:x.name,clip:clip.name,time,source:ap.toArray(),edited:bp.toArray()};}if(angleError>report.maxAngle){report.maxAngle=angleError;report.worstAngle={bone:x.name,clip:clip.name,time};}}if(checkMuzzle){const head=b.scene.getObjectByName('Head');for(const item of muzzle){item.mesh.skeleton.update();const actual=item.mesh.getVertexPosition(item.index,new Vector3()).applyMatrix4(item.mesh.matrixWorld),expected=item.local.clone().applyMatrix4(head.matrixWorld);const error=actual.distanceTo(expected);if(error>report.muzzle.maxHeadRelativeError){report.muzzle.maxHeadRelativeError=error;report.muzzle.worst={mesh:item.mesh.name,index:item.index,rest:item.rest,weights:[0,1,2,3].map(k=>[item.mesh.skeleton.bones[item.mesh.geometry.attributes.skinIndex.getComponent(item.index,k)].name,item.mesh.geometry.attributes.skinWeight.getComponent(item.index,k)]),clip:clip.name,time,expected:expected.toArray(),actual:actual.toArray()};}}}report.samples++;}
 report.clips.push(clip.name);
}
if(checkMuzzle)report.muzzle.pass=report.muzzle.maxHeadRelativeError<1e-5;
if(process.argv.includes('--exact-geometry')){
 const meshes=root=>{const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;};
 const sourceMeshes=meshes(a.scene),editedMeshes=meshes(b.scene);
 assert.equal(editedMeshes.length,sourceMeshes.length);
 let attributes=0;
 const compare=(x,y)=>{assert.equal(y.itemSize,x.itemSize);assert.equal(y.normalized,x.normalized);assert.deepEqual(y.array,x.array);attributes++;};
 for(let i=0;i<sourceMeshes.length;i++){
  const x=sourceMeshes[i],y=editedMeshes[i];assert.equal(y.name,x.name);
  assert.deepEqual(y.morphTargetDictionary,x.morphTargetDictionary);
  assert.deepEqual(Object.keys(y.geometry.attributes),Object.keys(x.geometry.attributes));
  for(const key of Object.keys(x.geometry.attributes))compare(x.geometry.attributes[key],y.geometry.attributes[key]);
  if(x.geometry.index)compare(x.geometry.index,y.geometry.index);else assert.equal(y.geometry.index,null);
  assert.deepEqual(Object.keys(y.geometry.morphAttributes),Object.keys(x.geometry.morphAttributes));
  for(const key of Object.keys(x.geometry.morphAttributes)){
   assert.equal(y.geometry.morphAttributes[key].length,x.geometry.morphAttributes[key].length);
   x.geometry.morphAttributes[key].forEach((value,j)=>compare(value,y.geometry.morphAttributes[key][j]));
  }
 }
 report.exactGeometry={meshes:sourceMeshes.length,attributes,pass:true};
}
report.pass=report.maxPosition<.001&&report.maxAngle<.002&&(!checkMuzzle||report.muzzle.pass);fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(report);if(!report.pass)process.exitCode=1;
