import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createTerrainAdmission} from '../src/rendering/webgpu-terrain-admission.js';
import {createActorTerrainSampler,hasResidentActorTerrain} from '../src/rendering/webgpu-actor-terrain.js';

test('published terrain retains the prepared subtree through deferred retirement',async()=>{
 const scene=new THREE.Scene(),prepared=[],releases=[],group=new THREE.Group(),ground=new THREE.Mesh(),water=new THREE.Mesh();group.add(ground,water);let disposed=0;
 const pipeline={async prepare(object){prepared.push({object,children:[...object.children]});},deferRelease(object,release){releases.push({object,release});}},owner=createTerrainAdmission({scene,admission:pipeline});
 owner.publish('0,0',group,[ground,water],()=>disposed++);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(group.parent,scene);assert.deepEqual(prepared[0],{object:group,children:[ground,water]});
 await pipeline.prepare(group);assert.deepEqual(prepared[1],{object:group,children:[ground,water]});
 owner.remove('0,0');assert.equal(group.parent,null);assert.equal(ground.parent,group);assert.equal(water.parent,group);assert.equal(disposed,0);
 assert.equal(releases[0].object,group);releases[0].release();assert.equal(ground.parent,null);assert.equal(water.parent,null);assert.equal(disposed,1);owner.dispose();
});
test('terrain withdrawal still schedules resource disposal when its error handler throws',()=>{
 const scene=new THREE.Scene(),group=new THREE.Group(),mesh=new THREE.Mesh(),deferred=[];group.add(mesh);let disposed=0;const owner=createTerrainAdmission({scene,admission:{prepare(){},deferRelease(_group,release){deferred.push(release);}},coordinator:{offer(){return ()=>{throw Error('withdraw failed');};}},onError(){throw Error('notification failed');}});
 owner.publish('0,0',group,[mesh],()=>disposed++,{revision:1});assert.throws(()=>owner.remove('0,0'),/notification failed/);assert.equal(deferred.length,1);assert.equal(mesh.parent,group);deferred[0]();assert.equal(disposed,1);assert.equal(mesh.parent,null);owner.dispose();
});

test('failed terrain attachment retains the old revision and removes partial publication before deferred disposal',async()=>{
 const scene=new THREE.Scene(),releases=[],errors=[],admission=createTerrainAdmission({scene,admission:{prepare:async()=>{},deferRelease(_group,release){releases.push(release);}},onError:error=>errors.push(error)}),flush=()=>new Promise(resolve=>setImmediate(resolve));
 const old=new THREE.Group(),oldMesh=new THREE.Mesh();old.add(oldMesh);admission.publish('0,0',old,[oldMesh],()=>{});await flush();assert.equal(oldMesh.parent,old);assert.equal(old.parent,scene);
 const group=new THREE.Group(),first=new THREE.Mesh(),second=new THREE.Mesh();group.add(first,second);let disposed=0;const add=scene.add.bind(scene);scene.add=object=>{if(object===group){add(object);throw Error('attachment failed');}return add(object);};admission.publish('0,0',group,[first,second],()=>disposed++);await flush();
 assert.equal(errors[0]?.message,'attachment failed');assert.equal(oldMesh.parent,old);assert.equal(old.parent,scene);assert.equal(group.parent,null);assert.equal(first.parent,group);assert.equal(second.parent,group);assert.equal(disposed,0);assert.equal(admission.isReady(),false);releases.shift()();assert.equal(disposed,1);admission.dispose();for(const release of releases)release();
});
test('a terrain publication callback failure is reported without losing the admitted revision',async()=>{
 const scene=new THREE.Scene(),errors=[],group=new THREE.Group(),mesh=new THREE.Mesh();group.add(mesh);const admission=createTerrainAdmission({scene,admission:{prepare:async()=>{}},onPublished(){throw Error('notification failed');},onError:error=>errors.push(error)});admission.publish('0,0',group,[mesh],()=>{});await new Promise(resolve=>setImmediate(resolve));assert.equal(errors[0]?.message,'notification failed');assert.equal(mesh.parent,group);assert.equal(group.parent,scene);assert.equal(admission.isVisible('0,0',mesh),true);admission.dispose();
});
test('terrain publication exposes the complete replacement before notifying consumers',async()=>{
 const scene=new THREE.Scene(),notifications=[],old=new THREE.Group(),oldMesh=new THREE.Mesh();old.add(oldMesh);const admission=createTerrainAdmission({scene,admission:{prepare:async()=>{}},onPublished:key=>notifications.push({key,children:[...scene.children]})}),flush=()=>new Promise(resolve=>setImmediate(resolve));
 admission.publish('0,0',old,[oldMesh],()=>{});await flush();const group=new THREE.Group(),ground=new THREE.Mesh(),water=new THREE.Mesh();group.add(ground,water);admission.publish('0,0',group,[ground,water],()=>{});await flush();assert.deepEqual(notifications.at(-1),{key:'0,0',children:[group]});assert.equal(admission.isVisible('0,0',ground),true);admission.dispose();
});

