import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuPicker,createCutoutHitTest,webGpuPickerReady} from '../src/rendering/webgpu-picker.js';

test('prepares a confirmed animal pose only for the pick and restores it even on raycast failure',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,100),root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateProjectionMatrix();root.add(mesh);scene.add(root);let prepared=0,restored=0;const actor={root,preparePick(){prepared++;return ()=>restored++;}},picker=createWebGpuPicker({scene,camera,state:{raid:{animals:[{id:'a',status:'walking'}]}},animals:{get:()=>actor},cropBounds:()=>[]});
 assert.equal(picker.pick({x:0,y:0}).entityId,'a');assert.equal(prepared,1);assert.equal(restored,1);picker.pick({x:0,y:0,terrainOnly:true});assert.equal(prepared,1);
 mesh.raycast=()=>{throw Error('raycast failed');};assert.throws(()=>picker.pick({x:0,y:0}),/raycast failed/);assert.equal(prepared,2);assert.equal(restored,2);
});
test('picks confirmed animal, nearest crop, and terrain without the old scene',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,5,10);camera.lookAt(0,0,0);camera.updateProjectionMatrix();const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.userData.ground=true;scene.add(floor);const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());mesh.position.set(0,.5,0);root.add(mesh);scene.add(root);const state={raid:{animals:[{id:'animal',status:'walking'}]}},picker=createWebGpuPicker({scene,camera,state,animals:{get:()=>({root})},cropBounds:()=>[],sequence:()=>42});const animal=picker.pick({x:0,y:0});assert.equal(animal.entityId,'animal');assert.equal(animal.sequence,42);assert.ok(animal.point);state.raid.animals[0].status='gone';const empty=picker.pick({x:0,y:0});assert.equal(empty.entityId,null);assert.ok(empty.point);const cropPicker=createWebGpuPicker({scene,camera,state,animals:{get:()=>null},cropBounds:()=>[{id:'crop',x:0,y:0,z:0,radius:.45,height:1}],sequence:()=>43});assert.equal(cropPicker.pick({x:0,y:0}).entityId,'crop');assert.equal(cropPicker.pick({x:0,y:0,terrainOnly:true}).entityId,null);assert.throws(()=>cropPicker.pick({x:2,y:0}),/coordinate/);
});
test('terrain and confirmed world geometry occlude candidates',()=>{const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,2,10);camera.lookAt(0,1,0);camera.updateProjectionMatrix();const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial()));root.position.y=1;scene.add(root);const blocker=new THREE.Mesh(new THREE.BoxGeometry(2,4,1),new THREE.MeshBasicMaterial());blocker.position.set(0,1,5);blocker.userData.nativePropSlot=0;scene.add(blocker);const picker=createWebGpuPicker({scene,camera,state:{raid:{animals:[{id:'a',status:'walking'}]}},animals:{get:()=>({root})},cropBounds:()=>[]});assert.equal(picker.pick({x:0,y:0}).entityId,null);blocker.visible=false;assert.equal(picker.pick({x:0,y:0}).entityId,'a');});

test('ignores transparent foliage texels and retains opaque or unavailable data',()=>{const tex=new THREE.DataTexture(new Uint8Array([0,0,0,0,255,255,255,255]),2,1,THREE.RGBAFormat);tex.flipY=false;const material=new THREE.MeshBasicMaterial({map:tex,alphaTest:.35}),object={material},testHit=createCutoutHitTest();assert.equal(testHit({object,uv:new THREE.Vector2(.1,.5)}),false);assert.equal(testHit({object,uv:new THREE.Vector2(.9,.5)}),true);assert.equal(testHit({object}),true);material.dispose();tex.dispose();});

