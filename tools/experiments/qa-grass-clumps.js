import * as THREE from 'three';
import {BlenderGroundDetails} from '/src/rendering/blender-ground-details.js';
import {groundSample417} from '/src/rendering/ground-mask.js';
import {hashCell} from '/src/world/terrain.js';
// QA only: stable authored islands, visibility budget, no simulation membership.
export async function applyMaterialStudy(world){
 if(!['sabana','gran-rio'].includes(world.state.biome))return {control:true};
 const gltf=await world.assets.model('/assets/visual-lab/grass-clumps.glb');
 gltf.scene.updateMatrixWorld(true);let source;gltf.scene.traverse(o=>{if(o.isMesh&&!source)source=o});
 const d=new BlenderGroundDetails(world.assets,world.scene,world.nav.field.c.biome);
 Object.assign(d,{enabled:true,global:true,sculpted:true,detailed:true});
 d.geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);d.material=source.material.clone();d.material.side=THREE.FrontSide;d.material.roughness=.96;if(world.state.biome==='gran-rio')d.material.color.setRGB(.42,1.,.55);
 d.geometry.computeBoundingBox();d.material.userData.artBounds={min:d.geometry.boundingBox.min.clone(),size:d.geometry.boundingBox.getSize(new THREE.Vector3()),crown:.43};
 const field=world.nav.field,state=world.state;
 const blockers=[...state.plants.filter(p=>p.alive!==false),...state.structures.filter(s=>s.status!=='ruined'),...state.villages];
 const allowed=(x,z)=>field.slope(x,z)<=.42&&!field.waterInfo(x,z).inside&&groundSample417(field,field.c.profile??{},x,z)[3]<=.27&&!blockers.some(p=>(x-p.x)**2+(z-p.z)**2<(p.kind==='wall'?2.6:p.kind==='center'?12:p.buildings?90:3.6));
 const candidates=[];
 for(const key of world.chunks.keys()){
  const [cx,cz]=key.split(',').map(Number);
  for(let ax=cx*48-21;ax<cx*48+24;ax+=6)for(let az=cz*48-21;az<cz*48+24;az+=6){
   const bits=hashCell(field.seed,(ax-3)/6,(az-3)/6,7191);if(bits/4294967296>.55)continue;
   const angle=bits/4294967296*Math.PI*2,anchorX=ax+((bits>>>8)&255)/255*2-1,anchorZ=az+((bits>>>16)&255)/255*2-1;
   for(let j=0;j<7;j++){
    const theta=angle+j*Math.PI/3,r=j===0?0:1.15,x=anchorX+Math.cos(theta)*r,z=anchorZ+Math.sin(theta)*r;
    if(!allowed(x,z))continue;
    candidates.push({x,z,anchorX,anchorZ,y:field.surface(x,z)+.012,bits:hashCell(field.seed,bits,j,7192)});
   }
  }
 }
 d.mesh=new THREE.InstancedMesh(d.geometry,d.material,192);d.mesh.name='qa-visible-grass-clumps';d.mesh.count=0;d.mesh.receiveShadow=true;d.mesh.frustumCulled=false;world.scene.add(d.mesh);
 // Resident snapshot only: runtime chunk callbacks must not rebuild this bounded mesh.
 d.chunk=()=>{};d.release=()=>{};d.flush=()=>0;d.rebuild=()=>{};d.maxVisible=192;
 d.chunks.set('qa-resident',candidates);world.groundDetails.dispose();world.groundDetails=d;
 const old=world.scene.onBeforeRender,frustum=new THREE.Frustum(),vp=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),1.2),dummy=new THREE.Object3D();let signature='';
 world.scene.onBeforeRender=function(...args){
  old?.apply(this,args);const camera=world.camera;
  vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);const key=vp.elements.join(',')+'|'+d.mesh.matrixWorld.elements.join(',');if(key===signature)return;signature=key;frustum.setFromProjectionMatrix(vp);
  const visible=candidates.filter(p=>{sphere.center.set(p.x,p.y+.35,p.z).applyMatrix4(d.mesh.matrixWorld);return sphere.center.distanceToSquared(camera.position)<85**2&&frustum.intersectsSphere(sphere)}).sort((a,b)=>(a.anchorX-(camera.position.x-world.scene.position.x))**2+(a.anchorZ-(camera.position.z-world.scene.position.z))**2-((b.anchorX-(camera.position.x-world.scene.position.x))**2+(b.anchorZ-(camera.position.z-world.scene.position.z))**2)).slice(0,192);
  visible.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=p.bits/4294967296*Math.PI*2;dummy.scale.setScalar(.85+((p.bits>>>14)&63)/63*.3);dummy.updateMatrix();d.mesh.setMatrixAt(i,dummy.matrix)});
  d.mesh.count=d.count=visible.length;d.mesh.instanceMatrix.needsUpdate=true;
 };
 return {candidates:candidates.length,maxVisible:192,trianglesPerInstance:360,maxSubmittedTriangles:69120,newTextures:0,originalModelsUntouched:true,limitations:'QA resident snapshot; occupancy updates and streaming not implemented; hard distance cutoff'};
}
