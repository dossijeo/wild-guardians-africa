import {Group,PlaneGeometry,Mesh,InstancedMesh} from 'three';

// Borrow the permanent fluid material so its program references survive this
// temporary geometry. A dry opening view must not defer the first water/lava
// color and VFX-depth variants until a wet chunk becomes visible during play.
export class FluidGpuPreload extends Group {
 constructor(material,{instanced=false}={}){
  super();this.name='fluid-gpu-preload';this.geometry=new PlaneGeometry(1,1);this.geometry.rotateX(-Math.PI/2);
  this.add(new Mesh(this.geometry,material));
  if(instanced)this.add(new InstancedMesh(this.geometry,material,1));
  for(const mesh of this.children){mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;}
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.removeFromParent();
  for(const mesh of this.children)if(mesh.isInstancedMesh)mesh.dispose();
  this.clear();this.geometry.dispose();
 }
}
