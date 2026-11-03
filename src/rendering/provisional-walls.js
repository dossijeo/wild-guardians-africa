import * as THREE from 'three';
import {wallStroke} from '../world/wall-layout.js';

// A preview is a render-only instance; it is never registered with navigation,
// picking, the camera obstacle index, or the authoritative simulation.
export class ProvisionalWalls {
 constructor(scene,prototypes,ground,{now=()=>performance.now()}={}){this.scene=scene;this.prototypes=prototypes;this.ground=ground;this.now=now;this.entries=new Map();}
 beginStroke(id,material,points,structures,maxPieces){
  const slots=wallStroke(points,structures,{maxPieces});
  return this.begin(id,material,slots.map(s=>({x:s.x,z:s.z,yaw:-s.angle,scaleX:s.scaleX})));
 }
 begin(id,material,pieces,{gate=false}={}){
  const prototype=this.prototypes[`${material}_${gate?'puerta':'intacto'}`];if(!prototype||!pieces.length)return false;
  this.remove(id);const paint=new THREE.MeshBasicMaterial({color:0x9cb67b,transparent:true,opacity:.5,depthWrite:false,side:prototype.material.side,toneMapped:false});
  const mesh=new THREE.InstancedMesh(prototype.geometry,paint,pieces.length),dummy=new THREE.Object3D();mesh.frustumCulled=false;
  const scale=gate?({adobe:1.4,piedra:1.4,reforzado:1.6}[material]??1):1;
  pieces.forEach((piece,i)=>{dummy.position.set(piece.x,this.ground(piece.x,piece.z)+.025,piece.z);dummy.rotation.set(0,piece.yaw??0,0);dummy.scale.set((piece.scaleX??1)*scale,scale,scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.instanceMatrix.needsUpdate=true;this.scene.add(mesh);this.entries.set(id,{mesh,paint});return true;
 }
 update(){const opacity=.48+.1*Math.sin(this.now()*.004);for(const {paint} of this.entries.values())paint.opacity=opacity;}
 remove(id){const entry=this.entries.get(id);if(!entry)return;this.scene.remove(entry.mesh);entry.mesh.dispose();entry.paint.dispose();this.entries.delete(id);}
 dispose(){for(const id of this.entries.keys())this.remove(id);}
}
