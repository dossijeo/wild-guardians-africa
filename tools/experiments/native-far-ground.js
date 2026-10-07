import {farGroundColorUvs} from './far-ground-color-map.js';
import {attachNativeGroundSeam} from './native-far-ground-seam.js';
import {prepareNativeFarGpu} from './prepare-native-far-gpu.js';
import * as THREE from 'three';
import {AfricanToon} from '../../src/rendering/african-toon.js';
import {nativeGroundMaterial} from '../../src/rendering/render-quality.js';
// Low-detail ground belongs to the regional layer. Discard the live resident
// rectangle so the two surfaces never overlap or compete in the depth buffer.
export function attachNativeFarGround(candidate,data,world,{simplified=false,seam=false,cancelled=()=>false,seamStreamFactory,seamPrepare}={}){
 const mapped=!!world.biomeGround&&!simplified,colors=mapped||data.colorMap?data.colors:Float32Array.from(data.colors,c=>c<=.04045?c*.0773993808:Math.pow((c+.055)*.9478672986,2.4));
 if(data.colorMap&&mapped)throw Error('Color-map ground requires the simplified recipe');
 if(seam&&(!data.colorMap||mapped))throw Error('Ground seam requires the simplified color-map recipe');
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
 let colorMap=null;
 if(data.colorMap){const map=data.colorMap;colorMap=new THREE.DataTexture(map.data,map.width,map.height,THREE.RGBAFormat);colorMap.colorSpace=THREE.SRGBColorSpace;colorMap.magFilter=THREE.LinearFilter;colorMap.minFilter=THREE.LinearMipmapLinearFilter;colorMap.generateMipmaps=true;colorMap.needsUpdate=true;geometry.setAttribute('uv',new THREE.BufferAttribute(farGroundColorUvs(data.positions,map),2));candidate.farGroundTextures=[colorMap];}
 const bounds={value:new THREE.Vector4()},origin=world.toon.uniforms.uWorldOrigin,material=mapped?nativeGroundMaterial('muy_baja'):new THREE.MeshBasicMaterial({vertexColors:!colorMap,map:colorMap,fog:true,toneMapped:false});
 let farToon=null;
 if(mapped){
  geometry.computeVertexNormals();
  const water=new Float32Array(data.positions.length/3);if(world.nav?.field)for(let i=0;i<water.length;i++)water[i]=world.nav.field.waterInfo(data.positions[i*3],data.positions[i*3+2]).inside?1:0;geometry.setAttribute('aFarWater',new THREE.BufferAttribute(water,1));
  world.biomeGround.attach(material,0,0);const u=material.userData.biomeGround;u.uGroundMapped.value=0;u.uGroundMicro.value=0;u.uGroundRelief.value=0;
  farToon=new AfricanToon();Object.assign(farToon.uniforms,world.toon.uniforms,{uFineNoise:{value:0},uGroundDetail:{value:0}});farToon.environmentUniforms=world.toon.environmentUniforms;farToon.material(material);
 }
 const original=material.onBeforeCompile;
 const patchGroundShader=(shader,renderer,clipNear=true)=>{
  original.call(material,shader,renderer);
  if(mapped){
   shader.vertexShader='attribute float aFarWater;varying float vFarWater;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {vFarWater=aFarWater;');
   shader.fragmentShader='varying float vFarWater;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,pow(max(vColor.rgb,vec3(0.)),vec3(2.2))*mix(vec3(1.),vec3(.187675676,.302022472,.661818182),uNight),smoothstep(.45,.55,vFarWater));');
  }
  Object.assign(shader.uniforms,{uFarNearBounds:bounds,uFarGroundOrigin:origin,uFarGroundNight:world.toon.uniforms.uNight});
  shader.vertexShader='varying vec2 vFarGroundXZ;uniform float uFarGroundNight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvFarGroundXZ=(modelMatrix*vec4(transformed,1.)).xz;');
  // Approximate fixed-light night grading per vertex: no terrain noise, normals
  // or extra fragment texture reads for the original vertex-color path.
  if(!mapped&&!colorMap)shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nvColor.rgb*=mix(vec3(1.),vec3(.187675676,.302022472,.661818182),clamp(uFarGroundNight,0.,1.));');
  if(colorMap){if(data.colorMap.waterColor){shader.uniforms.uFarGroundWaterColor={value:new THREE.Color().setRGB(...data.colorMap.waterColor).convertSRGBToLinear()};shader.fragmentShader='uniform vec3 uFarGroundWaterColor;\n'+shader.fragmentShader;}shader.uniforms.uFarGroundNight=world.toon.uniforms.uNight;shader.fragmentShader='uniform float uFarGroundNight;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+(data.colorMap.waterColor?'diffuseColor.rgb=mix(diffuseColor.rgb,uFarGroundWaterColor,smoothstep(.45,.55,diffuseColor.a));diffuseColor.a=1.;\n':'')+'diffuseColor.rgb*=mix(vec3(1.),vec3(.187675676,.302022472,.661818182),clamp(uFarGroundNight,0.,1.));');}
  shader.fragmentShader='varying vec2 vFarGroundXZ;uniform vec4 uFarNearBounds;uniform vec2 uFarGroundOrigin;\n'+shader.fragmentShader;
  if(clipNear)shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec2 farGroundXZ=vFarGroundXZ+uFarGroundOrigin;if(farGroundXZ.x>=uFarNearBounds.x&&farGroundXZ.y>=uFarNearBounds.y&&farGroundXZ.x<=uFarNearBounds.z&&farGroundXZ.y<=uFarNearBounds.w)discard;');
 };
 material.onBeforeCompile=(shader,renderer)=>patchGroundShader(shader,renderer);
 material.customProgramCacheKey=()=> colorMap?'far-ground-color-map-v2:'+(data.colorMap.waterColor?'mask':'opaque'):'far-ground-resident-material-v4:'+(mapped?'native':'vertex');
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.userData.farGround=true;mesh.userData.materialRegistryExcluded=true;candidate.impostors.add(mesh);
 let seamOwner=null,lastSeamPromise=null;
 candidate.updateGroundBounds=()=>{bounds.value.set(...world.nearBounds);if(seamOwner){const promise=seamOwner.update();if(promise!==lastSeamPromise){lastSeamPromise=promise;promise.catch(error=>world.onError?.(error));}}};
 candidate.updateGroundBounds();
 if(seam){
  // Basic/fog ground requires no world lights or shadow casters. Upload this
  // small replacement alone rather than redraw the resident world per border.
  const warmScene=new THREE.Scene();
  const prepareSeam=async(root,stale)=>{warmScene.fog=world.scene.fog;const previous=root.onBeforeRender;root.onBeforeRender=function(renderer,scene,...args){if(scene===warmScene)candidate.groundSeamStats.warmDraws=(candidate.groundSeamStats.warmDraws??0)+1;previous.call(this,renderer,scene,...args);};try{return await prepareNativeFarGpu(world.renderer,root,warmScene,world.camera,[colorMap],{cancelled:stale});}finally{root.onBeforeRender=previous;}};
  seamOwner=attachNativeGroundSeam(candidate,data,world,{cancelled,streamFactory:seamStreamFactory,prepare:seamPrepare??prepareSeam,createMaterial:()=>{const seamMaterial=material.clone();seamMaterial.side=THREE.DoubleSide;seamMaterial.onBeforeCompile=(shader,renderer)=>patchGroundShader(shader,renderer,false);seamMaterial.customProgramCacheKey=()=>material.customProgramCacheKey()+':seam';return seamMaterial;}});candidate.groundSeamReady=seamOwner.update();lastSeamPromise=candidate.groundSeamReady;
 }
 let disposed=false;const dispose=candidate.dispose;candidate.dispose=options=>{if(disposed)return;disposed=true;seamOwner?.dispose();mesh.removeFromParent();geometry.dispose();material.dispose();colorMap?.dispose();farToon?.shadowUniforms.fallback.dispose();dispose.call(candidate,options);};
}
