import * as THREE from 'three';
import {MeshPhysicalNodeMaterial} from 'three/webgpu';
import {texture,uniform,uv,normalMap,ior,specularColor,specularF90,diffuseColor,metalness as metalnessProperty,mix,min,pow2,vec3} from 'three/tsl';

// Three r180's setupSpecular() ignores specularIntensityNode and
// specularColorNode, so use the same formula with per-object node values.
class SharedPhysicalNodeMaterial extends MeshPhysicalNodeMaterial {
 setupSpecular(){
  ior.assign(this.iorNode);
  specularColor.assign(mix(min(pow2(ior.sub(1).div(ior.add(1))).mul(this.specularColorNode),vec3(1)).mul(this.specularIntensityNode),diffuseColor.rgb,metalnessProperty));
  specularF90.assign(mix(this.specularIntensityNode,1,metalnessProperty));
 }
}

// Laboratory prototype: a conservative family for ordinary opaque PBR assets.
// A bank is keyed by structural state and map presence, never by per-object values.
export function physicalFamilyKey(source){
 return [source.side,source.vertexColors,...['map','normalMap','roughnessMap','metalnessMap'].map(key=>!!source[key])].join(':');
}
export function createSharedPhysicalMaterial(seed){
 const state=new WeakMap(),white=new THREE.Color(1,1,1),unitScale=new THREE.Vector2(1,1);
 const param=(name,initial)=>uniform(initial).onObjectUpdate(({object})=>state.get(object)?.[name]??initial);
 const sampled=name=>seed[name]?texture(seed[name],uv()).onObjectUpdate(({object})=>state.get(object)?.[name]??seed[name]):null;
 const color=param('color',white),roughness=param('roughness',1),metalness=param('metalness',0);
 const base=sampled('map'),normal=sampled('normalMap'),rough=sampled('roughnessMap'),metal=sampled('metalnessMap');
 const material=new SharedPhysicalNodeMaterial();material.name='QA shared physical';material.side=seed.side;material.vertexColors=seed.vertexColors;
 material.colorNode=base?base.rgb.mul(color):color;material.roughnessNode=rough?rough.g.mul(roughness):roughness;material.metalnessNode=metal?metal.b.mul(metalness):metalness;
 material.specularIntensityNode=param('specularIntensity',1);material.specularColorNode=param('specularColor',white);material.iorNode=param('ior',1.5);
 if(normal)material.normalNode=normalMap(normal,param('normalScale',unitScale));
 function supports(object,source){
  if(!source?.isMeshPhysicalMaterial||physicalFamilyKey(source)!==physicalFamilyKey(seed))return false;
  if(source.transparent||source.opacity!==1||source.alphaTest||source.flatShading||!source.visible||!source.depthTest||!source.depthWrite||!source.colorWrite||!source.toneMapped||!source.fog||source.depthFunc!==THREE.LessEqualDepth||source.blending!==THREE.NormalBlending||source.stencilWrite||source.polygonOffset||source.premultipliedAlpha||source.alphaToCoverage||source.clippingPlanes?.length||source.normalMapType!==THREE.TangentSpaceNormalMap)return false;
  if(source.vertexColors&&!object?.geometry?.getAttribute('color'))return false;
  if(source.clearcoat||source.transmission||source.sheen||source.iridescence||source.anisotropy||source.dispersion)return false;
  for(const name of ['alphaMap','aoMap','bumpMap','displacementMap','emissiveMap','envMap','lightMap','specularColorMap','specularIntensityMap'])if(source[name])return false;
  if(source.emissive?.r||source.emissive?.g||source.emissive?.b)return false;
  for(const name of ['map','normalMap','roughnessMap','metalnessMap']){const image=source[name];if(!image)continue;if(!object?.geometry?.getAttribute('uv')||!image.isTexture||image.channel!==0||image.offset.x!==0||image.offset.y!==0||image.repeat.x!==1||image.repeat.y!==1||image.rotation!==0)return false;if(name==='map'&&image.colorSpace!==THREE.SRGBColorSpace)return false;if(name!=='map'&&image.colorSpace!==THREE.NoColorSpace)return false;}
  return true;
 }
 return {material,supports,bind(object,source){if(!supports(object,source))return false;state.set(object,{map:source.map,normalMap:source.normalMap,roughnessMap:source.roughnessMap,metalnessMap:source.metalnessMap,color:source.color.clone(),roughness:source.roughness,metalness:source.metalness,specularIntensity:source.specularIntensity,specularColor:source.specularColor.clone(),ior:source.ior,normalScale:source.normalScale.clone()});return true;},parameters(object){return state.get(object);},release(object){state.delete(object);},dispose(){material.dispose();}};
}
