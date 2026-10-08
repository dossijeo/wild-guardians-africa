// Experimental fine-original shading control. This does not support proxy
// geometry: view-position/TBN/roughness derivatives still use the fine mesh.
import * as THREE from 'three';
const declarations=`
uniform sampler2D uFieldPosition;
uniform sampler2D uFieldNormal;
uniform sampler2D uFieldUv;
uniform sampler2D uFieldCoefficients;
uniform highp usampler2D uFieldVertices;
uniform highp usampler2D uFieldRanges;
uniform highp usampler2D uFieldCandidates;
uniform mat3 normalMatrix;
uniform float uGround;
flat varying float vFieldFace;
flat varying float vFieldChart;
varying vec3 vFieldBary;
varying vec2 vFieldDomain;
flat varying vec4 vFieldGrowth;
flat varying mat3 vFieldInstance;
ivec2 fieldCoord(int i,int width){return ivec2(i%width,i/width);}
vec4 fieldCoefficient(int i){return texelFetch(uFieldCoefficients,fieldCoord(i,256),0);}
vec3 fieldBary(int face,vec2 domain){
 vec4 a=fieldCoefficient(face*2),b=fieldCoefficient(face*2+1);
 vec2 d=domain-a.xy;
 float y=dot(a.zw,d),z=dot(b.xy,d);
 return vec3(1.0-y-z,y,z);
}
int fieldLocate(int chart,vec2 domain){
 ivec2 cell=clamp(ivec2(floor(domain*16.0)),ivec2(0),ivec2(15));
 uvec2 range=texelFetch(uFieldRanges,fieldCoord(chart*256+cell.y*16+cell.x,256),0).xy;
 // Source-ID sorted candidates make boundary ownership deterministic. This
 // numerical lookup epsilon is not a waiver of any image/coverage gate.
 for(int i=0;i<92;i++){
  if(uint(i)>=range.y)break;
  int face=int(texelFetch(uFieldCandidates,fieldCoord(int(range.x)+i,256),0).r);
  if(min(min(fieldBary(face,domain).x,fieldBary(face,domain).y),fieldBary(face,domain).z)>=-0.00001)return face;
 }
 return -1;
}
vec3 fieldVertexNormal(int vertex){
 vec3 p=texelFetch(uFieldPosition,ivec2(vertex,0),0).xyz;
 vec3 n=texelFetch(uFieldNormal,ivec2(vertex,0),0).xyz;
 float mask=smoothstep(uGround,uGround+0.12,p.y);
 n=normalize(n/vec3(mix(1.0,vFieldGrowth.y,mask),mix(1.0,vFieldGrowth.x,mask),mix(1.0,vFieldGrowth.y,mask)));
 mat3 im=vFieldInstance;
 n/=vec3(dot(im[0],im[0]),dot(im[1],im[1]),dot(im[2],im[2]));
 n=normalMatrix*(im*n);
 #ifdef FLIP_SIDED
 n=-n;
 #endif
 return normalize(n);
}
`;
const vertexDeclarations=`
attribute vec2 aFieldDomain;
attribute float aFieldChart;
attribute float aFieldFace;
attribute vec3 aFieldBary;
flat varying float vFieldFace;
flat varying float vFieldChart;
varying vec3 vFieldBary;
varying vec2 vFieldDomain;
flat varying vec4 vFieldGrowth;
flat varying mat3 vFieldInstance;
`;
const vertexSetup=`
vFieldFace=aFieldFace;vFieldChart=aFieldChart;
vFieldBary=aFieldBary;vFieldDomain=aFieldDomain;vFieldGrowth=iGrowth;
#ifdef USE_INSTANCING
vFieldInstance=mat3(instanceMatrix);
#else
vFieldInstance=mat3(1.0);
#endif
`;
function replaceOnce(source,needle,replacement){
 const count=source.split(needle).length-1;
 if(count!==1)throw Error('Fine field shader contract missing/ambiguous: '+needle);
 return source.replace(needle,replacement);
}

