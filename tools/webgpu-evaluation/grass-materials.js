import * as Legacy from 'three';
import * as THREE from 'three/webgpu';
import { Fn, attribute, cameraPosition, modelWorldMatrix, uniform, vec2, vec3, varyingProperty, texture as sampleTexture, mix, smoothstep, sin, cos, max, normalize, dot, length, clamp, pow } from 'three/tsl';

// Shader expressions mirror qa-continuous-grass.js. Sun visibility is deliberately
// 1 in all three backends: this isolated fixture does not claim shadow parity.
const vertex = `
in vec4 coverageAnchor,coverageData;in vec2 coverageSlope;in vec3 flatPosition,bladeRoot;
uniform float uCoverageTime,uCoverageWindStrength,uCoverageRefined,uCoverageSpacing,uCoverageFar;
uniform sampler2D uCoverageColor;uniform vec2 uCoverageSeed;uniform float uCoverageScale;
uniform float uNight,uNightLight,uExposure;uniform vec3 uLightDir;
out vec3 vCoverageColor,vCoverageSun;
void main(){
 float ca=cos(coverageData.x),sa=sin(coverageData.x);mat2 turn=mat2(ca,-sa,sa,ca);
 vec3 root=coverageAnchor.xyz;
 vec3 rootWorld=(modelMatrix*vec4(root,1.)).xyz;
 float distanceToEye=length(cameraPosition.xz-rootWorld.xz);
 float farFade=1.-smoothstep(uCoverageFar-12.,uCoverageFar,distanceToEye);
 float lod=1.-smoothstep(18.,24.,distanceToEye);
 float extra=uv.y>=8./12.?lod:1.;float growth=farFade*extra;
 vec3 pos=mix(flatPosition,position,lod*uCoverageRefined);
 pos=bladeRoot+(pos-bladeRoot)*growth;pos.xz=turn*pos.xz*uCoverageSpacing;
 pos.y*=coverageAnchor.w;pos.y+=dot(coverageSlope,pos.xz);
 vec2 windDirection=normalize(vec2(1.,.38));
 float wave=.65*sin(uCoverageTime*1.15+dot(root.xz,vec2(.21,.13)))+.35*sin(uCoverageTime*2.4+dot(root.xz,vec2(.57,-.31))+uv.y*4.);
 float bend=uCoverageRefined*.50*uCoverageWindStrength*wave*pow(max(position.y*coverageAnchor.w,0.),2.)*growth;
 pos.xz+=windDirection*bend;
 vec3 worldP=(modelMatrix*vec4(root+pos,1.)).xyz;
 vec3 N=normal;N.xz=turn*N.xz;N.y-=uCoverageRefined*uCoverageWindStrength*wave*position.y*dot(N.xz,windDirection);N=normalize(N+vec3(0.,.45,0.));
 vec2 tileUV=mat2(.8,-.6,.6,.8)*(root.xz+pos.xz)*uCoverageScale+uCoverageSeed;
 vec3 pigment=textureLod(uCoverageColor,tileUV,2.).rgb*vec3(1.14,1.09,.97);
 pigment*=.88+.20*coverageData.y;
 vec3 dayShade=vec3(.17,.28,.34),nightShade=vec3(.095,.17,.32)*uNightLight;
 vec3 sun=mix(vec3(1.55,1.42,1.02),vec3(.22,.36,.66)*uNightLight,uNight);
 float drive=.35+.65*max(dot(N,uLightDir),0.);
 vec3 base=pow(clamp(pigment,0.,1.),vec3(2.2))*(.63+.37*uv.x)*uExposure;
 vCoverageColor=base*mix(dayShade,nightShade,uNight);vCoverageSun=base*sun*drive;
 gl_Position=projectionMatrix*viewMatrix*vec4(worldP,1.);
}`;
const fragment = `out vec4 coverageOutput;
#define gl_FragColor coverageOutput
in vec3 vCoverageColor,vCoverageSun;
void main(){
 vec3 lit=vCoverageColor+vCoverageSun;
 gl_FragColor=vec4(clamp((lit*(2.51*lit+.03))/(lit*(2.43*lit+.59)+.14),0.,1.),1.);
 #include <colorspace_fragment>
}`;

