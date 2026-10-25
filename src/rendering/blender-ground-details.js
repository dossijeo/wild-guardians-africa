import {canyonBankCoverEnabled,CANYON_BANK_COVER_PATH,canyonBankDensity,canyonBankFootprintFits} from './canyon-bank-cover.js';
import * as THREE from 'three';
import {groundSample417} from './ground-mask.js';
import {hashCell} from '../world/terrain.js';

const nameFor={savanna:'savanna',grand_river:'grand-river',mangrove:'mangrove',volcanoes:'volcanoes',canyons:'canyons',desert:'desert'};
const globalScale={savanna:2.25,grand_river:1.9,mangrove:2.0,volcanoes:1.85,canyons:2.0,desert:1.8};
const d2=(x,z,point)=>(x-point.x)**2+(z-point.z)**2;
function globalDensity(biome,cover,patch,moisture,meso){
  switch(biome){
    case 'savanna':return (.04+.31*cover*patch+.09*(moisture-.5))*.30;
    case 'grand_river':return (.014+.095*cover*patch)*(.65+.35*moisture);
    case 'mangrove':return (.006+.10*cover*patch)*(1-.25*moisture);
    case 'volcanoes':return .004+.040*meso*patch;
    case 'canyons':return .006+.045*meso*patch;
    case 'desert':return .003+.025*meso*patch;
    default:return 0;
  }
}

// Confirmed game events are the only source of occupancy invalidations. Saved
// event history is never replayed: loading a scene samples the restored state.
export function markGroundDetailEvent(details,state,event,previousPosition=()=>null){
  if(!details?.enabled)return;
  const mark=point=>{if(point)details.markDirtyAt(point.x,point.z);};
  if(['CropPlaced','CropPicked','CropDestroyed'].includes(event.type)){
    mark(state.plants.find(plant=>plant.id===(event.targetId??event.cropId)));
  }else if(event.type==='PlacementCommitted'){
    mark(state.structures.find(structure=>structure.id===event.targetId)??event.presentation);
  }else if(event.type==='WallChainBuilt'){
    const first=state.structures.findIndex(structure=>structure.id===event.targetId);
    if(first<0)mark(event.presentation);
    else for(const structure of state.structures.slice(first,first+event.count))mark(structure);
  }else if(event.type==='WallRemoved'){
    mark(previousPosition(event.targetId)??state.structures.find(structure=>structure.id===event.replacedBy));
  }else if(event.type==='StructureRuined'||event.type==='RepairApplied'&&event.repair?.previousStatus==='ruined'){
    mark(state.structures.find(structure=>structure.id===event.targetId));
  }else if(event.type==='VillageFounded')mark(event);
}

