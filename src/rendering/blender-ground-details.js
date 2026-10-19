import * as THREE from 'three';
import {groundSample417} from './ground-mask.js';
import {hashCell} from '../world/terrain.js';

const nameFor={savanna:'savanna',grand_river:'grand-river',mangrove:'mangrove',volcanoes:'volcanoes',canyons:'canyons',desert:'desert'};
const d2=(x,z,point)=>(x-point.x)**2+(z-point.z)**2;

// A visual-only experiment. Blender authors the meshes; JS only chooses places.
// Candidate locations are stable per chunk, and the regular resident-chunk
// lifecycle provides culling without one Object3D per tuft.
export class BlenderGroundDetails{
  constructor(assets,scene,biome){this.assets=assets;this.scene=scene;this.biome=biome;this.enabled=biome==='savanna';const variant=new URLSearchParams(globalThis.location?.search??'').get('visualLab');this.polyHaven=['ph-grass','layer-grass'].includes(variant);this.count=0;this.chunks=new Map();}
  async load(){
    if(!this.enabled)return;
    const gltf=await this.assets.model(this.polyHaven?'/assets/visual-lab/savanna-ph-compact.glb':`/assets/visual-lab/${nameFor[this.biome]}-ground-detail.glb`);
    let source;gltf.scene.traverse(o=>{if(o.isMesh&&!source)source=o;});
    if(!source?.geometry||(!this.polyHaven&&!source.geometry.getAttribute('color')))throw Error('Blender ground detail missing geometry or vertex colours');
    this.geometry=source.geometry;
    this.material=source.material;
    this.material.side=THREE.DoubleSide;
    this.material.roughness=.96;
    this.material.metalness=0;
    if(this.polyHaven){this.material.alphaTest=.37;this.material.transparent=false;this.material.depthWrite=true;this.material.needsUpdate=true;}
    this.mesh=new THREE.InstancedMesh(this.geometry,this.material,1);
    this.mesh.name='visual-lab-blender-ground-detail';
    this.mesh.userData.visualGroundDetails=true;
    this.mesh.castShadow=false;
    this.mesh.receiveShadow=true;
    this.mesh.frustumCulled=false;
    this.mesh.count=0;
    this.scene.add(this.mesh);
  }
  chunk(cx,cz,field,state){
    if(!this.geometry)return;
    const positions=[],seed=field.seed,originX=cx*48,originZ=cz*48,key=cx+','+cz;
    const blockers=[...state.plants.filter(p=>p.alive!==false),...state.structures.filter(s=>s.status!=='ruined'),...state.villages]
      .filter(p=>Math.abs(p.x-originX)<31&&Math.abs(p.z-originZ)<31);
    for(let iz=0;iz<24;iz++)for(let ix=0;ix<24;ix++){
      const bits=hashCell(seed,cx*24+ix,cz*24+iz,6141),chance=(bits>>>0)/4294967296;
      const x=originX-24+ix*2+(bits&1023)/1023*.9+.6;
      const z=originZ-24+iz*2+((bits>>>10)&1023)/1023*.9+.6;
      const [cover,meso,moisture,wear]=groundSample417(field,field.c.profile??{},x,z);
      const patch=Math.max(0,Math.min(1,(meso-.39)/.26));
      const clump=(hashCell(seed,Math.floor(x/7),Math.floor(z/7),6142)>>>0)/4294967296;
      const nearCrop=state.plants.some(p=>p.alive!==false&&d2(x,z,p)>4&&d2(x,z,p)<42);
      const cluster=this.polyHaven?(clump>.50?1.65:.30)*(nearCrop?1.32:1):1;
      const density=Math.max(0,Math.min(.4,.04+.31*cover*patch+.09*(moisture-.5)))*(this.polyHaven?.30:1)*cluster;
      if(chance>density||wear>.27||field.slope(x,z)>.42||field.waterInfo(x,z).inside)continue;
      if(blockers.some(p=>d2(x,z,p)<(p.kind==='wall'?1.45:p.kind==='center'?9:p.buildings?80:1.8)))continue;
      positions.push({x,z,bits,y:field.surface(x,z)+.012});
    }
    this.chunks.set(key,positions);
    this.rebuild();
  }
  rebuild(){
    if(!this.mesh)return;
    const positions=[...this.chunks.values()].flat(),needed=positions.length;
    if(needed>this.mesh.instanceMatrix.count){
      const former=this.mesh;
      this.scene.remove(former);former.dispose();
      this.mesh=new THREE.InstancedMesh(this.geometry,this.material,2**Math.ceil(Math.log2(needed)));
      Object.assign(this.mesh,{name:'visual-lab-blender-ground-detail',castShadow:false,receiveShadow:true,frustumCulled:false});
      this.mesh.userData.visualGroundDetails=true;
      this.scene.add(this.mesh);
    }
    const dummy=new THREE.Object3D();
    positions.forEach(({x,z,bits,y},i)=>{
      dummy.position.set(x,y,z);
      dummy.rotation.y=(bits>>>20)/4096*Math.PI*2;
      const scale=(1.25+((bits>>>14)&63)/63*.65)*(this.polyHaven?3.1:1);
      dummy.scale.setScalar(scale);dummy.updateMatrix();this.mesh.setMatrixAt(i,dummy.matrix);
    });
    this.mesh.count=needed;this.mesh.instanceMatrix.needsUpdate=true;
    this.count=needed;
  }
  release(key){
    if(this.chunks.delete(key))this.rebuild();
  }
  dispose(){if(this.mesh){this.scene.remove(this.mesh);this.mesh.dispose();this.mesh=null;}this.chunks.clear();this.count=0;}
}