function chunk(cx=0,cz=0){const positions=new Float32Array(49*49*3),colors=new Float32Array(49*49*3),indices=new Uint16Array(48*48*6);for(let z=0;z<49;z++)for(let x=0;x<49;x++){const i=(z*49+x)*3;positions.set([x-24,(x+z)/10,z-24],i);colors.set([.2,.4,.6],i);}for(let z=0;z<48;z++)for(let x=0;x<48;x++){const a=z*49+x,k=(z*48+x)*6;indices.set([a,a+49,a+1,a+1,a+49,a+50],k);}return {authority:'spatial-wasm',cx,cz,terrain:{positions,colors,indices}};}
test('mud geometry shares the terrain admission subtree and is disposed on abort',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),mudMaterial=new THREE.MeshBasicMaterial(),mudGeometry=new THREE.BufferGeometry(),view=createWebGpuTerrainResidency({scene,material,mudMaterial,pipelineAdmission:{prepare:async()=>{}}});let disposed=0;mudGeometry.addEventListener('dispose',()=>disposed++);
 try{const token=view.prepareRevision(chunk(),1,'e',{mudGeometry});assert.equal(token.object.children.length,2);assert.equal(token.object.children[1].geometry,mudGeometry);assert.equal(token.object.children[1].material,mudMaterial);token.abort();assert.equal(disposed,1);assert.equal(scene.children.length,0);}finally{view.dispose();material.dispose();mudMaterial.dispose();}
});
test('terrain logical preparation rolls back without publishing or notifying',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),events=[],view=createWebGpuTerrainResidency({scene,material,onRevision:event=>events.push(event)});
 try{view.replace(chunk(),1,'e');const old=view.get(0,0),height=view.surface(-24,-24),next=chunk();next.terrain.positions[1]=42;const token=view.prepareRevision(next,2,'e');assert.equal(token.applyLogical(),true);assert.equal(view.surface(-24,-24),42);assert.equal(view.get(0,0),token.object);assert.equal(scene.children[0],old);assert.equal(events.length,1);assert.equal(token.rollbackLogical(),true);assert.equal(view.get(0,0),old);assert.equal(view.surface(-24,-24),height);assert.equal(scene.children[0],old);assert.equal(events.length,1);assert.equal(token.rollbackLogical(),false);assert.equal(token.applyLogical(),true);assert.equal(token.publish(),true);assert.equal(view.surface(-24,-24),42);assert.equal(scene.children[0],token.object);assert.equal(events.length,2);
 }finally{view.dispose();material.dispose();}
});
test('aborting an applied terrain preparation restores the previous surface and disposes the candidate',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),view=createWebGpuTerrainResidency({scene,material}),next=chunk();view.replace(chunk(),1,'e');const old=view.get(0,0),token=view.prepareRevision(next,2,'e');let disposed=0;token.object.geometry.addEventListener('dispose',()=>disposed++);token.applyLogical();assert.equal(token.abort(),true);assert.equal(view.get(0,0),old);assert.equal(scene.children[0],old);assert.equal(disposed,1);assert.throws(()=>token.publish(),/not applied/);view.dispose();material.dispose();
});
test('preparing terrain leaves the resident surface unchanged until commit and abort releases its geometry',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),view=createWebGpuTerrainResidency({scene,material}),events=[];
 try{view.replace(chunk(),1,'e');const old=view.get(0,0),next=chunk();next.terrain.positions[1]=42;const staged=view.prepareRevision(next,2,'e');staged.object.geometry.addEventListener('dispose',()=>events.push('disposed'));
  assert.equal(scene.children.length,1);assert.equal(view.get(0,0),old);assert.notEqual(view.surface(-24,-24),42);assert.equal(staged.abort(),true);assert.equal(staged.abort(),false);assert.deepEqual(events,['disposed']);assert.equal(view.get(0,0),old);
  const committed=view.prepareRevision(next,2,'e');assert.equal(committed.commit(),true);assert.equal(view.get(0,0),committed.object);assert.equal(view.surface(-24,-24),42);assert.throws(()=>committed.commit(),/already consumed/);
 }finally{view.dispose();material.dispose();}
});
test('prepared stale revisions and revisions abandoned on disposal release their resources',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),view=createWebGpuTerrainResidency({scene,material}),events=[];const stale=view.prepareRevision(chunk(),1,'e');stale.object.geometry.addEventListener('dispose',()=>events.push('stale'));view.replace(chunk(),2,'e');assert.equal(stale.commit(),false);assert.deepEqual(events,['stale']);const pending=view.prepareRevision(chunk(),3,'e');pending.object.geometry.addEventListener('dispose',()=>events.push('pending'));view.dispose();assert.deepEqual(events,['stale','pending']);assert.throws(()=>pending.commit(),/already consumed/);material.dispose();
});
test('aborted terrain preparations release owned materials and preserve shared materials',()=>{
 const scene=new THREE.Scene(),fallback=new THREE.MeshBasicMaterial(),shared=new THREE.MeshBasicMaterial(),owned=new THREE.MeshBasicMaterial(),disposed=[];owned.addEventListener('dispose',()=>disposed.push('owned'));shared.addEventListener('dispose',()=>disposed.push('shared'));let selected=owned;const view=createWebGpuTerrainResidency({scene,material:fallback,sharedMaterials:[shared],materialFactory:()=>selected});
 const first=view.prepareRevision(chunk(),1);first.abort();assert.deepEqual(disposed,['owned']);selected=shared;const second=view.prepareRevision(chunk(),1);second.abort();assert.deepEqual(disposed,['owned']);assert.equal(view.size,0);assert.equal(scene.children.length,0);view.dispose();shared.dispose();fallback.dispose();
});
test('changed prepared payload and failed attachment discard new terrain without replacing the old',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),view=createWebGpuTerrainResidency({scene,material});view.replace(chunk(),1);const old=view.get(0,0),payload=chunk(),changed=view.prepareRevision(payload,2);let discarded=0;changed.object.geometry.addEventListener('dispose',()=>discarded++);payload.terrain.positions=new Float32Array(payload.terrain.positions);assert.throws(()=>changed.commit(),/payload changed/);assert.equal(discarded,1);assert.equal(view.get(0,0),old);
 const staged=view.prepareRevision(chunk(),2),add=scene.add.bind(scene);staged.object.geometry.addEventListener('dispose',()=>discarded++);scene.add=object=>{add(object);throw Error('attachment failed');};assert.throws(()=>staged.commit(),/attachment failed/);assert.equal(discarded,2);assert.equal(scene.children.length,1);assert.equal(view.get(0,0),old);view.dispose();material.dispose();
});
test('synchronous coordinator rejection retains the previous logical and visible terrain',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),offered=[],errors=[],coordinator={offer(participant){if(participant.revision===2)throw Error('coordinator rejected');offered.push(participant);return ()=>{};},forget(){}},view=createWebGpuTerrainResidency({scene,material,pipelineAdmission:{prepare(){},deferRelease(_group,release){release();}},coordinator,onAdmissionError:error=>errors.push(error.message)});
 try{assert.equal(view.replace(chunk(),1,'e'),true);offered[0].attach();offered[0].finalize()();const previous=view.get(0,0),staged=view.prepareRevision(chunk(),2,'e');let disposed=0;staged.object.children[0].geometry.addEventListener('dispose',()=>disposed++);assert.equal(staged.commit(),false);assert.equal(disposed,1);assert.equal(view.get(0,0),previous);assert.equal(view.getVisible(0,0),previous);assert.equal(scene.children.length,1);assert.deepEqual(errors,['coordinator rejected']);assert.equal(view.replace(chunk(),2,'e'),false);}finally{view.dispose();material.dispose();}
});
test('coordinated terrain exposes revision and supports attachment, rollback and cancellation',async()=>{
 const offered=[],withdrawn=[],published=[],errors=[],scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),coordinator={offer:participant=>{offered.push(participant);return ()=>withdrawn.push(participant.revision);},forget(){}},admission={prepare(){throw Error('coordinator owns preparation');},deferRelease(_object,release){release();}},residency=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission,coordinator,onPublished:key=>published.push(key),onAdmissionError:error=>errors.push(error)}),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{residency.replace(chunk(),1,'e');await turn();const a=offered[0];assert.deepEqual([a.key,a.revision,a.epoch,a.side],['0,0',1,'e','terrain']);assert.equal(scene.children.length,0);assert.equal(residency.getVisible(0,0),null);assert.throws(()=>a.finalize(),/not attached/);a.attach();assert.equal(scene.children.length,1);a.rollback();assert.equal(scene.children.length,0);a.attach();const notify=a.finalize();assert.equal(residency.getVisible(0,0),scene.children[0].children[0]);assert.deepEqual(published,[]);notify();assert.deepEqual(published,['0,0']);
  residency.replace(chunk(),2,'e');await turn();const b=offered[1],old=residency.getVisible(0,0);residency.replace(chunk(),3,'e');await turn();assert.equal(b.signal.aborted,true);assert.deepEqual(withdrawn,[2]);assert.throws(()=>b.attach(),{name:'AbortError'});assert.equal(residency.getVisible(0,0),old);const c=offered[2];assert.equal(c.revision,3);c.attach();c.finalize()();assert.notEqual(residency.getVisible(0,0),old);assert.deepEqual(published,['0,0','0,0']);assert.deepEqual(errors,[]);
 }finally{residency.dispose();material.dispose();}
});
test('coordinated terrain can pair a legacy checkpoint without changing logical revisions',()=>{
 const offered=[],scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),coordinator={offer:participant=>{offered.push(participant);return ()=>{};},forget(){}},view=createWebGpuTerrainResidency({scene,material,pipelineAdmission:{prepare(){},deferRelease(_group,release){release();}},coordinator});
 try{const payload=chunk();view.replace(payload,8,'e');view.restoreCheckpoint(payload,null,{publicationEpoch:'checkpoint:1',publicationRevision:1});assert.equal(offered[0].revision,8);assert.equal(offered[0].signal.aborted,true);assert.deepEqual([offered[1].epoch,offered[1].revision],['checkpoint:1',1]);assert.equal(view.replace(payload,8,'e'),false);assert.equal(view.replace(payload,9,'e'),true);}finally{view.dispose();material.dispose();}
});
test('reentrant chunk removal during attachment cannot leave cancelled terrain visible',()=>{
 const offered=[],scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),coordinator={offer:participant=>{offered.push(participant);return ()=>{};},forget(){}},view=createWebGpuTerrainResidency({scene,material,pipelineAdmission:{prepare(){},deferRelease(_group,release){release();}},coordinator});
 try{view.replace(chunk(),1,'e');const participant=offered[0],add=scene.add.bind(scene);scene.add=mesh=>{const result=add(mesh);view.remove(0,0,2);return result;};assert.throws(()=>participant.attach(),{name:'AbortError'});participant.rollback();assert.equal(scene.children.length,0);assert.equal(view.getVisible(0,0),null);}finally{view.dispose();material.dispose();}
});
test('chunk removal forgets coordinated state only for accepted revisions and permits a new appearance',async()=>{
 const offered=[],forgotten=[],scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),coordinator={offer:participant=>{offered.push(participant);return ()=>{};},forget:key=>forgotten.push(key)},admission={prepare(){},deferRelease(_object,release){release();}},view=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission,coordinator});
 try{view.replace(chunk(),3,'e');const first=offered[0];assert.equal(view.remove(0,0,3),false);assert.deepEqual(forgotten,[]);assert.equal(view.remove(0,0,4),true);assert.deepEqual(forgotten,['0,0']);assert.equal(first.signal.aborted,true);assert.throws(()=>first.attach(),{name:'AbortError'});assert.equal(view.get(0,0),null);assert.equal(view.replace(chunk(),4,'e'),false);assert.equal(view.replace(chunk(),5,'e'),true);assert.equal(offered[1].revision,5);offered[1].attach();offered[1].finalize()();assert.equal(view.getVisible(0,0),scene.children[0].children[0]);view.dispose();assert.deepEqual(forgotten,['0,0','0,0']);}finally{view.dispose();material.dispose();}
});
test('actor presentation follows the visible terrain until its replacement is admitted',async()=>{
 const requests=[],published=[],scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),admission={prepare:()=>new Promise(resolve=>requests.push(resolve)),deferRelease:(_group,release)=>release()},residency=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission,onPublished:key=>published.push(key)}),sample=createActorTerrainSampler(residency),make=y=>{const payload=chunk();for(let i=1;i<payload.terrain.positions.length;i+=3)payload.terrain.positions[i]=y;return payload;};
 residency.replace(make(2),1);await Promise.resolve();assert.equal(hasResidentActorTerrain(residency,.2,.3),false);requests[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(hasResidentActorTerrain(residency,.2,.3),true);assert.ok(Math.abs(sample(.2,.3)-2)<1e-6);
 residency.replace(make(9),2);await Promise.resolve();assert.equal(residency.surface(.2,.3),9);assert.ok(Math.abs(sample(.2,.3)-2)<1e-6);requests[1]();await new Promise(resolve=>setImmediate(resolve));assert.ok(Math.abs(sample(.2,.3)-9)<1e-6);assert.deepEqual(published,['0,0','0,0']);residency.remove(0,0,3);assert.equal(hasResidentActorTerrain(residency,.2,.3),false);residency.dispose();material.dispose();
});
test('samples the confirmed terrain triangles exactly, including replacement and chunk boundaries',()=>{
 const scene=new THREE.Scene(),residency=createWebGpuTerrainResidency({scene,material:new THREE.MeshBasicMaterial({side:THREE.DoubleSide})}),data=chunk(-1,1);
 for(let i=0;i<data.terrain.positions.length/3;i++)data.terrain.positions[i*3+1]=Math.fround(Math.sin(i*.3)*3);
 residency.replace(data,1);const mesh=residency.get(-1,1);mesh.updateWorldMatrix(true,false);const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(let z=24;z<72;z+=.731)for(let x=-72;x< -24;x+=.829){ray.set(new THREE.Vector3(x,1000,z),down);const expected=ray.intersectObject(mesh,false)[0]?.point.y;assert.ok(Math.abs(residency.surface(x,z)-expected)<1e-5,`${x},${z}`);}
 assert.equal(residency.surface(-24,30),null);const newer=chunk(-1,1);newer.terrain.positions.forEach((v,i)=>{if(i%3===1)newer.terrain.positions[i]=10;});residency.replace(newer,2);assert.equal(residency.surface(-60,40),10);assert.equal(residency.replace(data,1),false);assert.equal(residency.surface(-60,40),10);residency.remove(-1,1,3);assert.equal(residency.surface(-60,40),null);residency.dispose();
});
test('keeps native chunk geometry and rejects stale updates and removals',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),residency=createWebGpuTerrainResidency({scene,material}),data=chunk(1,-2);
 assert.equal(residency.replace(data,1),true);const mesh=residency.get(1,-2);assert.deepEqual(mesh.position.toArray(),[48,0,-96]);assert.equal(mesh.geometry.attributes.position.array,data.terrain.positions);assert.equal(mesh.material,material);assert.equal(mesh.geometry.index.count,48*48*6);
 assert.equal(residency.replace(chunk(1,-2),1),false);assert.equal(residency.remove(1,-2,0),false);assert.equal(residency.get(1,-2),mesh);
 let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);assert.equal(residency.remove(1,-2,2),true);assert.equal(disposed,1);assert.equal(residency.replace(data,1),false);assert.equal(residency.size,0);
 assert.equal(residency.replace(chunk(1,-2),3),true);residency.dispose();assert.equal(scene.children.length,0);assert.throws(()=>residency.replace(data,4),/disposed/);
});
test('invalid replacement leaves the current surface intact',()=>{
 const scene=new THREE.Scene(),residency=createWebGpuTerrainResidency({scene,material:new THREE.MeshBasicMaterial()}),data=chunk();residency.replace(data,1);const current=residency.get(0,0),bad=chunk();bad.terrain.indices=new Uint16Array(3);
 assert.throws(()=>residency.replace(bad,2),/Invalid Wild Engine/);assert.equal(residency.get(0,0),current);assert.equal(scene.children.length,1);residency.dispose();
});
test('keeps water paired with its confirmed chunk and disposes old geometry',()=>{
 const scene=new THREE.Scene(),waterMaterial=new THREE.MeshBasicMaterial(),residency=createWebGpuTerrainResidency({scene,material:new THREE.MeshBasicMaterial(),waterMaterial}),data=chunk(1,-2);data.water=new Float32Array([0,1,0,1,1,0,0,1,1]);residency.replace(data,1);const water=residency.getWater(1,-2);assert.deepEqual(water.position.toArray(),[48,0,-96]);assert.deepEqual(residency.waterSample(),{x:48+1/3,y:1,z:-96+1/3});assert.equal(water.geometry.attributes.position.array,data.water);assert.equal(water.material,waterMaterial);let disposed=0;water.geometry.addEventListener('dispose',()=>disposed++);
 const bad=chunk(1,-2);bad.water=new Float32Array([1]);assert.throws(()=>residency.replace(bad,2),/Invalid Wild Engine water/);assert.equal(residency.getWater(1,-2),water);assert.equal(disposed,0);
 const dry=chunk(1,-2);dry.water=new Float32Array(0);residency.replace(dry,2);assert.equal(disposed,1);assert.equal(residency.getWater(1,-2),null);assert.equal(residency.waterSize,0);assert.equal(residency.replace(data,1),false);residency.dispose();assert.equal(scene.children.length,0);
});