export function createSourceFineFieldMaterial(original,fieldTextures,{lookup='direct'}={}){
 if(!['direct','grid'].includes(lookup))throw Error('Unsupported fine field lookup');
 if(!original.isMeshStandardMaterial||original.flatShading||original.side!==THREE.DoubleSide||original.alphaTest||original.transparent)throw Error('Fine field control requires native opaque smooth DoubleSide PBR');
 if(original.roughnessMap||original.metalnessMap||original.bumpMap||original.normalMapType===THREE.ObjectSpaceNormalMap)throw Error('Fine field control does not implement auxiliary or object-space material maps');
 const material=original.clone(),compile=original.onBeforeCompile,cache=original.customProgramCacheKey.bind(original);
 material.onBeforeCompile=(shader,renderer)=>{
  compile.call(original,shader,renderer);
  if(!shader.vertexShader.includes('attribute vec4 iGrowth;'))throw Error('Native growth hook was not preserved');
  for(const [name,key] of [['Position','position'],['Normal','normal'],['Uv','uv'],['Coefficients','faceCoefficients'],['Vertices','faceVertices'],['Ranges','cellRanges'],['Candidates','cellFaces']])shader.uniforms['uField'+name]={value:fieldTextures[key]};
  shader.vertexShader=vertexDeclarations+'\n'+shader.vertexShader;
  shader.vertexShader=replaceOnce(shader.vertexShader,'#include <begin_vertex>',vertexSetup+'\n#include <begin_vertex>');
  let fragment=declarations+'\n'+shader.fragmentShader;
  if(material.map)fragment='uniform mat3 mapTransform;\n'+fragment;
  if(material.normalMap)fragment='uniform mat3 normalMapTransform;\n'+fragment;
  const setup=`
 int fieldFace=${lookup==='direct'?'int(vFieldFace)':'fieldLocate(int(vFieldChart),vFieldDomain)'};
 if(fieldFace<0){gl_FragColor=vec4(1.0,0.0,1.0,1.0);return;}
 vec3 fieldWeights=${lookup==='direct'?'vFieldBary':'fieldBary(fieldFace,vFieldDomain)'};
 uvec3 fieldIds=texelFetch(uFieldVertices,fieldCoord(fieldFace,256),0).xyz;
 vec3 fieldRawNormal=fieldVertexNormal(int(fieldIds.x))*fieldWeights.x+fieldVertexNormal(int(fieldIds.y))*fieldWeights.y+fieldVertexNormal(int(fieldIds.z))*fieldWeights.z;
 vec2 fieldUv=texelFetch(uFieldUv,ivec2(int(fieldIds.x),0),0).xy*fieldWeights.x+texelFetch(uFieldUv,ivec2(int(fieldIds.y),0),0).xy*fieldWeights.y+texelFetch(uFieldUv,ivec2(int(fieldIds.z),0),0).xy*fieldWeights.z;
 ${material.map?'vec2 fieldMapUv=(mapTransform*vec3(fieldUv,1.0)).xy;':''}
 ${material.normalMap?'vec2 fieldNormalMapUv=(normalMapTransform*vec3(fieldUv,1.0)).xy;':''}
 `;
  // Keep shader declarations intact; rewrite the smooth normal uses only.
  fragment=fragment.replace(/normalize\(\s*vNormal\s*\)/g,'normalize(fieldRawNormal)');
  fragment=replaceOnce(fragment,'#include <normal_fragment_begin>',THREE.ShaderChunk.normal_fragment_begin.replace(/\bvNormal\b/g,'fieldRawNormal').replace(/\bvNormalMapUv\b/g,'fieldNormalMapUv'));
  fragment=replaceOnce(fragment,'#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replace(/\bvNormalMapUv\b/g,'fieldNormalMapUv'));
  fragment=replaceOnce(fragment,'#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace(/\bvMapUv\b/g,'fieldMapUv'));
  fragment=replaceOnce(fragment,'void main() {','void main() {\n'+setup);
  shader.fragmentShader=fragment;
  material.userData.experimentalFieldShader=shader;
 };
 material.customProgramCacheKey=()=>cache()+'|qa-source-fine-field-v1-'+lookup;
 material.userData.experimentalSourceField={kind:'sourceFine',lookup,approved:false,limitations:'Only original fine geometry; no coarse TBN/view derivatives, physical reverses or bridge adaptation.'};
 return material;
}
