import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {AnimationMixer,Group,Vector3,LoopOnce,Frustum,Matrix4,PerspectiveCamera} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {geometryOnly} from './calibrate_footsteps.mjs';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {prepareSkinEnvelope,updateSkinEnvelopeSphere} from '../src/rendering/skin-envelope.js';

const output=process.argv[2];if(!output)throw Error('Usage: node tools/check_skin_envelopes.mjs OUTPUT.json');
const manifest=JSON.parse(readFileSync('content/manifests/web-assets.json'));
const hash=b=>createHash('sha256').update(b).digest('hex'),records=[],p=new Vector3();
for(const [species,library] of Object.entries(ANIMAL_ACTIONS.animals)){
 const record=manifest.records.find(r=>'/'+r.source===library.url);assert.ok(record);
 const bytes=readFileSync('public/'+record.runtime);assert.equal(hash(bytes),record.runtimeSha256);
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(geometryOnly(bytes),'');
 const root=new Group();root.position.set(4800,5,-7200);root.rotation.set(.1,.7,-.08);root.scale.set(1.2,.85,1.1);root.add(gltf.scene);
 const meshes=[];gltf.scene.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});assert.ok(meshes.length);
 const envelopes=meshes.map(m=>prepareSkinEnvelope(m));assert.ok(envelopes.every(Boolean));
 const mixer=new AnimationMixer(gltf.scene);let poses=0,verticesChecked=0,maxRadiusRatio=0,maxBroadRadiusRatio=0,maxExcess=-Infinity;
 const culling={scope:'Analytical camera sweeps, not rendered draw counts or GPU timings',queries:0,referenceVisible:0,broadVisible:0,groupedVisible:0,broadExtra:0,groupedExtra:0};
 const camera=new PerspectiveCamera(50,16/9,.1,100),frustum=new Frustum(),projection=new Matrix4();
 for(const clip of gltf.animations){
  mixer.stopAllAction();const action=mixer.clipAction(clip);action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.reset().play();
  for(let sample=0;sample<=8;sample++){
   mixer.setTime(clip.duration*sample/8);root.updateMatrixWorld(true);poses++;
   meshes.forEach((m,i)=>{
    m.computeBoundingSphere();const nativeRadius=m.boundingSphere.radius,reference=m.boundingSphere.clone().applyMatrix4(m.matrixWorld);
    assert.ok(updateSkinEnvelopeSphere(m,envelopes[i],{grouped:false}));maxBroadRadiusRatio=Math.max(maxBroadRadiusRatio,m.boundingSphere.radius/nativeRadius);
    const broad=m.boundingSphere.clone().applyMatrix4(m.matrixWorld);
    assert.ok(updateSkinEnvelopeSphere(m,envelopes[i]));maxRadiusRatio=Math.max(maxRadiusRatio,m.boundingSphere.radius/nativeRadius);
    const grouped=m.boundingSphere.clone().applyMatrix4(m.matrixWorld);
    for(let offset=-32;offset<=32;offset++){
     camera.position.copy(reference.center).add(new Vector3(0,2,20));camera.lookAt(reference.center.x+offset*.8,reference.center.y,reference.center.z);camera.updateMatrixWorld(true);
     frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
     const a=frustum.intersectsSphere(reference),b=frustum.intersectsSphere(broad),c=frustum.intersectsSphere(grouped);
     culling.queries++;culling.referenceVisible+=Number(a);culling.broadVisible+=Number(b);culling.groupedVisible+=Number(c);culling.broadExtra+=Number(b&&!a);culling.groupedExtra+=Number(c&&!a);
    }
    for(let vertex=0;vertex<m.geometry.attributes.position.count;vertex++){
     m.getVertexPosition(vertex,p);const excess=p.distanceTo(m.boundingSphere.center)-m.boundingSphere.radius;
     maxExcess=Math.max(maxExcess,excess);assert.ok(excess<=0,`${species}/${clip.name}/${sample}/${vertex}: excluded vertex`);verticesChecked++;
    }
   });
  }
 }
 const timings={native:[],broad:[],envelope:[]};
 for(let pair=0;pair<25;pair++)for(const mode of pair%2?['envelope','broad','native']:['native','broad','envelope']){
  const start=performance.now();meshes.forEach((m,i)=>mode==='native'?m.computeBoundingSphere():assert.ok(updateSkinEnvelopeSphere(m,envelopes[i],{grouped:mode!=='broad'})));
  if(pair>=5)timings[mode].push(performance.now()-start);
 }
 const summary=values=>{const a=[...values].sort((a,b)=>a-b);return {median:a[Math.floor(a.length/2)],p95:a[Math.floor(a.length*.95)],samples:values};};
 const row={species,runtime:record.runtime,sha256:hash(bytes),clips:gltf.animations.length,poses,verticesChecked,maxExcess,maxRadiusRatio,maxBroadRadiusRatio,culling,bones:envelopes.reduce((n,e)=>n+e.boxes.length,0),groups:envelopes.reduce((n,e)=>n+e.groups.length,0),terms:envelopes.reduce((n,e)=>n+e.groups.reduce((t,g)=>t+g.length,0),0),timings:Object.fromEntries(Object.entries(timings).map(([k,v])=>[k,summary(v)]))};records.push(row);
 console.log(JSON.stringify({...row,timings:Object.fromEntries(Object.entries(row.timings).map(([k,v])=>[k,{median:v.median,p95:v.p95}]))}));
 mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
}
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({scope:'Node CPU, five exact deployed Meshopt GLBs, textures omitted. Nine sampled poses per original clip plus analytic nonnegative-weight envelope. Translated, rotated and nonuniformly scaled root. Not browser/GPU/frame/mobile acceptance. Prototype is not connected to gameplay.',sourceHashes:Object.fromEntries(['src/rendering/skin-envelope.js','tools/check_skin_envelopes.mjs'].map(f=>[f,hash(readFileSync(f))])),records},null,2)+'\n');