test('owns per-chunk materials and preserves the fallback',()=>{
 const scene=new THREE.Scene(),fallback=new THREE.MeshBasicMaterial(),owned=[],residency=createWebGpuTerrainResidency({scene,material:fallback,materialFactory:data=>{if(!data.groundMask)return null;const material=new THREE.MeshBasicMaterial();material.addEventListener('dispose',()=>owned.push(data.cx));return material;}}),first=chunk();first.groundMask=new Uint8Array(35*35*4);residency.replace(first,1);assert.notEqual(residency.get(0,0).material,fallback);residency.replace(chunk(),2);assert.deepEqual(owned,[0]);assert.equal(residency.get(0,0).material,fallback);residency.dispose();
});

test('shared terrain materials remain owned by their provider across replacement and removal',async()=>{
 const scene=new THREE.Scene(),fallback=new THREE.MeshBasicMaterial(),shared=new THREE.MeshBasicMaterial(),requests=[];let disposed=0;shared.addEventListener('dispose',()=>disposed++);
 const admission={prepare:()=>new Promise(resolve=>requests.push(resolve)),deferRelease:(_object,release)=>release()},residency=createWebGpuTerrainResidency({scene,material:fallback,sharedMaterials:[shared],materialFactory:()=>shared,pipelineAdmission:admission});
 residency.replace(chunk(),1);residency.replace(chunk(1,0),1);await Promise.resolve();requests.forEach(resolve=>resolve());await new Promise(resolve=>setImmediate(resolve));assert.equal(residency.get(0,0).material,shared);assert.equal(residency.get(1,0).material,shared);
 residency.replace(chunk(),2);await Promise.resolve();residency.remove(0,0,3);residency.remove(1,0,2);residency.dispose();assert.equal(disposed,0);shared.dispose();fallback.dispose();assert.equal(disposed,1);
});

