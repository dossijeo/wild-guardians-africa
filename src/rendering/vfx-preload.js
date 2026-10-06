import {Group,Mesh} from 'three';

// NativeVfx recipes are shared by every composition. One isolated composition
// covers rigid particles, sprites, ribbons and their authored depth material.
// This only advances its private VFX kernel, never the game simulation.
export class VfxGpuPreload extends Group {
  constructor(library,pipeline,camera,world,position){
    super();this.effect=library.create('warthog',pipeline);this.add(this.effect);
    try{
      this.position.copy(position);this.effect.seek(1.4);this.effect.prepare(camera,world);
      for(const light of this.effect.localLights)light.visible=false;
      // compileAsync traverses hidden objects too. Include the authored shadow
      // recipe explicitly without drawing an extra depth mesh in the color pass.
      const depth=new Mesh(this.effect.rigids.values().next().value.geometry,this.effect.depthMaterial);
      depth.visible=false;this.add(depth);
    }catch(error){this.dispose();throw error;}
  }
  dispose({retainPrograms=false}={}){this.removeFromParent();this.effect.dispose({retainMaterials:retainPrograms});this.clear();}
}
