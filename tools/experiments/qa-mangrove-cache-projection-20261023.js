import * as THREE from 'three';

export function cacheBytes(size){let bytes=0;for(let side=size+2;side>=1;side=Math.floor(side/2))bytes+=side*side*4;return bytes;}

// Planning experiment only: no texture allocation, draw changes or Engine reads.
// Registered geometry bounds are reused; only the camera projection is sampled.
export class MangroveCacheProjection {
 constructor(world){
  this.world=world;this.entries=[];this.history=new Map();this.frustum=new THREE.Frustum();this.matrix=new THREE.Matrix4();
  this.point=new THREE.Vector3();this.eyePoint=new THREE.Vector3();this.screen=new THREE.Vector3();this.dx=new THREE.Vector3();this.dz=new THREE.Vector3();
  this.rays=Array.from({length:9},()=>new THREE.Vector3());
  world.scene.updateMatrixWorld(true);
  for(const [key,group]of world.chunks){const mesh=group.children.find(o=>o.userData.ground);if(!mesh)continue;mesh.geometry.computeBoundingBox();this.entries.push({key,box:mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)});}
 }
 pixelsPerMetre(point,camera,width,height){
  this.eyePoint.copy(point).applyMatrix4(camera.matrixWorldInverse);if(this.eyePoint.z>=-camera.near)return 0;
  this.screen.copy(point).project(camera);this.dx.copy(point);this.dx.x+=.1;this.dx.project(camera);this.dz.copy(point);this.dz.z+=.1;this.dz.project(camera);
  const xx=(this.dx.x-this.screen.x)*width*5,xy=(this.dx.y-this.screen.y)*height*5,zx=(this.dz.x-this.screen.x)*width*5,zy=(this.dz.y-this.screen.y)*height*5;
  // Largest singular value of the horizontal-plane projection Jacobian.
  const a=xx*xx+xy*xy,b=xx*zx+xy*zy,c=zx*zx+zy*zy;
  return Math.sqrt(Math.max(0,(a+c+Math.sqrt((a-c)**2+4*b*b))/2));
 }
 plan(){
  const started=performance.now(),w=this.world,c=w.camera,width=w.renderer.domElement.width,height=w.renderer.domElement.height;
  c.updateMatrixWorld(true);this.matrix.multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.matrix);
  let index=0;for(const y of [-.95,0,.95])for(const x of [-.95,0,.95])this.rays[index++].set(x,y,.5).unproject(c).sub(c.position).normalize();
  const rows=[];
  for(const entry of this.entries){
   const box=entry.box;if(!this.frustum.intersectsBox(box))continue;const y=(box.min.y+box.max.y)/2;let ppm=0;
   // Visible world-space samples plus intersections of viewport rays ensure
   // a large chunk surrounding the view is not assigned a tiny far LOD.
   for(const x of [box.min.x,(box.min.x+box.max.x)/2,box.max.x])for(const z of [box.min.z,(box.min.z+box.max.z)/2,box.max.z]){this.point.set(x,y,z);if(this.frustum.containsPoint(this.point))ppm=Math.max(ppm,this.pixelsPerMetre(this.point,c,width,height));}
   for(const ray of this.rays){if(Math.abs(ray.y)<1e-6)continue;const t=(y-c.position.y)/ray.y;if(t<=0)continue;this.point.copy(ray).multiplyScalar(t).add(c.position);if(this.point.x<box.min.x||this.point.x>box.max.x||this.point.z<box.min.z||this.point.z>box.max.z)continue;ppm=Math.max(ppm,this.pixelsPerMetre(this.point,c,width,height));}
   // A thin visible sliver may miss all probes. Keep a conservative planned
   // entry for every box intersecting the frustum rather than dropping it.
   if(ppm<=0){box.getCenter(this.point);ppm=Math.max(1,this.pixelsPerMetre(this.point,c,width,height));}
   const old=this.history.get(entry.key),fine=ppm>(old?.flavor==='noise'?45:55),flavor=fine?'noise':'weights',desired=ppm*48;
   let resolution=fine?128:desired<=128?128:desired<=256?256:512;
   if(!fine&&old?.flavor==='weights'){
    if(resolution>old.resolution&&desired<old.resolution*1.2)resolution=old.resolution;
    if(resolution<old.resolution&&desired>old.resolution*.7)resolution=old.resolution;
   }
   const next={key:entry.key,ppm,resolution,flavor,bytes:cacheBytes(resolution)};this.history.set(entry.key,next);rows.push(next);
  }
  return {rows,bytes:rows.reduce((n,r)=>n+r.bytes,0),cpuMs:performance.now()-started,scope:'Projected plan only; excludes transition overlap, hidden retention and driver overhead'};
 }
}