test('checkpoint replaces terrain without consuming the next authoritative revision',()=>{
 const residency=createWebGpuTerrainResidency({scene:new THREE.Scene(),material:new THREE.MeshBasicMaterial()}),old=chunk(),checkpoint=chunk(),future=chunk();
 checkpoint.terrain.positions[1]=17;future.terrain.positions[1]=23;residency.replace(old,4);residency.restoreCheckpoint(checkpoint);
 assert.equal(residency.get(0,0).geometry.attributes.position.array[1],17);
 assert.equal(residency.replace(old,4),false);assert.equal(residency.replace(future,5),true);
 assert.equal(residency.get(0,0).geometry.attributes.position.array[1],23);residency.dispose();
});
test('legacy checkpoint uses a distinct visual identity without changing the authoritative revision',()=>{
 const offers=[],coordinator={offer:participant=>{offers.push(participant);return ()=>{};},forget(){}},material=new THREE.MeshBasicMaterial(),residency=createWebGpuTerrainResidency({scene:new THREE.Scene(),material,pipelineAdmission:{prepare(){}},coordinator});
 try{residency.replace(chunk(),4);residency.restoreCheckpoint(chunk(),null,{publicationEpoch:'checkpoint-1'});assert.equal(offers.at(-1).epoch,'checkpoint-1');assert.equal(offers.at(-1).revision,5);assert.equal(residency.replace(chunk(),5),true);assert.equal(offers.at(-1).epoch,null);assert.equal(offers.at(-1).revision,5);assert.throws(()=>residency.restoreCheckpoint(chunk(),null,{publicationEpoch:''}),/epoch/);}finally{residency.dispose();material.dispose();}
});

