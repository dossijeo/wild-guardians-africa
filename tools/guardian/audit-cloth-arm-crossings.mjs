import fs from 'node:fs';
import * as THREE from 'three';
import {actorAsset} from '../../tests/helpers/actor-geometry.js';
import {GuardianSummons} from '../../src/rendering/guardian-summons.js';
import {sampleMeshSurfaceCrossings} from '../../tests/browser/guardian-skin-crossings.js';
// Offline diagnostic. Uses actual runtime pose, including reach and spell wind.
const asset=await actorAsset('public/content/guardian/guardian.glb');
const world={toon:{uniforms:{uLightDir:{value:new THREE.Vector3(1,1,0)},uNight:{value:0}}},state:{events:[],elapsed:1,time:150},scene:new THREE.Scene(),assets:{model:async()=>asset},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
const summons=new GuardianSummons(world);await summons.ready;
const skin=summons.slots[0].model.getObjectByName('Guardian'),g=skin.geometry;
const classified=Array.from({length:g.attributes.position.count},(_,i)=>{
 const sums={cloth:0,arms:0};for(let k=0;k<4;k++){const name=skin.skeleton.bones[g.attributes.skinIndex.getComponent(i,k)].name,w=g.attributes.skinWeight.getComponent(i,k);if(/^Mantle/.test(name))sums.cloth+=w;if(/^(Shoulder|Arm|Forearm|Hand)[LR]$/.test(name))sums.arms+=w;}
 return sums.cloth>=.6?'cloth':sums.arms>=.6?'arms':null;
});
const partitions={cloth:[],arms:[]};for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(k=>g.index.getX(i+k)),kind=classified[ids[0]];if(kind&&ids.every(j=>classified[j]===kind))partitions[kind].push(...ids);}
const position=new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3),3),material=new THREE.MeshBasicMaterial();
const meshes=Object.fromEntries(Object.entries(partitions).map(([kind,indices])=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',position);geometry.setIndex(indices);return [kind,new THREE.Mesh(geometry,material)];}));
const rows=[],point=new THREE.Vector3();
const targets=[{name:'level',x:0,y:1,z:0},{name:'low-side',x:5,y:.2,z:-3},{name:'high-side',x:-2,y:4,z:3},{name:'close-high',x:2,y:3,z:.5}];
for(const contact of targets)for(const kind of ['growth','multiply','shield','attack']){
 summons.clear();world.state.elapsed+=3;summons.update();const at=world.state.elapsed;
 world.state.events.push({type:'SpellActivated',kind,x:contact.x,z:contact.z,presentation:{origin:{x:3,y:1,z:0},contact,elapsed:at}});
 for(let frame=0;frame<=42;frame++){
  const age=frame/20;world.state.elapsed=at+age;summons.update();skin.updateWorldMatrix(true,false);skin.skeleton.update();
  for(let i=0;i<position.count;i++){skin.getVertexPosition(i,point).applyMatrix4(skin.matrixWorld);position.setXYZ(i,point.x,point.y,point.z);}
  const result=sampleMeshSurfaceCrossings([meshes.cloth],[meshes.arms],8);rows.push({target:contact.name,kind,age,...result});
 }
}
const report={scope:'Dominant skin-weight partitions, all three vertices >=0.6 within cloth or arm family. Mixed/boundary triangles excluded. Strict transverse crossings only; no containment/coplanar guarantee. Four target directions/heights; 20 Hz samples, not continuous collision detection.',targets,triangles:Object.fromEntries(Object.entries(partitions).map(([k,v])=>[k,v.length/3])),rows};
const output=process.argv[2]??'C:/tmp/guardian-cloth-crossings.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,triangles:report.triangles,samples:rows.length,flagged:rows.filter(r=>r.points.length).map(r=>({target:r.target,kind:r.kind,age:r.age,points:r.points.length}))}));
summons.dispose();for(const mesh of Object.values(meshes))mesh.geometry.dispose();material.dispose();
