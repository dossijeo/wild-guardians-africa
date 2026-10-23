import * as THREE from 'three';
import {fernClumpGeometryData} from './mangrove-fern-geometry.js';
// Opt-in laboratory ferns: reuse native instance buffers, masks and selection.
export async function applyHollyFern(world,q){
 if(world.state.biome!=='manglares'||q.cardStudy)throw Error('Expected native Mangrove layer');
 const {resizeShadowMap}=await import('./shadow-camera.js');if(world.renderer.shadowMap.enabled)resizeShadowMap(world.sun,'alta');world.releaseNativeShadow.cache.invalidate();
 const data=fernClumpGeometryData(),loader=new THREE.TextureLoader();
 // Enlarged footprint + wind allowance: rebuild existing cached masks once.
 q.edgePadding=1.;q.markDirtyAt();q.flush();
 for(const attr of ['position','flatPosition','bladeRoot'])for(let i=0;i<data[attr].length;i+=3){data[attr][i]*=1.35;data[attr][i+1]*=1.6;data[attr][i+2]*=1.35;}
 const loaded=await Promise.allSettled(['color','normal'].map(k=>loader.loadAsync('/assets/visual-lab/holly-fern-frond-20261023/'+k+'.png')));
 if(loaded.some(r=>r.status==='rejected')||world.disposed||world.loading?.signal.aborted){for(const r of loaded)if(r.status==='fulfilled')r.value.dispose();throw new Error('Fern textures failed or loading cancelled');}
 const [coverage,normal]=loaded.map(r=>r.value);
 const dispose=q.dispose.bind(q);q.dispose=()=>{if(q.disposed)return;for(const e of q.meshes){e.mesh.customDepthMaterial?.dispose();e.mesh.customDepthMaterial=null;}coverage.dispose();normal.dispose();dispose();};
 for(const t of [coverage,normal]){t.flipY=true;t.colorSpace=THREE.NoColorSpace;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;}
 coverage.colorSpace=THREE.SRGBColorSpace;
 for(const entry of q.meshes){
  const g=entry.mesh.geometry;
  for(const [attr,size] of [['position',3],['normal',3],['flatPosition',3],['flatNormal',3],['bladeRoot',3],['uv',2],['cardUv',2],['frondAngle',1],['frondSlope',1]])g.setAttribute(attr,new THREE.Float32BufferAttribute(data[attr],size));
  g.setIndex(data.index);g.boundingBox=null;g.boundingSphere=null;
  const m=entry.mesh.material;m.uniforms={...m.uniforms,uCoverageWindStrength:{value:.25},uLeafCoverage:{value:coverage},uLeafNormal:{value:normal}};
    m.vertexShader=`in vec2 cardUv;in float frondAngle;in float frondSlope;out float vFrondSlope;out vec2 vCardUv;out float vCardAngle;out vec3 vCardBase;\n${m.vertexShader}`;
    const anchor='vCoverageColor=base*mix(dayShade,nightShade,uNight);';
    if(!m.vertexShader.includes(anchor))throw Error('Leaf shader anchor missing');
    m.vertexShader=m.vertexShader.replace(anchor,'vFrondSlope=frondSlope*coverageAnchor.w/uCoverageSpacing;vCardUv=cardUv;vCardAngle=coverageData.x-frondAngle;vCardBase=base/(.63+.37*uv.x);'+anchor);
    m.fragmentShader=`in float vFrondSlope;in vec2 vCardUv;in float vCardAngle;in vec3 vCardBase;
uniform sampler2D uLeafCoverage,uLeafNormal;
uniform float uNight,uNightLight,uExposure;uniform vec3 uLightDir;
${m.fragmentShader}`;
    m.fragmentShader=m.fragmentShader.replace('void main(){',`void main(){
 vec4 leaf=texture(uLeafCoverage,vCardUv);if(leaf.a<.5)discard;
 vec3 leafN=normalize(texture(uLeafNormal,vCardUv).rgb*2.-1.);

 float invSlope=inversesqrt(1.+vFrondSlope*vFrondSlope);leafN=normalize(vec3(leafN.x, (leafN.y+leafN.z*vFrondSlope)*invSlope,(leafN.z-leafN.y*vFrondSlope)*invSlope));
 float ca=cos(vCardAngle),sa=sin(vCardAngle);leafN.xz=mat2(ca,-sa,sa,ca)*leafN.xz;
 vec3 leafBase=pow(max(mix(leaf.rgb,vec3(dot(leaf.rgb,vec3(.2126,.7152,.0722))),.45)/vec3(.22),vec3(0.)),vec3(1.12))*.22*uExposure*vec3(.85,.98,.63)*(.62+.38*vCoverageTip);
 vec3 leafAmbient=leafBase*(.30+.70*smoothstep(.08,.85,vCoverageTip))*mix(vec3(.17,.28,.34),vec3(.095,.17,.32)*uNightLight,uNight);
 vec3 leafSun=leafBase*(.30+.70*smoothstep(.12,.75,vCoverageTip))*mix(vec3(2.05,1.90,1.28),vec3(.22,.36,.66)*uNightLight,uNight)*(.12+.88*max(dot(leafN,uLightDir),0.)+.06*(1.-uNight)*max(dot(-leafN,uLightDir),0.));`);
    m.fragmentShader=m.fragmentShader.replace('sp.z-.0007','sp.z-.00008');
    m.fragmentShader=m.fragmentShader.replace('vec3 lit=vCoverageColor+vCoverageSun*mix(.07,1.,visibility);','vec3 lit=leafAmbient+leafSun*mix(.07,1.,visibility);');
  m.vertexShader=m.vertexShader.replace('rootWorld+vec3(0.,.12,0.)','worldP+vec3(0.,.025,0.)');
  const depth=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,side:THREE.DoubleSide,uniforms:{...m.uniforms,uFernEye:{value:world.camera.position}},vertexShader:'uniform vec3 uFernEye;\n'+m.vertexShader.replaceAll('cameraPosition','uFernEye'),fragmentShader:`in vec2 vCardUv;uniform sampler2D uLeafCoverage;out vec4 fernDepth;
#include <packing>
void main(){if(texture(uLeafCoverage,vCardUv).a<.5)discard;fernDepth=packDepthToRGBA(gl_FragCoord.z);}`});
  depth.userData.nativeShadowInputs=()=>[m.uniforms.uCoverageTime.value,m.uniforms.uCoverageWindStrength.value,m.uniforms.uCoverageSpacing.value,m.uniforms.uCoverageFar.value,m.uniforms.uCoverageRefined.value,world.camera.position,coverage];
  entry.mesh.customDepthMaterial=depth;entry.mesh.castShadow=true;
  m.needsUpdate=true;
 }
 const stats={get instances(){return q.near+q.far;},updates:0,selectionMs:0};
 q.cardStudy={representation:'native-holly-fern-balanced',get shadowResolution(){return world.sun.shadow.mapSize.x;},castsNativeShadow:true,sizeXZ:1.35,sizeY:1.6,colorContrast:1.12,edgePadding:1,frondsPerClump:4,trianglesPerClump:32,textureCount:2,textureBytesEstimate:2*1024*1024*4*4/3,normal:'upward ambient; baked normal transformed by analytic curved-frond tangent and instance height',reuseNativeInstanceBuffers:true,extraSelectionPass:false,stats};
 const audit=q.audit.bind(q);q.audit=()=>({...audit(),cardStudy:{...q.cardStudy,stats:{...stats}},leaves:(q.near+q.far)*4,castShadow:true,baseMeshesReplaced:true});
 return q.cardStudy;
}
