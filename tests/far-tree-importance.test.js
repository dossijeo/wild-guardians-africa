import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {treeDensityRank,treeImportanceRank,farDensityFade} from '../tools/experiments/far-impostor-math.js';
import {createFarImpostorPrototype} from '../tools/experiments/far-impostor-prototype.js';
test('large far silhouettes gain deterministic priority while small trees retain the original thinning',()=>{
 const options={start:90,end:240,minimum:.04,band:.04};let small=0,large=0;
 for(let i=0;i<10000;i++){const rank=treeDensityRank('tree-'+i,712),big=treeImportanceRank(rank,40);assert.equal(treeImportanceRank(rank,10),rank);assert.equal(big,treeImportanceRank(rank,40));assert.ok(big<=rank);assert.equal(farDensityFade(90,big,options),1);small+=farDensityFade(240,rank,options);large+=farDensityFade(240,big,options);let previous=0;for(let d=260;d>=80;d--){const fade=farDensityFade(d,big,options);assert.ok(fade>=previous);previous=fade;}}
 assert.ok(small>400&&small<800);assert.ok(large>small&&large<2000,'Priority must still retain a sparse far landscape');
 const rank=treeDensityRank('0:-4:2',712);assert.equal(farDensityFade(168.45803419943124,treeImportanceRank(rank,39.513796470142886),options),1);
 assert.equal(treeImportanceRank(.5,400),.125);assert.equal(treeImportanceRank(.5,40,{maximumBoost:1}),.5);
 for(const [rank,height,options] of [[1,10,{}],[.5,-1,{}],[.5,10,{referenceHeight:0}],[.5,10,{maximumBoost:.5}]])assert.throws(()=>treeImportanceRank(rank,height,options),/Invalid/);
});
test('importance is packed once without changing geometry, transforms, atlas sampling or uploads during camera movement',()=>{
 const source=new THREE.Mesh(new THREE.BoxGeometry(2,4,2),new THREE.MeshBasicMaterial()),texture=new THREE.Texture(),metadata={impostorWidth:2,impostorHeight:4,localBase:[0,0,0]},trees=[{id:'small',x:3,y:2,z:4,yaw:.8,scale:1},{id:'large',x:6,y:2,z:8,yaw:.1,sx:2,sy:10,sz:3}],p=createFarImpostorPrototype(source,texture,metadata,trees,{nativeModels:false});
 const g=p.impostors.geometry,rank=g.attributes.aTreeRank,initial=rank.array.slice();assert.equal(rank.count,2);assert.equal(rank.getX(0),Math.fround(treeDensityRank('small',712)));assert.equal(rank.getX(1),Math.fround(treeImportanceRank(treeDensityRank('large',712),40)));assert.deepEqual([...g.attributes.aTreeBase.array],[3,2,4,6,2,8]);assert.deepEqual([...g.attributes.aTreeScale.array],[1,1,1,2,10,3]);const version=rank.version,shader=p.impostors.material.vertexShader;
 const camera=new THREE.PerspectiveCamera();for(let i=0;i<240;i++){camera.position.set(i,20,80);p.update(camera);}assert.equal(rank.version,version);assert.deepEqual(rank.array,initial);assert.equal(p.impostors.material.vertexShader,shader);p.dispose({disposeTexture:false});source.geometry.dispose();source.material.dispose();texture.dispose();
});
