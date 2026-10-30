import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import sharp from 'sharp';
import {Group,OrthographicCamera,PerspectiveCamera,Vector3,AnimationMixer} from 'three';
import {actorAsset} from './helpers/actor-geometry.js';
import {CharacterLod,projectedCharacterPixels} from '../src/rendering/character-lod.js';
const entries=JSON.parse(fs.readFileSync('tests/fixtures/character-lod-sources.json'));
for(const entry of entries)test(entry.id+' LOD budgets, skin ownership and lifecycle',async()=>{
 const original=await actorAsset(entry.source),low=await actorAsset('public'+entry.url),root=new Group();root.add(original.scene);let triangles=0;low.scene.traverse(m=>{if(m.isMesh)triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});assert.ok(triangles>=1000&&triangles<=2000,`${triangles} triangles`);
 const controller=new CharacterLod(original.scene,low.scene),camera=new OrthographicCamera(-50,50,50,-50,.1,100);camera.position.z=10;camera.updateMatrixWorld();const mixer=new AnimationMixer(original.scene);
 for(const clip of original.animations){mixer.stopAllAction();mixer.clipAction(clip).play();controller.beforePose();mixer.setTime(clip.duration*.41);controller.update(camera,900,true);root.updateMatrixWorld(true);controller.root.traverse(m=>{if(!m.isSkinnedMesh)return;for(const b of m.skeleton.bones)assert.equal(b,original.scene.getObjectByName(b.name));const p=new Vector3();for(let i=0;i<m.geometry.attributes.position.count;i+=31){m.getVertexPosition(i,p);assert.ok(Number.isFinite(p.length()));}});}
 // Blender reparents skinned surfaces to the armature; their world placement
 // is governed by bind matrices and the shared original bones, not mesh TRS.
 for(const {node,source} of controller.links){if(node.isSkinnedMesh)continue;const delta=Math.max(...node.matrixWorld.elements.map((v,i)=>Math.abs(v-source.matrixWorld.elements[i])));assert.ok(delta<1e-3,`${entry.id} ${node.name}: world transform ${delta}`);}
 controller.beforePose();controller.update(camera,900,false);const beforeScale=controller.pixels;original.scene.scale.multiplyScalar(2);controller.beforePose();controller.update(camera,900,false);assert.ok(Math.abs(controller.pixels/beforeScale-2)<1e-6);
 controller.beforePose();controller.update(camera,900,false);for(const d of controller.draws)assert.equal(d.mesh.visible,d.visible);controller.dispose();assert.equal(root.children.length,1);
 const bytes=fs.readFileSync('public'+entry.url),size=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+size)),bin=bytes.subarray(28+size);for(const image of g.images??[]){const view=g.bufferViews[image.bufferView],meta=await sharp(bin.subarray(view.byteOffset,view.byteOffset+view.byteLength)).metadata();assert.ok(meta.width<=256&&meta.height<=256,`${meta.width}x${meta.height}`);}
});
test('screen-space selection respects zoom and perspective depth',()=>{const o=new OrthographicCamera(-10,10,10,-10);assert.equal(projectedCharacterPixels(o,2,new Vector3(),900),90);o.zoom=2;assert.equal(projectedCharacterPixels(o,2,new Vector3(),900),180);const p=new PerspectiveCamera(60,1,.1,100);p.updateMatrixWorld();assert.ok(projectedCharacterPixels(p,2,new Vector3(0,0,-10),900)>projectedCharacterPixels(p,2,new Vector3(0,0,-20),900));});

test('LOD surface metadata exists before scene registry observes insertion',async()=>{
 const original=await actorAsset(entries[1].source),low=await actorAsset('public'+entries[1].url),root=new Group();root.add(original.scene);let observed=0;
 root.addEventListener('childadded',({child})=>child.traverse(m=>{if(m.isMesh){observed++;assert.equal(m.material.userData.beastSurface,true);}}));
 const controller=new CharacterLod(original.scene,low.scene,{prepareRoot:lod=>lod.traverse(m=>{if(m.isMesh)for(const material of Array.isArray(m.material)?m.material:[m.material])material.userData.beastSurface=true;})});assert.ok(observed>0);controller.dispose();
});
