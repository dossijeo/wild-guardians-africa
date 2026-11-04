import * as THREE from 'three/webgpu';
import {Fn,attribute,cameraPosition,modelWorldMatrix,uniform,vec2,vec3,varyingProperty,texture as sampleTexture,mix,smoothstep,sin,cos,max,normalize,dot,length,clamp,pow} from 'three/tsl';

// Same TSL expressions as grass-original.js, with per-object inputs instead of
// one material per biome/patch. Lab only; no terrain or production shadows.
export function createSharedGrassMaterial(seedTexture){
 const state=new WeakMap();
 const parameter=(key,fallback)=>uniform(fallback).onObjectUpdate(({object})=>state.get(object)?.[key]??fallback);
 const t=parameter('time',0),n=parameter('night',0),wind=parameter('windStrength',8),r=parameter('refined',1),s=parameter('spacing',1),f=parameter('far',48);
 const seed=parameter('seed',new THREE.Vector2()),scale=parameter('scale',.155),light=parameter('lightDirection',new THREE.Vector3(-30,55,25).normalize()),nightLight=parameter('nightLight',1),exposure=parameter('exposure',1),tint=parameter('pigmentTint',new THREE.Vector3(1,1,1));
 const color=varyingProperty('vec3','vCoverageColor'),sun=varyingProperty('vec3','vCoverageSun');
 const material=new THREE.MeshBasicNodeMaterial({side:THREE.DoubleSide,transparent:false,depthWrite:true,toneMapped:false,fog:false});
 material.name='qa-shared-grass';
 material.positionNode=Fn(()=>{
  const anchor=attribute('coverageAnchor','vec4'),data=attribute('coverageData','vec4'),slope=attribute('coverageSlope','vec2'),p=attribute('position','vec3'),normal=attribute('normal','vec3'),flat=attribute('flatPosition','vec3'),blade=attribute('bladeRoot','vec3'),uv=attribute('uv','vec2');
  const ca=cos(data.x),sa=sin(data.x),root=anchor.xyz,rotate=v=>vec2(ca.mul(v.x).add(sa.mul(v.y)),sa.negate().mul(v.x).add(ca.mul(v.y)));
  const rootWorld=modelWorldMatrix.mul(root.toVec4(1)).xyz,distance=length(cameraPosition.xz.sub(rootWorld.xz));
  const fade=smoothstep(f.sub(12),f,distance).oneMinus(),lod=smoothstep(18,24,distance).oneMinus(),growth=fade.mul(uv.y.greaterThanEqual(8/12).select(lod,1));
  const pos=blade.add(mix(flat,p,lod.mul(r)).sub(blade).mul(growth)).toVar();pos.xz.assign(rotate(pos.xz).mul(s));pos.y.assign(pos.y.mul(anchor.w).add(dot(slope,pos.xz)));
  const direction=normalize(vec2(1,.38)),wave=sin(t.mul(1.15).add(dot(root.xz,vec2(.21,.13)))).mul(.65).add(sin(t.mul(2.4).add(dot(root.xz,vec2(.57,-.31))).add(uv.y.mul(4))).mul(.35));
  const bend=r.mul(.5).mul(wind).mul(wave).mul(pow(max(p.y.mul(anchor.w),0),2)).mul(growth);pos.xz.addAssign(direction.mul(bend));
  const N=normal.toVar();N.xz.assign(rotate(N.xz));N.y.subAssign(r.mul(wind).mul(wave).mul(p.y).mul(dot(N.xz,direction)));N.assign(normalize(N.add(vec3(0,.45,0))));
  const xz=root.xz.add(pos.xz),tileUV=vec2(xz.x.mul(.8).add(xz.y.mul(.6)),xz.x.mul(-.6).add(xz.y.mul(.8))).mul(scale).add(seed);
  const pigment=sampleTexture(seedTexture,tileUV).level(2).onObjectUpdate(({object})=>state.get(object)?.texture??seedTexture).rgb.mul(tint).mul(data.y.mul(.2).add(.88));
  const base=pow(clamp(pigment,0,1),vec3(2.2)).mul(uv.x.mul(.37).add(.63)).mul(exposure);
  color.assign(base.mul(mix(vec3(.17,.28,.34),vec3(.095,.17,.32).mul(nightLight),n)));
  sun.assign(base.mul(mix(vec3(1.55,1.42,1.02),vec3(.22,.36,.66).mul(nightLight),n)).mul(max(dot(N,light),0).mul(.65).add(.35)));
  return root.add(pos);
 })();
 material.colorNode=Fn(()=>{const lit=color.add(sun);return clamp(lit.mul(lit.mul(2.51).add(.03)).div(lit.mul(lit.mul(2.43).add(.59)).add(.14)),0,1);})();
 return {material,bind(object,{texture,refined=1,spacing=.4,far=48,time=0,night=0,seed=[0,0],scale=.155,windStrength=8,nightLight=1,exposure=1,lightDirection=[-30,55,25],pigmentTint=[1.14,1.09,.97]}){
  state.set(object,{texture,refined:Number(refined),spacing:spacing/.4,far,time,night,seed:new THREE.Vector2(...seed),scale,windStrength,nightLight,exposure,lightDirection:new THREE.Vector3(...lightDirection).normalize(),pigmentTint:new THREE.Vector3(...pigmentTint)});
 },update(object,time,night){const value=state.get(object);if(!value)throw Error('Unbound grass object');value.time=time;value.night=night;},dispose(){material.dispose();}};
}