test('terrain manifest fails closed across transit, epoch changes and checkpoint restoration',()=>{
 const residency=createWebGpuTerrainResidency({scene:new THREE.Scene(),material:new THREE.MeshBasicMaterial()}),manifest={epoch:'a',chunks:[{cx:0,cz:0,revision:1},{cx:1,cz:0,revision:1}]};assert.equal(residency.matchesManifest(manifest),false);residency.replace(chunk(),1,'a');assert.equal(residency.matchesManifest(manifest),false);residency.replace(chunk(1,0),1,'a');assert.equal(residency.matchesManifest(manifest),true);assert.equal(residency.matchesManifest({...manifest,epoch:'b'}),false);assert.equal(residency.matchesManifest({...manifest,chunks:[...manifest.chunks,manifest.chunks[0]]}),false);residency.replace(chunk(),2,'a');assert.equal(residency.matchesManifest(manifest),false);const current={...manifest,chunks:[{cx:0,cz:0,revision:2},manifest.chunks[1]]};assert.equal(residency.matchesManifest(current),true);residency.restoreCheckpoint(chunk());assert.equal(residency.matchesManifest(current),false);residency.dispose();
});
test('versioned recovery accepts only byte-identical duplicate terrain',()=>{const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),view=createWebGpuTerrainResidency({scene,material,waterMaterial:material}),payload=chunk(),metadata={epoch:'e',revision:4};payload.groundMask=new Uint8Array(35*35*4);payload.water=new Float32Array([0,0,0,1,0,0,0,0,1]);assert.equal(view.restoreCheckpoint(payload,metadata),true);const duplicate=structuredClone(payload);assert.equal(view.restoreCheckpoint(duplicate,metadata),false);assert.equal(view.matchesCheckpoint(duplicate,metadata),true);duplicate.terrain.positions[1]+=1;assert.equal(view.matchesCheckpoint(duplicate,metadata),false);duplicate.terrain.positions[1]-=1;duplicate.groundMask[0]=1;assert.equal(view.matchesCheckpoint(duplicate,metadata),false);assert.equal(view.matchesCheckpoint(payload,{epoch:'other',revision:4}),false);view.dispose();material.dispose();});

