import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {attribute,cameraPosition,cos,dot,float,length,max,mix,modelWorldMatrix,normalize,pow,positionLocal,sin,smoothstep,texture,uv,vec2,vec3,vec4,varying} from 'three/tsl';

// TSL counterpart of the authored continuous-grass vertex deformation.
// The caller owns atlas, clock, lighting nodes, and instance buffers.
export function createWebGpuGrassMaterial({atlas,clock,seed,scale,spacing,far,wind,night,nightLight,exposure,sunDirection,shadowVisibility=float(1),river=false}={}){
 if(!atlas?.isTexture||![clock,seed,scale,spacing,far,wind,night,nightLight,exposure,sunDirection,shadowVisibility].every(node=>node?.isNode)||typeof river!=='boolean')throw TypeError('Invalid WebGPU grass bindings');
 const anchor=attribute('coverageAnchor','vec4'),data=attribute('coverageData','vec4'),slope=attribute('coverageSlope','vec2'),flat=attribute('flatPosition','vec3'),root=attribute('bladeRoot','vec3'),flatNormal=attribute('flatNormal','vec3'),normal=attribute('normal','vec3'),texcoord=uv(),worldRoot=modelWorldMatrix.mul(vec4(anchor.xyz,1)).xyz;
 const distance=length(cameraPosition.xz.sub(worldRoot.xz)),lod=smoothstep(18,24,distance).oneMinus(),fade=smoothstep(far.sub(12),far,distance).oneMinus(),extra=mix(float(1),lod,texcoord.y.greaterThanEqual(8/12)),growth=fade.mul(extra),ca=cos(data.x),sa=sin(data.x);
 const local=mix(flat,positionLocal,lod),grown=root.add(local.sub(root).mul(growth)),x=ca.mul(grown.x).add(sa.mul(grown.z)).mul(spacing),z=ca.mul(grown.z).sub(sa.mul(grown.x)).mul(spacing),y=grown.y.mul(anchor.w).add(dot(slope,vec2(x,z)));
 const wave=sin(clock.mul(1.15).add(dot(anchor.xz,vec2(.21,.13)))).mul(.65).add(sin(clock.mul(2.4).add(dot(anchor.xz,vec2(.57,-.31))).add(texcoord.y.mul(4))).mul(.35)),bend=lod.mul(.5).mul(wind).mul(wave).mul(pow(max(positionLocal.y.mul(anchor.w),0),2)).mul(growth),windDir=normalize(vec2(1,.38));
 const displaced=anchor.xyz.add(vec3(x.add(windDir.x.mul(bend)),y,z.add(windDir.y.mul(bend))));
 const n=mix(flatNormal,normal,lod),nx=ca.mul(n.x).add(sa.mul(n.z)),nz=ca.mul(n.z).sub(sa.mul(n.x)),ny=n.y.sub(lod.mul(wind).mul(wave).mul(positionLocal.y).mul(dot(vec2(nx,nz),windDir))),surfaceNormal=normalize(vec3(nx,ny.add(.45),nz));
 const tile=vec2(anchor.x.add(x.mul(lod)).mul(.8).add(anchor.z.add(z.mul(lod)).mul(.6)),anchor.x.add(x.mul(lod)).mul(-.6).add(anchor.z.add(z.mul(lod)).mul(.8))).mul(scale).add(seed),tint=river?vec3(1.14,1.18,1.05):vec3(1.14,1.09,.97),pigment=texture(atlas,tile).level(2).rgb.mul(tint).mul(data.y.mul(.20).add(.88));
 const base=pow(pigment.clamp(0,1),vec3(2.2)).mul(texcoord.x.mul(.37).add(.63)).mul(exposure),shade=mix(river?vec3(.14,.26,.32):vec3(.17,.28,.34),(river?vec3(.24,.36,.48):vec3(.095,.17,.32)).mul(nightLight),night),sun=mix(river?vec3(1.77,1.79,1.42):vec3(1.55,1.42,1.02),vec3(.22,.36,.66).mul(nightLight),night),drive=max(dot(surfaceNormal,sunDirection),0).mul(.65).add(.35);
 const lit=varying(base.mul(shade)).add(varying(base.mul(sun).mul(drive)).mul(mix(.07,1,shadowVisibility))),mapped=lit.mul(lit.mul(2.51).add(.03)).div(lit.mul(lit.mul(2.43).add(.59)).add(.14)).clamp(0,1);
 const material=new MeshBasicNodeMaterial({side:THREE.DoubleSide,depthWrite:true,toneMapped:false});material.positionNode=displaced;material.colorNode=vec4(mapped,1);return material;
}
