import * as THREE from 'three';
import {assetUrl} from './asset-url.js';
import {HAND_ASSETS,HandHints3D,handEffects} from './hands-native.js';
import {quadTerrainLift} from './hand-terrain.js';

export class NativeHands {
  constructor(scene,surface,{motion=true,onError=()=>{},textureLoader=new THREE.TextureLoader()}={}){
    this.surface=surface;this.elapsed=0;this.disposed=false;this.key=null;this.route=[];
    this.adapter={objects:new Map(),colliders:[],handMotion:motion,phase:'closed',surfaceAt:surface,
      handRoute:u=>this.routePoint(u),terrainClearance:corners=>quadTerrainLift(corners,surface),
      routeTerrainCeiling:()=>this.routeCeiling()};
    this.hints=new HandHints3D(this.adapter,{});
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(12),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);
    this.material=new THREE.MeshBasicMaterial({transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.visible=false;this.mesh.frustumCulled=false;this.mesh.raycast=()=>{};scene.add(this.mesh);
    this.effects=[];
    for(const lines of [false,true]){
      const g=new THREE.BufferGeometry(),count=lines?98:576;
      g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(count*3),3));g.setDrawRange(0,0);
      const options={vertexColors:true,transparent:true,depthTest:true,depthWrite:false,toneMapped:false},material=lines?new THREE.LineBasicMaterial(options):new THREE.MeshBasicMaterial({...options,side:THREE.DoubleSide});
      const object=lines?new THREE.LineSegments(g,material):new THREE.Mesh(g,material);object.visible=false;object.frustumCulled=false;object.raycast=()=>{};scene.add(object);this.effects.push(object);
    }
    this.textures=new Map();const loader=textureLoader;
    this.ready=Promise.all(Object.entries(HAND_ASSETS).map(async([kind,url])=>{
      const texture=await loader.loadAsync(assetUrl(url));texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;
      if(this.disposed){texture.dispose();return;}this.textures.set(kind,texture);
    })).catch(error=>{if(!this.disposed)onError(error);});
  }
  routePoint(u){
    if(!this.route.length)return this.hints.custom?.position?.slice()??[0,0,0];
    const lengths=this.route.slice(1).map((p,i)=>Math.hypot(p[0]-this.route[i][0],p[2]-this.route[i][2]));
    let remaining=u*lengths.reduce((a,b)=>a+b,0);
    for(let i=0;i<lengths.length;i++){
      if(remaining<=lengths[i]){const t=lengths[i]?remaining/lengths[i]:0;return this.route[i].map((v,k)=>v+(this.route[i+1][k]-v)*t);}
      remaining-=lengths[i];
    }
    return this.route.at(-1).slice();
  }
  routeCeiling(){
    // Includes every terrain grid vertex under the expanded corridor, so a
    // high ridge between the lab's 49 samples cannot be missed.
    if(!this.route.length)return -Infinity;
    const radius=1.95*this.hints.size,loX=Math.min(...this.route.map(p=>p[0]))-radius,hiX=Math.max(...this.route.map(p=>p[0]))+radius,loZ=Math.min(...this.route.map(p=>p[2]))-radius,hiZ=Math.max(...this.route.map(p=>p[2]))+radius;
    let height=Math.max(-Infinity,...this.adapter.colliders.map(b=>b.max[1]));
    for(let z=-24+Math.floor((loZ+24)/1.5)*1.5;z<=hiZ+1.5;z+=1.5)for(let x=-24+Math.floor((loX+24)/1.5)*1.5;x<=hiX+1.5;x+=1.5)height=Math.max(height,Math.fround(this.surface(x,z)));
    return height;
  }
  show(config,colliders=[]){
    this.adapter.colliders=colliders;
    if(!config){this.adapter.phase='closed';this.hints.custom=null;this.hints.kind=null;return;}
    const key=config.kind+':'+config.target;
    if(key!==this.key){this.key=key;this.hints.started=this.elapsed;this.hints.extraY=0;}
    this.route=config.route??[config.position];this.hints.custom=config;this.hints.kind=config.kind;this.adapter.phase='reading';
    this.hints.routeFloor=config.kind==='drag'?this.hints.routeClearance():0;
  }
  update(dt,camera){
    this.elapsed+=dt;camera.updateMatrixWorld();
    const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).toArray(),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1).toArray();
    const pose=this.hints.update(this.elapsed,dt,{right,up}),texture=pose&&this.textures.get(pose.type);
    this.mesh.visible=!!texture;for(const object of this.effects)object.visible=!!texture;if(!texture)return;
    this.material.map=texture;this.material.opacity=this.hints.opacity;this.material.needsUpdate=this.lastTexture!==texture;this.lastTexture=texture;
    const attribute=this.mesh.geometry.getAttribute('position');pose.corners.forEach((p,i)=>attribute.setXYZ(i,...p));attribute.needsUpdate=true;
    const effect=handEffects(pose,this.hints),color=new THREE.Color();
    for(const [i,data] of [effect.triangles,effect.lines].entries()){
      const object=this.effects[i],positions=object.geometry.getAttribute('position'),colors=object.geometry.getAttribute('color');
      for(let j=0;j<data.length/9;j++){positions.setXYZ(j,data[j*9],data[j*9+1],data[j*9+2]);color.setRGB(data[j*9+6],data[j*9+7],data[j*9+8],THREE.SRGBColorSpace);colors.setXYZ(j,color.r,color.g,color.b);}
      positions.needsUpdate=colors.needsUpdate=true;object.geometry.setDrawRange(0,data.length/9);object.material.opacity=i?effect.lineAlpha:effect.ringAlpha;
    }
  }
  dispose(){this.disposed=true;this.mesh.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();for(const object of this.effects){object.removeFromParent();object.geometry.dispose();object.material.dispose();}for(const texture of this.textures.values())texture.dispose();}
}