test('terrain admission keeps the previous drawable until the confirmed replacement is ready',async()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),requests=[],published=[],errors=[];
 const admission={prepare(group,{signal}){return new Promise((resolve,reject)=>requests.push({group,signal,resolve,reject}));},deferRelease(group,release){release();}};
 const residency=createWebGpuTerrainResidency({scene,material,waterMaterial:material,pipelineAdmission:admission,onAdmissionError:error=>errors.push(error),onPublished:key=>published.push(key)}),manifest=revision=>({epoch:'a',chunks:[{cx:0,cz:0,revision}]});
 const wet=chunk();wet.water=new Float32Array([0,1,0,1,1,0,0,1,1]);residency.replace(wet,1,'a');const first=residency.get(0,0),firstWater=residency.getWater(0,0);await Promise.resolve();assert.equal(scene.children.length,0);assert.equal(residency.matchesManifest(manifest(1)),false);requests[0].resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(scene.children[0],first.parent);assert.equal(firstWater.parent,first.parent);assert.notEqual(residency.waterSample(),null);assert.equal(residency.matchesManifest(manifest(1)),true);
 residency.replace(chunk(),2,'a');const obsolete=residency.get(0,0);await Promise.resolve();assert.equal(scene.children[0],first.parent);assert.equal(residency.matchesManifest(manifest(2)),false);
 residency.replace(chunk(),3,'a');const latest=residency.get(0,0);await Promise.resolve();assert.equal(requests[1].signal.aborted,true);requests[1].resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(scene.children[0],first.parent);assert.notEqual(latest,obsolete);requests[2].resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(scene.children[0],latest.parent);assert.equal(residency.matchesManifest(manifest(3)),true);assert.deepEqual(published,['0,0','0,0']);assert.deepEqual(errors,[]);
 residency.dispose();assert.equal(scene.children.length,0);material.dispose();
});

