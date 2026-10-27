import {prepareNativeFarDepth} from './prepare-native-far-depth.js';
import {prepareNaturalWater} from '../../src/rendering/natural-water-edges.js';
import {prepareMangroveBank} from '../../src/rendering/mangrove-shore.js';
import {farGroundColorUvs} from './far-ground-color-map.js';
import {attachNativeGroundSeam} from './native-far-ground-seam.js';
import {cloneRuntimeMaterial} from '../../src/rendering/clone-runtime-material.js';
import {prepareNativeFarGpu} from './prepare-native-far-gpu.js';
import * as THREE from 'three';
import {AfricanToon,paintedWaterMaterial} from '../../src/rendering/african-toon.js';
import {nativeGroundMaterial} from '../../src/rendering/render-quality.js';
// Matching RGB context for the vertical edge bridge; evaluated only when its
// discrete rectangle changes. Alpha coverage remains fragment-sampled.
export function configureNativeFarSeamGeometry(geometry,map){
 const uv=geometry.attributes.uv.array,n=uv.length/2,colors=new Float32Array(n*3),normals=new Float32Array(n*3);
 for(let i=0;i<n;i++){
  const x=Math.max(0,Math.min(map.width-1,uv[i*2]*map.width-.5)),z=Math.max(0,Math.min(map.height-1,uv[i*2+1]*map.height-.5)),x0=Math.floor(x),z0=Math.floor(z),x1=Math.min(x0+1,map.width-1),z1=Math.min(z0+1,map.height-1),tx=x-x0,tz=z-z0;
  for(let c=0;c<3;c++){const a=map.data[(z0*map.width+x0)*4+c],b=map.data[(z0*map.width+x1)*4+c],d=map.data[(z1*map.width+x0)*4+c],e=map.data[(z1*map.width+x1)*4+c];colors[i*3+c]=((a+(b-a)*tx)*(1-tz)+(d+(e-d)*tx)*tz)/255;}
  normals[i*3+1]=1;
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('aFarWater',new THREE.BufferAttribute(new Float32Array(n),1));
}
// Low-detail ground belongs to the regional layer. Discard the live resident
// rectangle so the two surfaces never overlap or compete in the depth buffer.
export function attachNativeFarGround(candidate,data,world,{simplified=false,seam=false,nativeWaterMask=false,cancelled=()=>false,seamStreamFactory,seamPrepare}={}){
 const mapped=!!world.biomeGround&&!simplified,colors=mapped||data.colorMap?data.colors:Float32Array.from(data.colors,c=>c<=.04045?c*.0773993808:Math.pow((c+.055)*.9478672986,2.4));
 if(nativeWaterMask&&(!mapped||!data.colorMap?.waterColor))throw Error('Native water mask requires mapped ground and water data');
 if(data.colorMap&&mapped&&!nativeWaterMask)throw Error('Color-map ground requires the simplified recipe');
 if(seam&&(!data.colorMap||mapped&&!nativeWaterMask))throw Error('Ground seam requires the simplified color-map recipe');
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
 let colorMap=null;
 if(data.colorMap){const map=data.colorMap;colorMap=new THREE.DataTexture(map.data,map.width,map.height,THREE.RGBAFormat);colorMap.colorSpace=THREE.SRGBColorSpace;colorMap.magFilter=THREE.LinearFilter;colorMap.minFilter=THREE.LinearMipmapLinearFilter;colorMap.generateMipmaps=true;colorMap.needsUpdate=true;geometry.setAttribute('uv',new THREE.BufferAttribute(farGroundColorUvs(data.positions,map),2));candidate.farGroundTextures=[colorMap];}
 let treeShadowMap=null;
 if(data.treeShadows){const b=data.treeShadows;treeShadowMap=new THREE.DataTexture(b.data,b.width,b.height,THREE.RedFormat);treeShadowMap.minFilter=THREE.LinearFilter;treeShadowMap.magFilter=THREE.LinearFilter;treeShadowMap.generateMipmaps=false;treeShadowMap.needsUpdate=true;candidate.farGroundTextures=[...(candidate.farGroundTextures??[]),treeShadowMap];}
 const bounds={value:new THREE.Vector4()},origin=world.toon.uniforms.uWorldOrigin,material=mapped?nativeGroundMaterial('muy_baja'):new THREE.MeshBasicMaterial({vertexColors:!colorMap,map:colorMap,fog:true,toneMapped:false});
 let farToon=null;
 if(mapped){
  geometry.computeVertexNormals();
  const water=data.water??new Float32Array(data.positions.length/3);if(!data.water&&world.nav?.field)for(let i=0;i<water.length;i++)water[i]=world.nav.field.waterInfo(data.positions[i*3],data.positions[i*3+2]).inside?1:0;geometry.setAttribute('aFarWater',new THREE.BufferAttribute(water,1));
  world.biomeGround.attach(material,0,0,null,{mapped:false});const u=material.userData.biomeGround;u.uGroundMapped.value=0;u.uGroundMicro.value=0;u.uGroundRelief.value=0;
  farToon=new AfricanToon({visualSearch:world.visualSearch});Object.assign(farToon.uniforms,world.toon.uniforms,{uFineNoise:{value:0},uGroundDetail:{value:0}});farToon.environmentUniforms=world.toon.environmentUniforms;farToon.material(material);
 }
 const residentMaskEnabled=new URLSearchParams(world.visualSearch??globalThis.location?.search??'').get('groundResidentMask')==='1';
 const residentPixels=residentMaskEnabled?new Uint8Array(8*8*4):null;
 const residentMask=residentPixels?new THREE.DataTexture(residentPixels,8,8,THREE.RGBAFormat):null;
 if(residentMask){residentMask.minFilter=THREE.NearestFilter;residentMask.magFilter=THREE.NearestFilter;residentMask.generateMipmaps=false;}
 const regionalSurface=nativeWaterMask&&world.state?.biome==='manglares'&&new URLSearchParams(world.visualSearch??'').get('farWaterSurface')==='1';
 let regionalWater=null;
 if(regionalSurface){
  if(!data.waterBed)throw Error('Regional surface requires worker-prepared bed');
  const map=data.colorMap,b=map.bounds,positions=new Float32Array([b.minX,3.34,b.minZ,b.maxX,3.34,b.minZ,b.minX,3.34,b.maxZ,b.maxX,3.34,b.maxZ]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('uv',new THREE.BufferAttribute(farGroundColorUvs(positions,map),2));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();
  const m=paintedWaterMaterial(world.pack.profile.colors.water,false,world.nav.field.seed,null,world.fluidLighting);
  prepareMangroveBank(world,g,0,0,m,new Float32Array(4).fill(4));
  prepareNaturalWater(world,g,0,0,m,data.waterBed);
  const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
  // Share the live clock; this material is owned by this regional candidate.
  m.userData.paintUniforms.uTime=world.fluidMaterial.userData.paintUniforms.uTime;
  m.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('if(vWetShore<3.5)','float regionalShore=texture2D(qaBed,(((bankWorld-qaBedBounds.xy)/qaBedBounds.zw)*(qaBedSize-1.)+.5)/qaBedSize).a*4.;if(regionalShore<3.5)').replace(',vWetShore)',',regionalShore)');Object.assign(shader.uniforms,{uRegionalMask:{value:colorMap},uRegionalBounds:bounds,...(residentMask?{uRegionalResident:{value:residentMask}}:{})});
   shader.vertexShader='varying vec2 vRegionalUv;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {vRegionalUv=uv;');
   shader.fragmentShader='varying vec2 vRegionalUv;uniform sampler2D uRegionalMask;uniform vec4 uRegionalBounds;'+(residentMask?'uniform sampler2D uRegionalResident;':'')+'\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(texture2D(uRegionalMask,vRegionalUv).a<.5)discard;vec2 regionalXZ=vPaintWorld.xz+uWorldOrigin;if(all(greaterThanEqual(regionalXZ,uRegionalBounds.xy))&&all(lessThanEqual(regionalXZ,uRegionalBounds.zw)))'+(residentMask?'{vec2 cell=floor((regionalXZ-uRegionalBounds.xy)/48.);if(texture2D(uRegionalResident,(cell+.5)/8.).r>.5)discard;}':'discard;'));
  };
  m.customProgramCacheKey=()=>key+':regional-mask-v2:'+!!residentMask;
  regionalWater=new THREE.Mesh(g,m);regionalWater.receiveShadow=true;regionalWater.frustumCulled=false;regionalWater.userData.regionalWaterSurface=true;candidate.impostors.add(regionalWater);
 }
 const treeShadowStrength={value:.30};
 const original=material.onBeforeCompile;
 const patchGroundShader=(shader,renderer,clipNear=true)=>{
  original.call(material,shader,renderer);
  if(mapped){
   if(nativeWaterMask){shader.uniforms.uFarWaterMask={value:colorMap};shader.uniforms.uFarMaskWaterColor={value:new THREE.Vector3(...(world.naturalWaterEdges&&world.state?.biome==='manglares'?[.26,.42,.46]:world.naturalWaterEdges&&world.fluidLighting?.regionalWaterBiome==='gran-rio'?[.30,.44,.48]:data.colorMap.waterColor))};shader.vertexShader='varying vec2 vFarWaterUv;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {vFarWaterUv=uv;');shader.fragmentShader='varying vec2 vFarWaterUv;uniform sampler2D uFarWaterMask;uniform vec3 uFarMaskWaterColor;\n'+shader.fragmentShader;}
   shader.vertexShader='attribute float aFarWater;varying float vFarWater;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {vFarWater=aFarWater;');
   shader.fragmentShader='varying float vFarWater;\n'+shader.fragmentShader;if(!regionalSurface)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,pow(max('+(nativeWaterMask?'uFarMaskWaterColor':'vColor.rgb')+',vec3(0.)),vec3(2.2))*mix(vec3(1.),vec3(.187675676,.302022472,.661818182),uNight),'+(nativeWaterMask?'smoothstep(.45,.55,texture2D(uFarWaterMask,vFarWaterUv).a)':'smoothstep(.45,.55,vFarWater)')+');');
  }
  if(treeShadowMap){shader.uniforms.uFarTreeStrength=treeShadowStrength;shader.uniforms.uFarTreeShadow={value:treeShadowMap};shader.uniforms.uFarTreeNight=world.toon.uniforms.uNight;shader.vertexShader='varying vec2 vFarTreeShadowUv;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {vFarTreeShadowUv=uv;');shader.fragmentShader='varying vec2 vFarTreeShadowUv;uniform sampler2D uFarTreeShadow;uniform float uFarTreeNight,uFarTreeStrength;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.rgb*=1.-uFarTreeStrength*texture2D(uFarTreeShadow,vFarTreeShadowUv).r*(1.-clamp(uFarTreeNight,0.,1.));');}
  // Transparent banks need the native land beneath them, as resident water does.
  Object.assign(shader.uniforms,{uFarNearBounds:bounds,uFarGroundOrigin:origin,uFarGroundNight:world.toon.uniforms.uNight});
  shader.vertexShader='varying vec2 vFarGroundXZ;uniform float uFarGroundNight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvFarGroundXZ=(modelMatrix*vec4(transformed,1.)).xz;');
  // Approximate fixed-light night grading per vertex: no terrain noise, normals
  // or extra fragment texture reads for the original vertex-color path.
  if(!mapped&&!colorMap)shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nvColor.rgb*=mix(vec3(1.),vec3(.187675676,.302022472,.661818182),clamp(uFarGroundNight,0.,1.));');
  if(colorMap&&!mapped){if(data.colorMap.waterColor){shader.uniforms.uFarGroundWaterColor={value:new THREE.Color().setRGB(...data.colorMap.waterColor).convertSRGBToLinear()};shader.fragmentShader='uniform vec3 uFarGroundWaterColor;\n'+shader.fragmentShader;}shader.uniforms.uFarGroundNight=world.toon.uniforms.uNight;shader.fragmentShader='uniform float uFarGroundNight;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+(data.colorMap.waterColor?'diffuseColor.rgb=mix(diffuseColor.rgb,uFarGroundWaterColor,smoothstep(.45,.55,diffuseColor.a));diffuseColor.a=1.;\n':'')+'diffuseColor.rgb*=mix(vec3(1.),vec3(.187675676,.302022472,.661818182),clamp(uFarGroundNight,0.,1.));');}
  shader.fragmentShader='varying vec2 vFarGroundXZ;uniform vec4 uFarNearBounds;uniform vec2 uFarGroundOrigin;\n'+shader.fragmentShader;
  if(residentMask){shader.uniforms.uFarResidentMask={value:residentMask};shader.fragmentShader='uniform sampler2D uFarResidentMask;\n'+shader.fragmentShader;}
  if(clipNear)shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec2 farGroundXZ=vFarGroundXZ+uFarGroundOrigin;if(farGroundXZ.x>=uFarNearBounds.x&&farGroundXZ.y>=uFarNearBounds.y&&farGroundXZ.x<=uFarNearBounds.z&&farGroundXZ.y<=uFarNearBounds.w)'+(residentMask?' {vec2 residentCell=floor((farGroundXZ-uFarNearBounds.xy)/48.);if(texture2D(uFarResidentMask,(residentCell+.5)/8.).r>.5)discard;}':'discard;'));
  else shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec2 farGroundXZ=vFarGroundXZ+uFarGroundOrigin;bool onFarEdge=((abs(farGroundXZ.x-uFarNearBounds.x)<.01||abs(farGroundXZ.x-uFarNearBounds.z)<.01)&&farGroundXZ.y>=uFarNearBounds.y&&farGroundXZ.y<=uFarNearBounds.w)||((abs(farGroundXZ.y-uFarNearBounds.y)<.01||abs(farGroundXZ.y-uFarNearBounds.w)<.01)&&farGroundXZ.x>=uFarNearBounds.x&&farGroundXZ.x<=uFarNearBounds.z);if(!onFarEdge)discard;'+(residentMask?'vec2 edgeCell=floor((clamp(farGroundXZ,uFarNearBounds.xy+vec2(.02),uFarNearBounds.zw-vec2(.02))-uFarNearBounds.xy)/48.);if(texture2D(uFarResidentMask,(edgeCell+.5)/8.).r<.5)discard;':''));
 };
 material.onBeforeCompile=(shader,renderer)=>patchGroundShader(shader,renderer);
 material.customProgramCacheKey=()=> nativeWaterMask?'far-ground-native-water-mask-v1':colorMap?'far-ground-color-map-v2:'+(data.colorMap.waterColor?'mask':'opaque'):'far-ground-resident-material-v4:'+(mapped?'native':'vertex');
 if(treeShadowMap){const baseKey=material.customProgramCacheKey;material.customProgramCacheKey=()=>baseKey()+':tree-shadow-v1';}
 if(regionalSurface){const baseKey=material.customProgramCacheKey;material.customProgramCacheKey=()=>baseKey()+':surface-underlay-v2';}
 if(residentMask){const baseKey=material.customProgramCacheKey;material.customProgramCacheKey=()=>baseKey()+':resident-mask-v2';}
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.userData.farGround=true;if(data.treeShadows)mesh.userData.treeShadowBake={width:data.treeShadows.width,height:data.treeShadows.height,affected:data.treeShadows.affected,bytes:data.treeShadows.data.byteLength,strength:treeShadowStrength};mesh.userData.materialRegistryExcluded=true;candidate.impostors.add(mesh);
 let seamOwner=null,lastSeamPromise=null;
 candidate.updateGroundBounds=()=>{bounds.value.set(...world.nearBounds);
  if(residentMask){
   const [minX,minZ,maxX,maxZ]=world.nearBounds,width=Math.ceil((maxX-minX)/48),height=Math.ceil((maxZ-minZ)/48);
   if(width>8||height>8)throw Error('Far resident mask exceeds capacity');
   const cx=Math.round((minX+24)/48),cz=Math.round((minZ+24)/48);let changed=false;
   // Visibility can change without a chunk revision. Check the bounded grid,
   // but upload only changed bytes; no temporary buffer or scene traversal.
   for(let z=0;z<8;z++)for(let x=0;x<8;x++){
    const group=x<width&&z<height?world.chunks.get(`${cx+x},${cz+z}`):null;
    const value=group&&group.visible!==false?255:0,index=(z*8+x)*4;
    if(residentPixels[index]!==value){residentPixels[index]=value;changed=true;}
   }
   if(changed||residentMask.version===0)residentMask.needsUpdate=true;
  }
  if(seamOwner){const promise=seamOwner.update();if(promise!==lastSeamPromise){lastSeamPromise=promise;promise.catch(error=>world.onError?.(error));}}};
 candidate.updateGroundBounds();
 if(seam){
  // Basic/fog ground requires no world lights or shadow casters. Upload this
  // small replacement alone rather than redraw the resident world per border.
  const warmScene=mapped?world.scene:new THREE.Scene();
  const ownedSeam=new URLSearchParams(world.visualSearch??globalThis.location?.search??'').get('seamOwned')==='1';
  const prepareSeam=async(root,stale)=>{if(!mapped)warmScene.fog=world.scene.fog;const previous=root.onBeforeRender;root.onBeforeRender=function(renderer,scene,...args){if(scene===warmScene)candidate.groundSeamStats.warmDraws=(candidate.groundSeamStats.warmDraws??0)+1;previous.call(this,renderer,scene,...args);};try{await prepareNativeFarDepth(world,root,stale);return await prepareNativeFarGpu(world.renderer,root,warmScene,world.camera,[colorMap],{cooperative:!!world.loadingProgress&&!world.loadingProgress.ready,cancelled:stale,isolateRoot:world.farZeroVertexPreparation===true||ownedSeam&&world.farIsolatedPreparation===true,zeroVertices:world.farZeroVertexPreparation===true,ownedCompilation:ownedSeam&&world.farOwnedCompilation===true,ownedWaits:ownedSeam&&world.farOwnedWaits===true,measureDraw:world.onLoadingGpuDraw});}finally{root.onBeforeRender=previous;}};
  seamOwner=attachNativeGroundSeam(candidate,data,world,{cancelled,configureGeometry:mapped?geometry=>configureNativeFarSeamGeometry(geometry,data.colorMap):null,streamFactory:seamStreamFactory,prepare:seamPrepare??prepareSeam,createMaterial:()=>{const seamMaterial=cloneRuntimeMaterial(material);seamMaterial.side=THREE.DoubleSide;seamMaterial.onBeforeCompile=(shader,renderer)=>patchGroundShader(shader,renderer,false);seamMaterial.customProgramCacheKey=()=>material.customProgramCacheKey()+':seam-v2';return seamMaterial;}});candidate.groundSeamReady=seamOwner.update();lastSeamPromise=candidate.groundSeamReady;
 }
 let disposed=false;const dispose=candidate.dispose;candidate.dispose=options=>{if(disposed)return;disposed=true;if(regionalWater){regionalWater.removeFromParent();regionalWater.geometry.dispose();regionalWater.material.dispose();}seamOwner?.dispose();mesh.removeFromParent();geometry.dispose();material.dispose();colorMap?.dispose();treeShadowMap?.dispose();residentMask?.dispose();farToon?.shadowUniforms.fallback.dispose();dispose.call(candidate,options);};
}
