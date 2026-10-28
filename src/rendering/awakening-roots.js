import * as THREE from 'three';
import {AWAKENINGS as A} from '../simulation/awakening-config.js';
import {observeGameEvents} from '../simulation/game.js';
import {chunkBounds} from './water-source.js';
import {awakeningRootPaths,rasterizeAwakeningRoots} from './awakening-roots-data.js';

const FADE=.65;
function texture(data,size){
  const map=new THREE.DataTexture(data,size,size,THREE.RGFormat);
  map.minFilter=map.magFilter=THREE.LinearFilter;map.generateMipmaps=false;map.needsUpdate=true;return map;
}
export class AwakeningRoots {
  constructor(state,{resolution=512}={}){
    this.state=state;this.resolution=resolution;this.clock={value:state.elapsed};
    this.empty=texture(new Uint8Array(2),1);this.tiles=new Map();this.entries=new WeakMap();this.dirty=new Set();this.fading=new Set();
    this.sources=new Map(state.plants.filter(p=>p.alive&&p.blessing).map(p=>[p.id,p]));
    this.stats={builds:0,totalBuildMs:0,lastBuildMs:0,bytes:0};
    this.releaseEvents=observeGameEvents(state,event=>this.event(event));
  }
  event(event){
    if(event.type==='BlessingApplied'&&event.kind==='plant'){
      const source=this.state.plants.find(p=>p.id===event.targetId);
      if(source){this.sources.set(source.id,source);this.mark(source);}
    }else if(['BlessingDestroyed','BlessingRemoved'].includes(event.type)){
      const source=this.sources.get(event.targetId);
      if(source){this.sources.delete(source.id);this.mark(source);}
    }else if(['CropPlaced','CropPicked','CropDestroyed'].includes(event.type)){
      const plant=this.state.plants.find(p=>p.id===event.targetId);
      if(plant)for(const source of this.sources.values())if(Math.hypot(source.x-plant.x,source.z-plant.z)<=A.radius+.3)this.mark(source);
    }
  }
  mark(point){for(const [key,tile] of this.tiles){const b=tile.bounds;if(point.x+A.radius+.3>=b.minX&&point.x-A.radius-.3<=b.maxX&&point.z+A.radius+.3>=b.minZ&&point.z-A.radius-.3<=b.maxZ){tile.animate=true;this.dirty.add(key);}}}
  uniforms(cx,cz,{mapped=true}={}){
    if(!mapped)return {uAwakeningMap:{value:this.empty},uAwakeningBounds:{value:new THREE.Vector4(0,0,1,1)},uAwakeningOn:{value:0},uAwakeningChangeAt:{value:-1000},uAwakeningClock:this.clock};
    const key=cx+','+cz;let tile=this.tiles.get(key);
    if(!tile){
      const bounds=chunkBounds(cx,cz),uniforms={uAwakeningMap:{value:this.empty},uAwakeningBounds:{value:new THREE.Vector4(bounds.minX,bounds.minZ,48,48)},uAwakeningOn:{value:0},uAwakeningChangeAt:{value:-1000},uAwakeningClock:this.clock};
      tile={bounds,uniforms,owners:0,current:null,map:null};this.tiles.set(key,tile);this.entries.set(uniforms,{key,tile});this.dirty.add(key);
    }
    return tile.uniforms;
  }
  retain(uniforms,material){
    const entry=this.entries.get(uniforms);if(!entry)return;
    entry.tile.owners++;material.addEventListener('dispose',()=>{
      if(--entry.tile.owners===0&&this.tiles.get(entry.key)===entry.tile){
        this.stats.bytes-=entry.tile.map?.image.data.byteLength??0;entry.tile.map?.dispose();
        this.tiles.delete(entry.key);this.dirty.delete(entry.key);this.fading.delete(entry.tile);
      }
    });
  }
  bounds(){return [...this.tiles.values()].map(tile=>tile.uniforms.uAwakeningBounds.value);}
  flush(){
    this.clock.value=this.state.elapsed;
    for(const key of this.dirty){
      const tile=this.tiles.get(key);if(!tile)continue;
      const started=performance.now(),b=tile.bounds;
      const sources=[...this.sources.values()].filter(p=>p.alive&&p.blessing&&p.x+A.radius+.3>=b.minX&&p.x-A.radius-.3<=b.maxX&&p.z+A.radius+.3>=b.minZ&&p.z-A.radius-.3<=b.maxZ);
      if(!sources.length&&!tile.map)continue;
      const paths=sources.flatMap(p=>awakeningRootPaths(p,this.state.plants));
      const current=rasterizeAwakeningRoots(paths,b,this.resolution),data=new Uint8Array(current.length*2);
      const previous=tile.current??(tile.animate?null:current);
      for(let i=0;i<current.length;i++){data[i*2]=current[i];data[i*2+1]=previous?.[i]??0;}
      tile.animate=false;
      this.stats.bytes-=tile.map?.image.data.byteLength??0;tile.map?.dispose();tile.map=texture(data,this.resolution);
      tile.current=current;tile.uniforms.uAwakeningMap.value=tile.map;tile.uniforms.uAwakeningOn.value=1;
      tile.uniforms.uAwakeningChangeAt.value=this.state.elapsed;this.fading.add(tile);
      this.stats.builds++;this.stats.lastBuildMs=performance.now()-started;this.stats.totalBuildMs+=this.stats.lastBuildMs;
      this.stats.bytes+=data.byteLength;
    }
    this.dirty.clear();
    for(const tile of this.fading)if(this.state.elapsed-tile.uniforms.uAwakeningChangeAt.value>=FADE){
      if(!tile.current.some(v=>v>0)){
        this.stats.bytes-=tile.map?.image.data.byteLength??0;tile.map?.dispose();tile.map=null;tile.current=null;
        tile.uniforms.uAwakeningMap.value=this.empty;tile.uniforms.uAwakeningOn.value=0;
      }
      this.fading.delete(tile);
    }
  }
  dispose(){this.releaseEvents();for(const tile of this.tiles.values())tile.map?.dispose();this.empty.dispose();this.tiles.clear();this.dirty.clear();this.fading.clear();}
}
export function patchAwakeningRoots(shader,uniforms){
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=`uniform sampler2D uAwakeningMap;uniform vec4 uAwakeningBounds;uniform float uAwakeningOn,uAwakeningChangeAt,uAwakeningClock;\n`+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    if(uAwakeningOn>.5){
      vec2 rootUV=(vToonWorld.xz-uAwakeningBounds.xy)/uAwakeningBounds.zw;
      if(all(greaterThanEqual(rootUV,vec2(0.)))&&all(lessThanEqual(rootUV,vec2(1.)))){
        vec2 roots=texture2D(uAwakeningMap,rootUV).rg;
        float rootMask=mix(roots.g,roots.r,smoothstep(0.,${FADE},uAwakeningClock-uAwakeningChangeAt));
        float rootPulse=.92+.08*sin(uAwakeningClock*.72+rootUV.x*12.+rootUV.y*9.);
        outgoingLight+=vec3(.035,.45,.30)*rootMask*rootPulse*(.65+.65*uNight);
      }
    }
    #include <opaque_fragment>`);
}