test('failed or removed terrain admissions never replace or resurrect visible terrain',async()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),requests=[],errors=[],releases=[];
 const admission={prepare(group,{signal}){return new Promise((resolve,reject)=>requests.push({group,signal,resolve,reject}));},deferRelease(group,release){releases.push(release);}};
 const residency=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission,onAdmissionError:error=>errors.push(error.message)});
 residency.replace(chunk(),1);await Promise.resolve();requests[0].resolve();await new Promise(resolve=>setImmediate(resolve));const first=scene.children[0];
 residency.replace(chunk(),2);await Promise.resolve();requests[1].reject(Error('prepare failed'));await new Promise(resolve=>setImmediate(resolve));assert.equal(scene.children[0],first);assert.equal(residency.visualReady(),false);assert.deepEqual(errors,['prepare failed']);
 residency.replace(chunk(),3);await Promise.resolve();residency.remove(0,0,4);requests[2].resolve();await new Promise(resolve=>setImmediate(resolve));for(const release of releases)release();assert.equal(scene.children.length,0);assert.equal(residency.size,0);residency.dispose();material.dispose();
});
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';

test('terrain revision leases follow preparation, replacement and logical removal',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),registry=createWebGpuResourceRegistry(),view=createWebGpuTerrainResidency({scene,material,resourceRegistry:registry});
 try{const abandoned=view.prepareRevision(chunk(),1,'epoch');assert.equal(registry.status().owned.length,1);assert.equal(registry.status().owned[0].state,'prepared');abandoned.abort();assert.equal(registry.status().owned.length,0);view.replace(chunk(),1,'epoch');const first=registry.status().owned[0];assert.equal(first.state,'committed');assert.ok(first.bytes>0);view.replace(chunk(),2,'epoch');assert.equal(registry.status().owned.length,1);assert.ok(registry.status().owned[0].version>first.version);view.remove(0,0,3);assert.equal(registry.status().owned.length,0);}finally{view.dispose();registry.dispose();material.dispose();}
});
test('terrain lease survives owner shutdown until deferred graphical retirement',async()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),registry=createWebGpuResourceRegistry(),deferred=[],admission={prepare:async()=>{},deferRelease(_object,release){deferred.push(release);}},view=createWebGpuTerrainResidency({scene,material,resourceRegistry:registry,pipelineAdmission:admission});
 try{view.replace(chunk(),1,'epoch');await new Promise(resolve=>setImmediate(resolve));assert.equal(registry.status().owned.length,1);registry.dispose();view.remove(0,0,2);assert.equal(registry.status().owned.length,1);assert.equal(deferred.length,1);deferred.shift()();assert.equal(registry.status().owned.length,0);}finally{view.dispose();for(const release of deferred)release();registry.dispose();material.dispose();}
});

