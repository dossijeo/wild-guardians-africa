import * as THREE from 'three';

export class ProvisionalBuildings {
 constructor(scene,templates,ground,{now=()=>performance.now()}={}){this.scene=scene;this.templates=templates;this.ground=ground;this.now=now;this.entries=new Map();}
 begin(id,culture,x,z,yaw=0){
  const template=this.templates.get(culture);if(!template)return false;
  this.remove(id);const material=new THREE.MeshBasicMaterial({map:template.material.map,color:0xc9e6bc,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(template.body,material);mesh.position.set(x,this.ground(x,z)+.025,z);mesh.rotation.y=yaw;mesh.scale.setScalar(template.scale);this.scene.add(mesh);this.entries.set(id,{mesh,material});return true;
 }
 update(){const opacity=.48+.1*Math.sin(this.now()*.004);for(const {material} of this.entries.values())material.opacity=opacity;}
 remove(id){const entry=this.entries.get(id);if(!entry)return;this.scene.remove(entry.mesh);entry.material.dispose();this.entries.delete(id);}
 dispose(){for(const id of this.entries.keys())this.remove(id);}
}
