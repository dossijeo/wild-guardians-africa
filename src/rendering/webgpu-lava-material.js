import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {Fn,clamp,dot,float,floor,fract,fwidth,max,min,mix,pow,positionWorld,sin,smoothstep,sqrt,sRGBTransferEOTF,uniform,vec2,vec3,vec4} from 'three/tsl';
import {waterPalette,waterSeed,WATER_DEFAULTS} from './world-atmosphere.js';
import {chunkClipOpacity} from './webgpu-chunk-clip.js';
import {lavaColorRecipe} from './webgpu-material-graph-catalog.js';
// Wild Engine's spatial terrain view exposes its unsigned WASM world seed.
export const lavaWorldSeed=seed=>Number(seed)>>>0;

// TSL translation of paintedLava and the lava branch of nativeFluid4. The
// clock is confirmed simulation time shared by all visible lava instances.
const graphs=new WeakMap();
export function createWebGpuLavaMaterial({color,seed,clockNode,clip=true}={}){
 if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color)||!clockNode?.isNode||typeof clip!=='boolean')throw TypeError('Invalid lava material');
 const offset=waterSeed(seed),palette=waterPalette(color,true);
 let byParameters=graphs.get(clockNode);if(!byParameters){byParameters=new Map();graphs.set(clockNode,byParameters);}const recipe=lavaColorRecipe({offset,palette,clip}),key=recipe.graphKey;let colorNode=byParameters.get(key);
 if(!colorNode){
 const lava=Fn(()=>{
  const t=clockNode.mul(WATER_DEFAULTS.speed).toVar(),p=positionWorld.zx.mul(vec2(.22,.45)).mul(WATER_DEFAULTS.scale*4).toVar();
  const flow0=p.mul(.64).add(vec2(...offset)).add(vec2(t.mul(-.018),t.mul(.008))).toVar();
  const flow=flow0.add(vec2(sin(flow0.y.mul(.91).add(t.mul(.034))),sin(flow0.x.mul(.72).sub(t.mul(.029)))).mul(.19*WATER_DEFAULTS.amplitude)).toVar();
  const cell=floor(flow).toVar(),q=fract(flow).toVar();
  const hash=point=>{const v=fract(vec3(point.x,point.y,point.x).mul(vec3(.1031,.1030,.0973))).toVar();v.addAssign(dot(v,v.yzx.add(19.19)));return fract(v.x.add(v.y).mul(v.z));};
  const first=float(10).toVar(),second=float(10).toVar();
  for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const o=vec2(x,y),jitter=vec2(hash(cell.add(o).add(7.1)),hash(cell.add(o).add(31.7))),d=o.add(.18).add(jitter.mul(.64)).sub(q).toVar(),dist=dot(d,d).toVar();second.assign(min(second,max(first,dist)));first.assign(min(first,dist));}
  const gap=sqrt(second).sub(sqrt(first)).toVar(),aa=max(fwidth(gap),.008).toVar(),edge=float(1).sub(smoothstep(float(.07).sub(aa),float(.22).add(aa),gap)),core=float(1).sub(smoothstep(float(.016).sub(aa.mul(.35)),float(.055).add(aa.mul(.35)),gap)),heat=sin(p.x.mul(.38).add(p.y.mul(.53)).sub(t.mul(.08))).mul(.5).add(.5);
  const inks=palette.map(rgb=>vec3(...rgb)),crust=mix(inks[0],inks[1],heat.mul(.25).add(.40));let paint=mix(crust,inks[2],edge.mul(.90));paint=mix(paint,inks[3],core.mul(.75));paint=clamp(paint.mul(sin(t.mul(.6).add(p.x.mul(.21))).mul(.04).add(.96)),0,1).toVar();
  const lit=pow(max(paint,vec3(0)),vec3(2.2)).mul(2.15).toVar(),filmic=pow(clamp(lit.mul(lit.mul(2.51).add(.03)).div(lit.mul(lit.mul(2.43).add(.59)).add(.14)),0,1),vec3(1/2.2)),graded=filmic.mul(vec3(.99,1.03,1.07)).toVar(),luminance=dot(graded,vec3(.299,.587,.114)),result=mix(vec3(luminance),graded,1.02);
  return sRGBTransferEOTF(vec4(result,1)).rgb;
 });
 colorNode=lava();byParameters.set(key,colorNode);
 }
 const material=new MeshBasicNodeMaterial(recipe.structural.state);material.colorNode=colorNode;if(clip)material.opacityNode=chunkClipOpacity;return material;
}
export function lavaClock(initial=0){if(!Number.isFinite(initial)||initial<0)throw TypeError('Invalid lava clock');return uniform(initial);}
