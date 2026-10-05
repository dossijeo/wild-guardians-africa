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
test('leaving actors release private bone textures once while retaining shared model resources',()=>{
 const model=new Group(),bone=new Bone(),skeleton=new Skeleton([bone]),geometry=new BoxGeometry(),material=new MeshStandardMaterial();
 model.add(bone);for(let i=0;i<2;i++){const mesh=new SkinnedMesh(geometry,material);model.add(mesh);mesh.bind(skeleton);}
 skeleton.computeBoneTexture();let textures=0,geometryDisposals=0,materialDisposals=0;
 skeleton.boneTexture.addEventListener('dispose',()=>textures++);geometry.addEventListener('dispose',()=>geometryDisposals++);material.addEventListener('dispose',()=>materialDisposals++);
 releaseActorRig({model,mixer:new AnimationMixer(model)});
 assert.equal(textures,1);assert.equal(skeleton.boneTexture,null);assert.equal(geometryDisposals,0);assert.equal(materialDisposals,0);
});
