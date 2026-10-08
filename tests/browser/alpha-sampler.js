import * as THREE from 'three';

// QA hypothesis only: both native and derived depth materials share these maps.
// The experiment changes filtering (and therefore appearance), never texels.
export class AlphaSamplerExperiment {
 constructor(world,mode){
  if(!['linear','nearest'].includes(mode))throw Error('Unknown QA alpha sampler');
  this.mode=mode;this.saved=new Map();
  world.scene.traverse(object=>{
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material?.alphaTest||!material.map||this.saved.has(material.map))continue;
    const map=material.map;this.saved.set(map,{minFilter:map.minFilter,magFilter:map.magFilter});
    map.minFilter=mode==='linear'?THREE.LinearFilter:THREE.NearestFilter;
    map.magFilter=map.minFilter;map.needsUpdate=true;
   }
  });
 }
 report(){return {mode:this.mode,scope:'QA filtering changes appearance in both routes; not visual acceptance or GPU benchmark.',textures:[...this.saved].map(([map,original])=>({uuid:map.uuid,original,minFilter:map.minFilter,magFilter:map.magFilter}))};}
 dispose(){for(const [map,original]of this.saved){Object.assign(map,original);map.needsUpdate=true;}this.saved.clear();}
}
