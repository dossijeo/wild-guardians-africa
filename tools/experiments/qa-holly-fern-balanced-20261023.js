import * as THREE from '/node_modules/three/build/three.module.js';
import {fernClumpGeometryData} from './holly-fern-full-frond-geometry-20261023.js';
// QA fern-only: replace static geometry and reuse native instance buffers and selection.
export async function applyHollyFern(world){
 const q=world.groundDetails;if(world.state.biome!=='manglares'||q.cardStudy)throw Error('Expected native Mangrove layer');
 const data=fernClumpGeometryData(),loader=new THREE.TextureLoader();
 // Enlarged footprint + wind allowance: rebuild existing cached masks once.
 q.edgePadding=1.;q.markDirtyAt();q.flush();
 for(const attr of ['position','flatPosition','bladeRoot'])for(let i=0;i<data[attr].length;i+=3){data[attr][i]*=1.35;data[attr][i+1]*=1.25;data[attr][i+2]*=1.35;}
 const [coverage,normal]=await Promise.all(['color','normal'].map(k=>loader.loadAsync('/assets/visual-lab/holly-fern-frond-20261023/'+k+'.png')));
 for(const t of [coverage,normal]){t.flipY=true;t.colorSpace=THREE.NoColorSpace;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;}
 coverage.colorSpace=THREE.SRGBColorSpace;
 for(const entry of q.meshes){
  const g=entry.mesh.geometry;
  for(const [attr,size] of [['position',3],['normal',3],['flatPosition',3],['flatNormal',3],['bladeRoot',3],['uv',2],['cardUv',2],['frondAngle',1]])g.setAttribute(attr,new THREE.Float32BufferAttribute(data[attr],size));
  g.setIndex(data.index);g.boundingBox=null;g.boundingSphere=null;
  const m=entry.mesh.material;m.uniforms={...m.uniforms,uCoverageWindStrength:{value:.6},uLeafCoverage:{value:coverage},uLeafNormal:{value:normal}};
    m.vertexShader=`in vec2 cardUv;in float frondAngle;out vec2 vCardUv;out float vCardAngle;out vec3 vCardBase;\n${m.vertexShader}`;
    const anchor='vCoverageColor=base*mix(dayShade,nightShade,uNight);';
    if(!m.vertexShader.includes(anchor))throw Error('Leaf shader anchor missing');
    m.vertexShader=m.vertexShader.replace(anchor,'vCardUv=cardUv;vCardAngle=coverageData.x-frondAngle;vCardBase=base/(.63+.37*uv.x);'+anchor);
    m.fragmentShader=`in vec2 vCardUv;in float vCardAngle;in vec3 vCardBase;
uniform sampler2D uLeafCoverage,uLeafNormal;
uniform float uNight,uNightLight,uExposure;uniform vec3 uLightDir;
${m.fragmentShader}`;
    m.fragmentShader=m.fragmentShader.replace('void main(){',`void main(){
 vec4 leaf=texture(uLeafCoverage,vCardUv);if(leaf.a<.5)discard;
 vec3 leafN=normalize(texture(uLeafNormal,vCardUv).rgb*2.-1.);

 float ca=cos(vCardAngle),sa=sin(vCardAngle);leafN.xz=mat2(ca,-sa,sa,ca)*leafN.xz;
 leafN=normalize(vec3(leafN.x*.18,1.,leafN.z*.18));
 vec3 leafBase=pow(max(leaf.rgb/vec3(.22),vec3(0.)),vec3(1.22))*.22*uExposure*vec3(.37,.50,.31)*(.62+.38*vCoverageTip);
 vec3 leafAmbient=leafBase*mix(vec3(.17,.28,.34),vec3(.095,.17,.32)*uNightLight,uNight);
 vec3 leafSun=leafBase*mix(vec3(1.55,1.42,1.02),vec3(.22,.36,.66)*uNightLight,uNight)*(.35+.65*max(dot(leafN,uLightDir),0.)+.06*(1.-uNight)*max(dot(-leafN,uLightDir),0.));`);
    m.fragmentShader=m.fragmentShader.replace('vec3 lit=vCoverageColor+vCoverageSun*mix(.07,1.,visibility);','vec3 lit=leafAmbient+leafSun*mix(.07,1.,visibility);');
  m.needsUpdate=true;
 }
 const dispose=q.dispose.bind(q);q.dispose=()=>{if(q.disposed)return;coverage.dispose();normal.dispose();dispose();};
 const stats={get instances(){return q.near+q.far;},updates:0,selectionMs:0};
 q.cardStudy={representation:'radial-ferns-only-balanced-large',sizeXZ:1.35,sizeY:1.25,colorContrast:1.22,edgePadding:1,frondsPerClump:4,trianglesPerClump:16,textureCount:2,textureBytesEstimate:2*1024*1024*4*4/3,normal:'upward with 18% baked lateral detail',reuseNativeInstanceBuffers:true,extraSelectionPass:false,stats};
 const audit=q.audit.bind(q);q.audit=()=>({...audit(),cardStudy:{...q.cardStudy,stats:{...stats}},leaves:(q.near+q.far)*4,baseMeshesReplaced:true});
 return q.cardStudy;
}