export async function createGrassMaterial({backend,texture,refined=1,spacing=.4,far=48,time=0,night=0,seed=[0,0],scale=.155,windStrength=8,nightLight=1,exposure=1,lightDirection=[-30,55,25],pigmentTint=[1.14,1.09,.97]}) {
 if (!['legacy','webgpu','webgl-tsl'].includes(backend)) throw new Error(`Unknown grass backend: ${backend}`);
 // Ground source pixels are raw values; shader performs its own pow(2.2).
 // Clone only when caller has assigned a color space, preserving caller ownership.
 const source=texture.colorSpace===THREE.NoColorSpace?texture:texture.clone();
 if(source!==texture){source.colorSpace=THREE.NoColorSpace;source.needsUpdate=true;}
 const seedValue=new THREE.Vector2(seed.x??seed[0]??0,seed.y??seed[1]??0);
 const light=new THREE.Vector3(lightDirection.x??lightDirection[0],lightDirection.y??lightDirection[1],lightDirection.z??lightDirection[2]).normalize();
 let material,setTime,setNight;
 if(backend==='legacy'){
  const uniforms={uCoverageTime:{value:time},uCoverageWindStrength:{value:windStrength},uCoverageRefined:{value:Number(refined)},uCoverageSpacing:{value:spacing/.4},uCoverageFar:{value:far},uCoverageColor:{value:source},uCoverageSeed:{value:seedValue},uCoverageScale:{value:scale},uNight:{value:night},uNightLight:{value:nightLight},uExposure:{value:exposure},uLightDir:{value:light}};
  material=new Legacy.ShaderMaterial({vertexShader:vertex.replace('vec3(1.14,1.09,.97)',`vec3(${pigmentTint.map(v=>Number(v).toFixed(8)).join(',')})`),fragmentShader:fragment,uniforms,glslVersion:Legacy.GLSL3,side:Legacy.DoubleSide,transparent:false,depthWrite:true,toneMapped:false});
  setTime=value=>{uniforms.uCoverageTime.value=value;};setNight=value=>{uniforms.uNight.value=value;};
 }else{
  const t=uniform(time),n=uniform(night),wind=uniform(windStrength),r=uniform(Number(refined)),s=uniform(spacing/.4),f=uniform(far),seedNode=uniform(seedValue),scaleNode=uniform(scale),lightNode=uniform(light),nightLightNode=uniform(nightLight),exposureNode=uniform(exposure);
  const color=varyingProperty('vec3','vCoverageColor'),sun=varyingProperty('vec3','vCoverageSun');
  material=new THREE.MeshBasicNodeMaterial({side:THREE.DoubleSide,transparent:false,depthWrite:true,toneMapped:false,fog:false});
  material.positionNode=Fn(()=>{
   const anchor=attribute('coverageAnchor','vec4'),data=attribute('coverageData','vec4'),slope=attribute('coverageSlope','vec2'),p=attribute('position','vec3'),normal=attribute('normal','vec3'),flat=attribute('flatPosition','vec3'),blade=attribute('bladeRoot','vec3'),uv=attribute('uv','vec2');
   const ca=cos(data.x),sa=sin(data.x),root=anchor.xyz;
   const rotate=v=>vec2(ca.mul(v.x).add(sa.mul(v.y)),sa.negate().mul(v.x).add(ca.mul(v.y)));
   const rootWorld=modelWorldMatrix.mul(root.toVec4(1)).xyz;
   const distance=length(cameraPosition.xz.sub(rootWorld.xz));
   const fade=smoothstep(f.sub(12),f,distance).oneMinus();
   const lod=smoothstep(18,24,distance).oneMinus();
   const growth=fade.mul(uv.y.greaterThanEqual(8/12).select(lod,1));
   const pos=blade.add(mix(flat,p,lod.mul(r)).sub(blade).mul(growth)).toVar();
   pos.xz.assign(rotate(pos.xz).mul(s));
   pos.y.assign(pos.y.mul(anchor.w).add(dot(slope,pos.xz)));
   const direction=normalize(vec2(1,.38));
   const wave=sin(t.mul(1.15).add(dot(root.xz,vec2(.21,.13)))).mul(.65).add(sin(t.mul(2.4).add(dot(root.xz,vec2(.57,-.31))).add(uv.y.mul(4))).mul(.35));
   const bend=r.mul(.5).mul(wind).mul(wave).mul(pow(max(p.y.mul(anchor.w),0),2)).mul(growth);
   pos.xz.addAssign(direction.mul(bend));
   const N=normal.toVar();N.xz.assign(rotate(N.xz));
   N.y.subAssign(r.mul(wind).mul(wave).mul(p.y).mul(dot(N.xz,direction)));
   N.assign(normalize(N.add(vec3(0,.45,0))));
   const xz=root.xz.add(pos.xz),tileUV=vec2(xz.x.mul(.8).add(xz.y.mul(.6)),xz.x.mul(-.6).add(xz.y.mul(.8))).mul(scaleNode).add(seedNode);
   const pigment=sampleTexture(source,tileUV).level(2).rgb.mul(vec3(...pigmentTint)).mul(data.y.mul(.2).add(.88));
   const base=pow(clamp(pigment,0,1),vec3(2.2)).mul(uv.x.mul(.37).add(.63)).mul(exposureNode);
   color.assign(base.mul(mix(vec3(.17,.28,.34),vec3(.095,.17,.32).mul(nightLightNode),n)));
   sun.assign(base.mul(mix(vec3(1.55,1.42,1.02),vec3(.22,.36,.66).mul(nightLightNode),n)).mul(max(dot(N,lightNode),0).mul(.65).add(.35)));
   return root.add(pos);
  })();
  material.colorNode=Fn(()=>{const lit=color.add(sun);return clamp(lit.mul(lit.mul(2.51).add(.03)).div(lit.mul(lit.mul(2.43).add(.59)).add(.14)),0,1);})();
  setTime=value=>{t.value=value;};setNight=value=>{n.value=value;};
 }
 material.name=`qa-grass-${backend}`;
 material.userData.parity={source:'tools/experiments/qa-continuous-grass.js',shadowVisibility:1,vertexLighting:true,windStrength,spacing};
 return {material,setTime,setNight,dispose(){material.dispose();if(source!==texture)source.dispose();}};
}
