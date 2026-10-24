import * as THREE from 'three';
import {BlenderGroundDetails} from '/src/rendering/blender-ground-details.js';
import {groundSample417} from '/src/rendering/ground-mask.js';
import {hashCell} from '/src/world/terrain.js';
// QA only: stable authored islands, visibility budget, no simulation membership.
export async function applyMaterialStudy(world){
 if(world.state.biome!=='sabana')return {control:true};
 const gltf=await world.assets.model('/assets/visual-lab/grass-fine-lite.glb');
 gltf.scene.updateMatrixWorld(true);let source;gltf.scene.traverse(o=>{if(o.isMesh&&!source)source=o});
 const d=new BlenderGroundDetails(world.assets,world.scene,'savanna');
 Object.assign(d,{enabled:true,global:true,sculpted:true,detailed:true});
 d.geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);d.material=source.material.clone();d.material.side=THREE.FrontSide;d.material.roughness=.96;
 const field=world.nav.field,state=world.state;
 const blockers=[...state.plants.filter(p=>p.alive!==false),...state.structures.filter(s=>s.status!=='ruined'),...state.villages];
 const allowed=(x,z)=>field.slope(x,z)<=.42&&!field.waterInfo(x,z).inside&&groundSample417(field,field.c.profile??{},x,z)[3]<=.27&&!blockers.some(p=>(x-p.x)**2+(z-p.z)**2<(p.kind==='wall'?2.6:p.kind==='center'?12:p.buildings?90:3.6));
 const candidates=[];
 for(const key of world.chunks.keys()){
  const [cx,cz]=key.split(',').map(Number);const anchors=d.sampleChunk(cx,cz,field,state);
  for(const a of anchors)for(const [j,[dx,dz]] of [[0,0],[1.3,.6],[-1.6,.5],[.2,-1.5],[-.6,-.6]].entries()){
   const angle=a.bits/4294967296*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle),x=a.x+dx*c-dz*s,z=a.z+dx*s+dz*c;
   if(!allowed(x,z))continue;
   candidates.push({x,z,y:field.surface(x,z)+.012,bits:hashCell(field.seed,a.bits,j,6159)});
  }
 }
 d.mesh=new THREE.InstancedMesh(d.geometry,d.material,128);d.mesh.name='qa-visible-grass-fine-lite';d.mesh.count=0;d.mesh.receiveShadow=true;d.mesh.frustumCulled=false;world.scene.add(d.mesh);
 d.chunks.set('qa-resident',candidates);world.groundDetails.dispose();world.groundDetails=d;
 const old=world.scene.onBeforeRender,frustum=new THREE.Frustum(),vp=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),1.2),dummy=new THREE.Object3D();let signature='';
 world.scene.onBeforeRender=function(...args){
  old?.apply(this,args);const camera=world.camera;
  vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);const key=vp.elements.join(',')+'|'+d.mesh.matrixWorld.elements.join(',');if(key===signature)return;signature=key;frustum.setFromProjectionMatrix(vp);
  const visible=candidates.filter(p=>{sphere.center.set(p.x,p.y+.35,p.z).applyMatrix4(d.mesh.matrixWorld);return sphere.center.distanceToSquared(camera.position)<120**2&&frustum.intersectsSphere(sphere)}).sort((a,b)=>(a.x-(camera.position.x-world.scene.position.x))**2+(a.z-(camera.position.z-world.scene.position.z))**2-((b.x-(camera.position.x-world.scene.position.x))**2+(b.z-(camera.position.z-world.scene.position.z))**2)).slice(0,128);
  visible.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=p.bits/4294967296*Math.PI*2;dummy.scale.setScalar(.85+((p.bits>>>14)&63)/63*.3);dummy.updateMatrix();d.mesh.setMatrixAt(i,dummy.matrix)});
  d.mesh.count=d.count=visible.length;d.mesh.instanceMatrix.needsUpdate=true;
 };
 return {candidates:candidates.length,maxVisible:128,trianglesPerInstance:720,maxSubmittedTriangles:92160,newTextures:0,originalModelsUntouched:true,limitations:'QA resident snapshot; occupancy updates and streaming not implemented; hard distance cutoff'};
}
