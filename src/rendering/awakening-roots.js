import {beginAwakening,awakeningVisible} from './awakening-presentation.js';
import * as THREE from 'three';
import {AWAKENINGS as A} from '../simulation/awakening-config.js';
import {observeGameEvents} from '../simulation/game.js';
import {chunkBounds} from './water-source.js';
import {awakeningRootPaths,rasterizeAwakeningRoots,ROOT_VISUAL_RADIUS as R} from './awakening-roots-data.js';

const FADE=.65;
function texture(data,size){
  const map=new THREE.DataTexture(data,size,size,THREE.RGFormat);
  map.minFilter=map.magFilter=THREE.LinearFilter;map.generateMipmaps=false;map.needsUpdate=true;return map;
}
export class AwakeningRoots {
  constructor(state,{resolution=1024}={}){
    this.pending=new Map();this.state=state;this.resolution=resolution;this.clock={value:state.elapsed};
    this.empty=texture(new Uint8Array(2),1);this.tiles=new Map();this.entries=new WeakMap();this.dirty=new Set();this.fading=new Set();
    this.sources=new Map([...state.plants,...state.structures].filter(p=>p.blessing&&(p.alive||p.kind==='wall'&&p.status==='intact')).map(p=>[p.id,p]));
    this.stats={builds:0,totalBuildMs:0,lastBuildMs:0,bytes:0};
    this.releaseEvents=observeGameEvents(state,event=>this.event(event));
  }
  event(event){
    if(event.type==='BlessingApplied'){
      const source=this.state.plants.find(p=>p.id===event.targetId)??this.state.structures.find(p=>p.id===event.targetId);
      if(source){beginAwakening(source,event.presentation?.elapsed??this.state.elapsed);this.pending.set(source.id,source);}
    }else if(['BlessingDestroyed','BlessingRemoved'].includes(event.type)){
      this.pending.delete(event.targetId);const source=this.sources.get(event.targetId);
      if(source){this.sources.delete(source.id);this.mark(source);}
    }else if(['CropPlaced','CropPicked','CropDestroyed'].includes(event.type)){
      const plant=this.state.plants.find(p=>p.id===event.targetId);
      if(plant)for(const source of this.sources.values())if(Math.hypot(source.x-plant.x,source.z-plant.z)<=A.radius+.3)this.mark(source);
    }
  }
  mark(point){for(const [key,tile] of this.tiles){const b=tile.bounds;if(point.x+R>=b.minX&&point.x-R<=b.maxX&&point.z+R>=b.minZ&&point.z-R<=b.maxZ){tile.animate=true;this.dirty.add(key);}}}
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
    this.clock.value=this.state.elapsed;for(const [id,p] of this.pending)if(awakeningVisible(p,this.state.elapsed)){this.pending.delete(id);if(p.alive||p.kind==='wall'&&p.status==='intact'){this.sources.set(id,p);this.mark(p);}}
    for(const key of this.dirty){
      const tile=this.tiles.get(key);if(!tile)continue;
      const started=performance.now(),b=tile.bounds;
      const sources=[...this.sources.values()].filter(p=>(p.alive||p.kind==='wall'&&p.status==='intact')&&p.blessing&&p.x+R>=b.minX&&p.x-R<=b.maxX&&p.z+R>=b.minZ&&p.z-R<=b.maxZ);
      if(!sources.length&&!tile.map)continue;
      const paths=sources.flatMap(p=>awakeningRootPaths(p,this.state.plants));
      // Spend mask resolution on the occupied region, expanding without moving old roots.
      const old=tile.rasterBounds;
      const minX=Math.max(b.minX,Math.min(old?.minX??Infinity,...sources.map(p=>p.x-R)));
      const minZ=Math.max(b.minZ,Math.min(old?.minZ??Infinity,...sources.map(p=>p.z-R)));
      const maxX=Math.min(b.maxX,Math.max(old?.maxX??-Infinity,...sources.map(p=>p.x+R)));
      const maxZ=Math.min(b.maxZ,Math.max(old?.maxZ??-Infinity,...sources.map(p=>p.z+R)));
      const size=Math.max(maxX-minX,maxZ-minZ),bounds={minX,minZ,maxX:minX+size,maxZ:minZ+size,size};
      const current=rasterizeAwakeningRoots(paths,bounds,this.resolution),data=new Uint8Array(current.length*2);
      let previous=tile.current??(tile.animate?null:current);
      if(previous&&old&&(old.minX!==minX||old.minZ!==minZ||old.size!==size)){
        const remapped=new Uint8Array(current.length),n=this.resolution;
        for(let y=0;y<n;y++)for(let x=0;x<n;x++){
          const ox=(minX+(x+.5)*size/n-old.minX)/old.size*n-.5,oy=(minZ+(y+.5)*size/n-old.minZ)/old.size*n-.5;
          const ix=Math.floor(ox),iy=Math.floor(oy),fx=ox-ix,fy=oy-iy;
          const sample=(a,c)=>a>=0&&a<n&&c>=0&&c<n?previous[c*n+a]:0;
          remapped[y*n+x]=Math.round((sample(ix,iy)*(1-fx)+sample(ix+1,iy)*fx)*(1-fy)+(sample(ix,iy+1)*(1-fx)+sample(ix+1,iy+1)*fx)*fy);
        }previous=remapped;
      }
      tile.rasterBounds=bounds;tile.uniforms.uAwakeningBounds.value.set(minX,minZ,size,size);
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
  dispose(){this.releaseEvents();this.pending.clear();for(const tile of this.tiles.values())tile.map?.dispose();this.empty.dispose();this.tiles.clear();this.dirty.clear();this.fading.clear();}
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
        outgoingLight=mix(outgoingLight,vec3(.01,.8,.5),smoothstep(.02,.6,rootMask)*.75);
        outgoingLight+=(vec3(.005,.12,.08)*rootMask+vec3(.01,1.2,.8)*pow(rootMask,2.))*rootPulse;
      }
    }
    #include <opaque_fragment>`);
}