// A visual-only experiment. Blender authors the meshes; JS only chooses places.
// Candidate locations are stable per chunk, and the regular resident-chunk
// lifecycle provides culling without one Object3D per tuft.
export class BlenderGroundDetails{
  constructor(assets,scene,biome,{visualSearch=globalThis.location?.search??''}={}){this.assets=assets;this.scene=scene;this.biome=biome;const variant=new URLSearchParams(visualSearch).get('visualLab');this.beds=variant==='global-grass-beds'&&biome==='savanna';this.bankCover=canyonBankCoverEnabled(biome,visualSearch);this.global=this.bankCover||['global-grass','global-grass-beds'].includes(variant);this.enabled=this.global||biome==='savanna';this.polyHaven=['ph-grass','layer-grass'].includes(variant);this.sculpted=this.global||variant==='layer-grass-sculpted';this.detailed=this.polyHaven||this.sculpted;this.count=0;this.chunks=new Map();this.dirtyChunks=new Set();this.refreshStats={batches:0,chunks:0,candidates:0,totalMs:0,maxMs:0};}
  async load(){
    if(!this.enabled)return;
    const gltf=await this.assets.model(this.bankCover?CANYON_BANK_COVER_PATH:this.beds?'/assets/visual-lab/savanna-low-grass-beds.glb':this.sculpted?`/assets/visual-lab/${this.biome==='savanna'?'savanna':nameFor[this.biome]}-sculpted-ground-detail.glb`:this.polyHaven?(import.meta.env?.PROD?'/assets/visual-lab/savanna-ground-detail.glb':'/assets/visual-lab/savanna-ph-compact.glb'):`/assets/visual-lab/${nameFor[this.biome]}-ground-detail.glb`);
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
    const key=cx+','+cz;
    this.chunks.set(key,this.sampleChunk(cx,cz,field,state));
    this.dirtyChunks.delete(key);
    this.rebuild();
  }
  sampleChunk(cx,cz,field,state){
    const positions=[],seed=field.seed,originX=cx*48,originZ=cz*48;
    const localPlants=state.plants.filter(p=>p.alive!==false&&Math.abs(p.x-originX)<31&&Math.abs(p.z-originZ)<31);
    const blockers=[...localPlants,...state.structures.filter(s=>s.status!=='ruined'),...state.villages]
      .filter(p=>Math.abs(p.x-originX)<31&&Math.abs(p.z-originZ)<31);
    for(let iz=0;iz<24;iz++)for(let ix=0;ix<24;ix++){
      const bits=hashCell(seed,cx*24+ix,cz*24+iz,6141),chance=(bits>>>0)/4294967296;
      const x=originX-24+ix*2+(bits&1023)/1023*.9+.6;
      const z=originZ-24+iz*2+((bits>>>10)&1023)/1023*.9+.6;
      const [cover,meso,moisture,wear]=groundSample417(field,field.c.profile??{},x,z);
      const patch=Math.max(0,Math.min(1,(meso-.39)/.26));
      const clump=(hashCell(seed,Math.floor(x/7),Math.floor(z/7),6142)>>>0)/4294967296;
      const nearCrop=localPlants.some(p=>d2(x,z,p)>4&&d2(x,z,p)<42);
      const cluster=this.detailed?(clump>.50?1.65:.30)*(nearCrop?1.32:1):1;
      const biomeDensity=this.global?globalDensity(this.biome,cover,patch,moisture,meso):Math.max(0,Math.min(.4,.04+.31*cover*patch+.09*(moisture-.5)))*(this.detailed?.30:1);
      const density=this.bankCover?canyonBankDensity(field,x,z):Math.max(0,Math.min(.4,biomeDensity))*cluster;
      if(chance>density/(this.beds?5:1)||wear>.27||field.slope(x,z)>.42||field.waterInfo(x,z).inside)continue;
      if(blockers.some(p=>d2(x,z,p)<(p.kind==='wall'?1.45:p.kind==='center'?9:p.buildings?80:1.8)))continue;
      if(this.bankCover&&!canyonBankFootprintFits(this.geometry,field,x,z,bits,blockers))continue;
      if(this.beds){
        // One asymmetric five-tuft bed replaces five isolated anchors on average.
        // Keep authored spacing, rotate the group; every member respects terrain/occupancy.
        const angle=(bits>>>20)/4096*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
        for(const [j,[dx,dz]] of [[0,0],[.82,.32],[-.66,.45],[.24,-.70],[-.50,-.51]].entries()){
          const px=x+(dx*c-dz*s)*1.35,pz=z+(dx*s+dz*c)*1.35;
          if(Math.abs(px-originX)>=24||Math.abs(pz-originZ)>=24)continue;
          if(groundSample417(field,field.c.profile??{},px,pz)[3]>.27||field.slope(px,pz)>.42||field.waterInfo(px,pz).inside)continue;
          if(blockers.some(p=>d2(px,pz,p)<(p.kind==='wall'?1.45:p.kind==='center'?9:p.buildings?80:1.8)))continue;
          positions.push({x:px,z:pz,bits:hashCell(seed,bits,j,6153),y:field.surface(px,pz)+.012});
        }
      }else positions.push({x,z,bits,y:field.surface(x,z)+.012});
    }
    return positions;
  }
  markDirtyAt(x,z){
    if(!this.geometry||!Number.isFinite(x)||!Number.isFinite(z))return;
    // Candidate positions lie within 24 m of each chunk centre. A 10 m
    // margin covers the largest village/centre clearance at chunk seams.
    for(let cx=Math.ceil((x-34)/48);cx<=Math.floor((x+34)/48);cx++)
      for(let cz=Math.ceil((z-34)/48);cz<=Math.floor((z+34)/48);cz++){
        const key=cx+','+cz;
        if(this.chunks.has(key))this.dirtyChunks.add(key);
      }
  }
  flush(field,state){
    if(!this.dirtyChunks.size)return 0;
    const start=performance.now(),keys=[...this.dirtyChunks].sort();
    this.dirtyChunks.clear();
    for(const key of keys){
      if(!this.chunks.has(key))continue;
      const [cx,cz]=key.split(',').map(Number);
      this.chunks.set(key,this.sampleChunk(cx,cz,field,state));
      this.refreshStats.chunks++;
      this.refreshStats.candidates+=576;
    }
    this.rebuild();
    const duration=performance.now()-start;
    this.refreshStats.batches++;
    this.refreshStats.totalMs+=duration;
    this.refreshStats.maxMs=Math.max(this.refreshStats.maxMs,duration);
    return duration;
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
      const scale=(1.25+((bits>>>14)&63)/63*.65)*(this.global?globalScale[this.biome]:this.sculpted?2.25:this.detailed?3.1:1);
      dummy.scale.setScalar(scale);dummy.updateMatrix();this.mesh.setMatrixAt(i,dummy.matrix);
    });
    this.mesh.count=needed;this.mesh.instanceMatrix.needsUpdate=true;
    this.count=needed;
  }
  release(key){
    this.dirtyChunks.delete(key);
    if(this.chunks.delete(key))this.rebuild();
  }
  dispose(){this.releaseEvents?.();if(this.mesh){this.scene.remove(this.mesh);this.mesh.dispose();this.mesh=null;}this.chunks.clear();this.dirtyChunks.clear();this.count=0;}
}