test('selects the nearest visible worker or structure while respecting terrain and props',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,1,10);camera.lookAt(0,1,0);camera.updateProjectionMatrix();
 const box=()=>new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial());
 const structure=new THREE.Group();structure.userData.entityId='wall';structure.add(box());structure.position.set(0,1,0);scene.add(structure);
 const worker=new THREE.Group();worker.add(box());worker.position.set(0,1,3);scene.add(worker);
 const state={workers:[{id:'worker',status:'working'}]},picker=createWebGpuPicker({scene,camera,state,animals:{get:()=>null},workers:{get:()=>({root:worker})},cropBounds:()=>[]});
 assert.equal(picker.pick({x:0,y:0}).entityId,'worker');worker.visible=false;assert.equal(picker.pick({x:0,y:0}).entityId,'wall');
 const crate=new THREE.Group();crate.userData.entityId='crate';crate.position.set(0,1,4);crate.add(box());scene.add(crate);assert.equal(picker.pick({x:0,y:0}).entityId,'crate');crate.visible=false;
 const prop=box();prop.userData.nativePropSlot=0;prop.position.set(0,1,6);scene.add(prop);assert.equal(picker.pick({x:0,y:0}).entityId,null);
 prop.visible=false;const floor=box();floor.userData.ground=true;floor.position.set(0,1,6);scene.add(floor);assert.equal(picker.pick({x:0,y:0}).entityId,null);
 floor.visible=false;state.workers[0].status='home';worker.visible=true;assert.equal(picker.pick({x:0,y:0}).entityId,'wall');
 structure.children[0].visible=false;assert.equal(picker.pick({x:0,y:0}).entityId,null);
});

test('transparent cutout does not occlude a selectable structure',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,1,10);camera.lookAt(0,1,0);camera.updateProjectionMatrix();
 const structure=new THREE.Group();structure.userData.entityId='wall';structure.position.set(0,1,0);structure.add(new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial()));scene.add(structure);
 const texture=new THREE.DataTexture(new Uint8Array([0,0,0,0]),1,1,THREE.RGBAFormat);texture.flipY=false;const prop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:texture,alphaTest:.5,side:THREE.DoubleSide}));prop.userData.nativePropSlot=0;prop.position.set(0,1,5);scene.add(prop);
 const picker=createWebGpuPicker({scene,camera,state:{},animals:{get:()=>null},cropBounds:()=>[]});assert.equal(picker.pick({x:0,y:0}).entityId,'wall');texture.image.data[3]=255;assert.equal(picker.pick({x:0,y:0}).entityId,null);
});

test('reports an incomplete visual scene until all confirmed selectable objects are resident',()=>{
 const state={raid:{animals:[{id:'a',status:'walking'},{id:'gone',status:'gone'}]},workers:[{id:'w',status:'working'},{id:'home',status:'home'}],structures:[{kind:'wall'},{kind:'center'}],villages:[{}],plants:[{alive:true},{alive:false}]};
 const ready={animals:{ready:1},workers:{ready:1},settlements:{walls:1,centers:1,villages:1},crops:{plants:1},terrain:{closed:false,pending:false}};
 assert.equal(webGpuPickerReady(state,ready),true);
 assert.equal(webGpuPickerReady(state,{...ready,biome:{selectableReady:false}}),false);assert.equal(webGpuPickerReady(state,{...ready,biome:{selectableReady:true}}),true);
 for(const [key,empty] of Object.entries({animals:{ready:0},workers:{ready:0},settlements:{walls:0,centers:1,villages:1},crops:{plants:0},terrain:{pending:true}}))assert.equal(webGpuPickerReady(state,{...ready,[key]:empty}),false,key);
 const crates=[{id:'crate'},{id:'delivered',delivered:true},{id:'carried',carrierId:'worker'}];assert.equal(webGpuPickerReady({...state,crates},ready),false);assert.equal(webGpuPickerReady({...state,crates},{...ready,crates:{ready:1}}),true);assert.equal(webGpuPickerReady({...state,structures:[...state.structures,{kind:'unknown'}]},ready),false);
});

test('geometry outside the chunk clip cannot hide a selectable target',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,1,10);camera.lookAt(0,1,0);camera.updateProjectionMatrix();const target=new THREE.Group();target.userData.entityId='wall';target.position.set(0,1,0);target.add(new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial()));scene.add(target);
 const geometry=new THREE.PlaneGeometry(2,2);geometry.setAttribute('wgChunkClip',new THREE.InstancedBufferAttribute(new Float32Array([24,-24,72,24]),4));const prop=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));prop.userData.nativePropSlot=19;prop.position.set(0,1,5);scene.add(prop);const picker=createWebGpuPicker({scene,camera,state:{},animals:{get:()=>null},cropBounds:()=>[]});assert.equal(picker.pick({x:0,y:0}).entityId,'wall');geometry.getAttribute('wgChunkClip').setXYZW(0,-24,-24,24,24);assert.equal(picker.pick({x:0,y:0}).entityId,null);geometry.dispose();prop.material.dispose();target.children[0].geometry.dispose();target.children[0].material.dispose();
});
