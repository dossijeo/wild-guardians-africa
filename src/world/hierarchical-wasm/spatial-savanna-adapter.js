import * as THREE from 'three';
import {createSpatialWorld} from './spatial-world.js';

// QA rendering facade. The world authority has no Three.js dependency.
export function createSpatialSavannaPrototype(module){
  const core=createSpatialWorld(module);
  function geometry(){
    const {cx,cz}=core.currentChunk(),ground=core.heights(),rgb=core.colors(),positions=new Float32Array(49*49*3);
    for(let z=0;z<49;z++)for(let x=0;x<49;x++){
      const i=z*49+x;positions[i*3]=cx*48-24+x;positions[i*3+1]=ground[i];positions[i*3+2]=cz*48-24+z;
    }
    const indices=new Uint16Array(48*48*6);
    for(let z=0;z<48;z++)for(let x=0;x<48;x++){
      const i=z*48+x,k=i*6,a=z*49+x,b=a+1,d=a+49,c=d+1;
      indices.set([a,d,b,b,d,c],k);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geo.setAttribute('color',new THREE.BufferAttribute(Float32Array.from(rgb),3));
    geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeVertexNormals();
    return geo;
  }
  function waterGeometry(){
    const positions=Float32Array.from(core.waterTriangles()),geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geo.computeVertexNormals();return geo;
  }
  return Object.assign(core,{geometry,waterGeometry});
}
