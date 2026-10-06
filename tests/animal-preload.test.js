import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial,AnimationClip,VectorKeyframeTrack,SkinnedMesh,Skeleton,Bone,AnimationMixer} from 'three';
import {AnimalPreload,releaseActorRig} from '../src/rendering/animal-preload.js';
function source(){const scene=new Group();scene.add(new Mesh(new BoxGeometry(),new MeshStandardMaterial()));return {scene,animations:['Walking','Running'].map(name=>new AnimationClip(name,1,[new VectorKeyframeTrack('.position',[0,1],[0,0,0,0,0,0])]))};}
test('preload deduplicates concurrent downloads and hands the warmed rig to the first animal',async()=>{
 const gltf=source();let downloads=0;const pool=new AnimalPreload({model:async()=>{downloads++;return gltf;}},()=>({url:'animal.glb'}));
 const [first,second]=await Promise.all([pool.warm('warthog'),pool.warm('warthog')]);
 assert.equal(first,second);assert.equal(downloads,1);assert.ok(first.spare);assert.equal(first.spare.name,'Running');
 const spare=first.spare,a=await pool.take('warthog'),b=await pool.take('warthog');
 assert.equal(a,spare);assert.equal(downloads,1);assert.notEqual(a.model,b.model);assert.notEqual(a.mixer,b.mixer);assert.equal(a.clips,b.clips);
 assert.equal(a.model.children[0].geometry,gltf.scene.children[0].geometry);assert.equal(a.model.children[0].material,gltf.scene.children[0].material);
 assert.equal((await pool.spares()).length,0);pool.dispose();
});
test('failed preloads can retry, and a disposed pool does not create a rig after a delayed load',async()=>{
 let attempts=0;const gltf=source(),retry=new AnimalPreload({model:async()=>{if(++attempts===1)throw Error('Network failed');return gltf;}},()=>({url:'animal.glb'}));
 await assert.rejects(retry.warm('lion'),/Network failed/);assert.ok((await retry.warm('lion')).spare);assert.equal(attempts,2);retry.dispose();
 let finish;const pool=new AnimalPreload({model:()=>new Promise(resolve=>{finish=resolve;})},()=>({url:'animal.glb'}));
 const pending=pool.warm('rhino');pool.dispose();finish(gltf);assert.equal((await pending).spare,null);assert.equal((await pool.spares()).length,0);
});
test('concurrent animals consume the reserve once and get distinct rigs with shared assets',async()=>{
 const gltf=source();let downloads=0;const pool=new AnimalPreload({model:async()=>{downloads++;return gltf;}},()=>({url:'animal.glb'}));
 const entry=await pool.warm('warthog'),spare=entry.spare,rigs=await Promise.all(Array.from({length:4},()=>pool.take('warthog')));
 assert.equal(downloads,1);assert.equal(rigs.filter(r=>r===spare).length,1);assert.equal(new Set(rigs.map(r=>r.model)).size,4);assert.equal(new Set(rigs.map(r=>r.mixer)).size,4);
 for(const rig of rigs){assert.equal(rig.clips,entry.clips);assert.equal(rig.model.children[0].geometry,gltf.scene.children[0].geometry);assert.equal(rig.model.children[0].material,gltf.scene.children[0].material);releaseActorRig(rig);}
 assert.equal(entry.spare,null);pool.dispose();
});
test('planned reserves create one rig per frame and remove synchronous creation from group take',async()=>{
 const gltf=source(),pool=new AnimalPreload({model:async()=>gltf},()=>({url:'animal.glb'}));await pool.warm('warthog');let frame=0;const creations=[],create=pool.create.bind(pool);pool.create=(...args)=>{creations.push(frame);return create(...args);};
 let prepared=0;assert.equal(await pool.reserveGroup(Array(4).fill('warthog'),{nextFrame:async()=>{frame++;},prepare:async()=>{prepared++;}}),true);assert.deepEqual(creations,[1,2,3]);assert.equal(prepared,3);assert.equal((await pool.spares()).length,4);
 const rigs=await Promise.all(Array.from({length:4},()=>pool.take('warthog')));assert.equal(creations.length,3);assert.equal(new Set(rigs).size,4);assert.equal((await pool.spares()).length,0);for(const rig of rigs)releaseActorRig(rig);pool.dispose();
});
test('changed plans release excess reserves and cancel a waiting generation',async()=>{
 const pool=new AnimalPreload({model:async()=>source()},()=>({url:'animal.glb'}));await pool.warm('warthog');await pool.reserveGroup(Array(4).fill('warthog'),{nextFrame:async()=>{}});assert.equal((await pool.spares()).length,4);
 let released=0;for(const rig of (await pool.spares()).slice(1)){const stop=rig.mixer.stopAllAction.bind(rig.mixer);rig.mixer.stopAllAction=()=>{released++;stop();};}
 await pool.reserveGroup([], {nextFrame:async()=>{}});assert.equal((await pool.spares()).length,1);assert.equal(released,3);
 let resume;const pending=pool.reserveGroup(Array(3).fill('warthog'),{nextFrame:()=>new Promise(resolve=>resume=resolve)});while(!resume)await Promise.resolve();await pool.reserveGroup([]);resume();assert.equal(await pending,false);assert.equal((await pool.spares()).length,1);pool.dispose();
});
test('taking a reserve during preparation reduces remaining demand instead of refilling the whole group',async()=>{
 const pool=new AnimalPreload({model:async()=>source()},()=>({url:'animal.glb'}));await pool.warm('warthog');let taken;
 await pool.reserveGroup(Array(3).fill('warthog'),{nextFrame:async()=>{if(!taken)taken=await pool.take('warthog');}});assert.equal((await pool.spares()).length,2);releaseActorRig(taken);pool.dispose();
});
test('dispose during reserve preparation releases the unregistered rig',async()=>{
 const pool=new AnimalPreload({model:async()=>source()},()=>({url:'animal.glb'}));await pool.warm('warthog');let finish,rig;
 const pending=pool.reserveGroup(Array(2).fill('warthog'),{nextFrame:async()=>{},prepare:value=>{rig=value;return new Promise(resolve=>finish=resolve);}});while(!finish)await Promise.resolve();let stopped=0;const stop=rig.mixer.stopAllAction.bind(rig.mixer);rig.mixer.stopAllAction=()=>{stopped++;stop();};pool.dispose();finish();assert.equal(await pending,false);assert.equal(stopped,1);assert.equal((await pool.spares()).length,0);
});
test('failed GPU preparation releases the new rig and retains existing reserves for retry',async()=>{
 const pool=new AnimalPreload({model:async()=>source()},()=>({url:'animal.glb'}));await pool.warm('warthog');let released=0;
 await assert.rejects(pool.reserveGroup(Array(2).fill('warthog'),{nextFrame:async()=>{},prepare:async rig=>{const stop=rig.mixer.stopAllAction.bind(rig.mixer);rig.mixer.stopAllAction=()=>{released++;stop();};throw Error('GPU failed');}}),/GPU failed/);
 assert.equal(released,1);assert.equal((await pool.spares()).length,1);assert.equal(await pool.reserveGroup(Array(2).fill('warthog'),{nextFrame:async()=>{}}),true);assert.equal((await pool.spares()).length,2);pool.dispose();
});
test('leaving actors release private bone textures once while retaining shared model resources',()=>{
 const model=new Group(),bone=new Bone(),skeleton=new Skeleton([bone]),geometry=new BoxGeometry(),material=new MeshStandardMaterial();
 model.add(bone);for(let i=0;i<2;i++){const mesh=new SkinnedMesh(geometry,material);model.add(mesh);mesh.bind(skeleton);}
 skeleton.computeBoneTexture();let textures=0,geometryDisposals=0,materialDisposals=0;
 skeleton.boneTexture.addEventListener('dispose',()=>textures++);geometry.addEventListener('dispose',()=>geometryDisposals++);material.addEventListener('dispose',()=>materialDisposals++);
 releaseActorRig({model,mixer:new AnimationMixer(model)});
 assert.equal(textures,1);assert.equal(skeleton.boneTexture,null);assert.equal(geometryDisposals,0);assert.equal(materialDisposals,0);
});