test('visible terrain enumeration retains the admitted revision while its replacement is pending',async()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),requests=[],admission={prepare:()=>new Promise(resolve=>requests.push(resolve)),deferRelease:(_group,release)=>release()},view=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission}),flush=()=>new Promise(resolve=>setImmediate(resolve)),visible=()=>{const items=[];view.forEachVisibleGround((mesh,key)=>items.push([mesh,key]));return items;};
 try{view.replace(chunk(),1,'e');await flush();assert.deepEqual(visible(),[]);requests.shift()();await flush();const first=view.getVisible(0,0);assert.deepEqual(visible(),[[first,'0,0']]);view.replace(chunk(),2,'e');await flush();assert.notEqual(view.get(0,0),first);assert.deepEqual(visible(),[[first,'0,0']]);requests.shift()();await flush();const second=view.getVisible(0,0);assert.notEqual(second,first);assert.deepEqual(visible(),[[second,'0,0']]);second.parent.visible=false;assert.deepEqual(visible(),[]);second.parent.visible=true;second.material.visible=false;assert.deepEqual(visible(),[]);second.material.visible=true;view.remove(0,0,3);assert.deepEqual(visible(),[]);}finally{view.dispose();material.dispose();}
});

test('a retained visible ground keeps its geometry until the auxiliary user releases it',async()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),view=createWebGpuTerrainResidency({scene,material});let disposals=0;
 try{view.replace(chunk(),1,'e');const first=view.getVisible(0,0);first.geometry.addEventListener('dispose',()=>disposals++);const release=view.retainVisibleGround(first);view.replace(chunk(),2,'e');assert.equal(disposals,0);assert.throws(()=>view.retainVisibleGround(first),/not visibly resident/);release();release();assert.equal(disposals,1);const second=view.getVisible(0,0);let secondDisposed=0;second.geometry.addEventListener('dispose',()=>secondDisposed++);const hold=view.retainVisibleGround(second);view.dispose();assert.equal(secondDisposed,0);hold();assert.equal(secondDisposed,1);}finally{view.dispose();material.dispose();}
});
test('guardian terrain revision follows visible versioned chunk and removal',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),view=createWebGpuTerrainResidency({scene,material});try{assert.equal(view.revisionAt(0,0),null);view.replace(chunk(),1,'epoch');assert.deepEqual(view.revisionAt(0,0),{cx:0,cz:0,epoch:'epoch',revision:1});view.replace(chunk(),2,'epoch');assert.deepEqual(view.revisionAt(0,0),{cx:0,cz:0,epoch:'epoch',revision:2});view.remove(0,0,3);assert.equal(view.revisionAt(0,0),null);}finally{view.dispose();material.dispose();}
});
