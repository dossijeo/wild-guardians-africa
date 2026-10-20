import * as THREE from 'three';
import {observeGameEvents} from '/src/simulation/game.js';
import {BlenderGroundDetails,markGroundDetailEvent} from '/src/rendering/blender-ground-details.js';
import {footprintDistance} from '/src/world/footprints.js';
import {residentWearSampler} from './qa-ground-detail-mask.js';
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
 // Consume the renderer's resident mask, including native campaign clearings.
 const sample=(cx,cz)=>{
 const wear=residentWearSampler(world,cx,cz);
 const blockers=[...state.plants.filter(p=>p.alive!==false),...state.structures.filter(s=>s.status!=='ruined'),...state.villages];
 const obstacles=(world.nav.obstacles??[]).filter(o=>o.kind!=='shield');
 const occupied=(x,z)=>obstacles.some(o=>o.footprint?footprintDistance(o.footprint,x,z)<.65:Math.hypot(x-o.x,z-o.z)<(o.radius??0)+.65);
 const allowed=(x,z)=>!occupied(x,z)&&field.slope(x,z)<=.42&&!field.waterInfo(x,z).inside&&wear(x,z)<=.27&&!blockers.some(p=>(x-p.x)**2+(z-p.z)**2<(p.kind==='wall'?2.6:p.kind==='center'?12:p.buildings?90:3.6));
 const candidates=[];

  for(let ax=cx*48-21;ax<cx*48+24;ax+=6)for(let az=cz*48-21;az<cz*48+24;az+=6){
   const bits=hashCell(field.seed,(ax-3)/6,(az-3)/6,7191);if(bits/4294967296>.55)continue;
   const angle=bits/4294967296*Math.PI*2,anchorX=ax+((bits>>>8)&255)/255*2-1,anchorZ=az+((bits>>>16)&255)/255*2-1;
   for(let j=0;j<7;j++){
    const theta=angle+j*Math.PI/3,r=j===0?0:1.15,x=anchorX+Math.cos(theta)*r,z=anchorZ+Math.sin(theta)*r;
    if(!allowed(x,z))continue;
    candidates.push({x,z,anchorX,anchorZ,y:field.surface(x,z)+.012,bits:hashCell(field.seed,bits,j,7192)});
   }
  }
 return candidates;
 };
 d.mesh=new THREE.InstancedMesh(d.geometry,d.material,192);d.mesh.name='qa-visible-grass-clumps';d.mesh.count=0;d.mesh.receiveShadow=true;d.mesh.frustumCulled=false;world.scene.add(d.mesh);
 let revision=0,candidates=[];
 d.sampleChunk=(cx,cz)=>sample(cx,cz);
 d.rebuild=()=>{candidates=[...d.chunks.values()].flat();revision++;};
 world.groundDetails.dispose();world.groundDetails=d;d.maxVisible=192;
 for(const key of world.chunks.keys()){const [cx,cz]=key.split(',').map(Number);d.chunk(cx,cz,field,state);}
 d.releaseEvents=observeGameEvents(state,event=>markGroundDetailEvent(d,state,event,id=>world.objects.get(id)?.position));
 const old=world.scene.onBeforeRender,frustum=new THREE.Frustum(),vp=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),1.2),dummy=new THREE.Object3D();
 const active=new Map();let signature='',desired=new Map(),last=performance.now(),first=true;
 const id=p=>p.x+','+p.z;
 const hook=function(...args){
  old?.apply(this,args);const camera=world.camera,now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
  vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  const key=revision+'|'+vp.elements.join(',')+'|'+d.mesh.matrixWorld.elements.join(',');
  if(key!==signature){
   signature=key;frustum.setFromProjectionMatrix(vp);
   const cx=camera.position.x-world.scene.position.x,cz=camera.position.z-world.scene.position.z;
   const visible=[];
   for(const p of candidates){
    sphere.center.set(p.x,p.y+.35,p.z).applyMatrix4(d.mesh.matrixWorld);
    if(sphere.center.distanceToSquared(camera.position)>=85**2||!frustum.intersectsSphere(sphere))continue;
    const key=id(p),score=Math.hypot(p.anchorX-cx,p.anchorZ-cz)-(desired.has(key)?4:0);
    visible.push({key,p,score});
   }
   visible.sort((a,b)=>a.score-b.score);
   desired=new Map(visible.slice(0,192).map(({key,p})=>[key,p]));
  }
  let changed=false;
  for(const [key,item] of active){const next=Math.max(0,Math.min(1,item.scale+(desired.has(key)?1:-1)*dt/.3));changed||=next!==item.scale;item.scale=next;if(next===0&&!desired.has(key))active.delete(key);}
  for(const [key,p] of desired){if(active.size>=192)break;if(!active.has(key)){active.set(key,{p,scale:first?1:0});changed=true;}}
  if(changed||first){let i=0;for(const {p,scale} of active.values()){dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=p.bits/4294967296*Math.PI*2;const smooth=scale*scale*(3-2*scale);dummy.scale.setScalar((.85+((p.bits>>>14)&63)/63*.3)*smooth);dummy.updateMatrix();d.mesh.setMatrixAt(i++,dummy.matrix);}d.mesh.count=d.count=active.size;d.mesh.instanceMatrix.needsUpdate=true;}
  first=false;d.qaActive=[...active].map(([key,v])=>({id:key,scale:v.scale}));
 };
 world.scene.onBeforeRender=hook;
 const dispose=d.dispose.bind(d);let disposed=false;
 d.dispose=()=>{if(disposed)return;disposed=true;if(world.scene.onBeforeRender===hook)world.scene.onBeforeRender=old;dispose();d.geometry.dispose();d.material.dispose();active.clear();desired.clear();};
 return {maxVisible:192,trianglesPerInstance:360,transitionSeconds:.3,hysteresisMeters:4,streaming:true,occupancyEvents:true,limitations:'QA only; scale transitions, no LOD; campaign and other biomes pending'};
}
