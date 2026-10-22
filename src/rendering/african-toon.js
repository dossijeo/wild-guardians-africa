import {skyAtmosphereEnabled} from './sky-atmosphere.js';
import {patchVolcanicRock} from './global-volcanic-rock.js';
import {patchRiverSoil} from './global-river-soil.js';
import {patchMangroveSubstrate} from './global-mangrove-substrate.js';
import {patchCanyonSand} from './global-canyon-sand.js';
import {patchVolcanicAsh} from './global-volcanic-ash.js';
import {patchDesertSand} from './global-desert-sand.js';
import {desertMesoEnabled,patchDesertMeso} from './global-desert-meso.js';
import {patchDesertLight} from './global-desert-light.js';
import {patchCanyonRock} from './global-canyon-rock.js';
import {acquireWaterSlope,patchGlobalWaterSurface} from './global-water-surface.js';
import {patchGlobalGroundFill,patchVolcanicCharcoal,patchDryGroundRoughness,globalNightLight,patchVolcanicNightAmbient} from './global-visual-lighting.js';
import {groundMaterialFunctions,artLightingFunctions,ART_PROFILES} from './biome-material-source.js';
import {savannaLayerFunctions} from './savanna-layer-source.js';
import * as THREE from 'three';
import {diagnosticPigment,diagnosticGroundNoise} from './fine-noise.js';
import {endpointEnvironment} from './environment-endpoints.js';
import {worldPatternFunctions} from './render-origin.js';
import {toonFunctions,waterFunctions} from './african-toon-source.js';
import {WATER_DEFAULTS,waterPalette,waterSeed} from './world-atmosphere.js';
import {fluidLightingFunctions,environmentFunctions} from './fluid-lighting-source.js';
import {groundLightingFunctions} from './ground-lighting-source.js';
import {volcanicFunctions} from './volcanic-source.js';
import {createNativeShadowUniforms,patchNativeShadow} from './native-shadow.js';
import {recordNativeDepthHook,recordNativeFluidDepthHook} from './depth-recipes.js';

const atmosphereCacheKey=skyAtmosphereEnabled()?'|sky-atmosphere-clouds-v1':'';
const endpointFunctions=endpointEnvironment(environmentFunctions),endpointFluidFunctions=endpointEnvironment(fluidLightingFunctions);
const diagnosticToon=diagnosticPigment(toonFunctions),diagnosticVolcanic=diagnosticPigment(volcanicFunctions);
// Experimental village-only relief: retain the authored palette and broad toon
// bands while allowing the existing tangent-space atlas to affect fine light.
const normalDetailLightingFunctions=artLightingFunctions.replace(
  'vec3 lit=toLinear4(clamp(base,0.,1.))*illumination*contact;',
  'vec3 lit=toLinear4(clamp(base,0.,1.))*illumination*contact; float normalDetail=clamp(dot(N,uLightDir)-dot(normalize(geometricNormal),uLightDir),-.38,.38); lit*=1.+normalDetail*.78;'
);

// Shared by the world renderer only. The original menu owns a separate renderer.
export class AfricanToon {
  constructor(){
    this.globalVisualLighting=new URLSearchParams(globalThis.location?.search??'').get('visualLab')==='global-lighting';
    this.volcanicNightSpectrum=this.globalVisualLighting&&new URLSearchParams(globalThis.location?.search??'').get('volcanicNight')==='spectrum';
    this.volcanicNightAmbient=this.globalVisualLighting&&new URLSearchParams(globalThis.location?.search??'').get('volcanicNight')==='ambient'||this.volcanicNightSpectrum;
    this.desertResidualWear=this.globalVisualLighting&&new URLSearchParams(globalThis.location?.search??'').get('sandWear')==='residual';
    this.desertMeso=desertMesoEnabled();
    this.uniforms={uEnvEndpoints:{value:1},uFineNoise:{value:1},uWorldOrigin:{value:new THREE.Vector2()},uBiome:{value:0},uWet:{value:0},uNight:{value:0},uNightLight:{value:1},uExposure:{value:1},uLightDir:{value:new THREE.Vector3(-30,55,25).normalize()},uKind:{value:0},uSurfaceType:{value:1},uGroundDetail:{value:1}};
    this.artUniforms={uArtSun:{value:new THREE.Vector3()},uArtShade:{value:new THREE.Vector3()},uArtFoliage:{value:new THREE.Vector3()},uArtParams:{value:new THREE.Vector4()},uArtShape:{value:new THREE.Vector4()},uArtHighlight:{value:0},uArtVolcanicGlow:{value:0}};
    this.materials=new WeakSet();this.shadowUniforms=createNativeShadowUniforms();
    this.contactUniforms={uContactMap:{value:null},uContactBounds:{value:new THREE.Vector4(0,0,1,1)},uContactOn:{value:0}};
    this.environmentUniforms={uEnvEndpoints:this.uniforms.uEnvEndpoints,uNativeEnvEnabled:{value:0},uEnvDay:{value:null},uEnvNight:{value:null},uEnvYaw:{value:0}};
  }
  environment(textures,yaw){const u=this.environmentUniforms;u.uEnvDay.value=textures?.[0]??null;u.uEnvNight.value=textures?.[1]??null;u.uNativeEnvEnabled.value=textures?.length===2?1:0;this.environmentYaw=yaw;u.uEnvYaw.value=yaw?.value??0;}
  update(night,sun,biome){this.uniforms.uBiome.value=['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'].indexOf(biome);this.uniforms.uWet.value=biome==='manglares'?.72:biome==='gran-rio'?.25:0;this.uniforms.uNight.value=Number(night);this.uniforms.uNightLight.value=globalNightLight(this.globalVisualLighting,biome);this.uniforms.uLightDir.value.copy(sun.position).sub(sun.target.position).normalize();this.environmentUniforms.uEnvYaw.value=this.environmentYaw?.value??0;const art=ART_PROFILES[['savanna','grand_river','mangrove','volcanoes','canyons','desert'][this.uniforms.uBiome.value]]??ART_PROFILES.savanna;for(const [key,value] of Object.entries({uArtSun:art.sun,uArtShade:art.shade,uArtFoliage:art.foliage,uArtParams:art.params,uArtShape:art.shape}))this.artUniforms[key].value.fromArray(value);}
  material(material){
    if(!(material?.isMeshStandardMaterial||material?.isMeshBasicMaterial&&material.userData.toonGround)||material.transparent||material.userData.paintUniforms||this.materials.has(material))return;
    this.materials.add(material);
    const original=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
    material.onBeforeCompile=(shader,renderer)=>{
      original.call(material,shader,renderer);Object.assign(shader.uniforms,this.uniforms,this.environmentUniforms);if(material.userData.biomeGround)Object.assign(shader.uniforms,material.userData.biomeGround);if(material.userData.artBounds){Object.assign(shader.uniforms,this.artUniforms);const b=material.userData.artBounds;shader.uniforms.uArtLocalMin={value:b.min};shader.uniforms.uArtLocalSize={value:b.size};shader.uniforms.uArtCrown={value:b.crown};shader.uniforms.uArtVolcanicGlow=material.userData.nativeVolcanicGlow??this.artUniforms.uArtVolcanicGlow;}if(material.userData.toonGround)Object.assign(shader.uniforms,this.contactUniforms);shader.uniforms.uSurfaceType={value:material.userData.toonGround?0:material.userData.artSurface??material.userData.nativeSurface?.type??1};
      shader.vertexShader=(material.userData.artBounds?'uniform vec3 uArtLocalMin,uArtLocalSize;uniform float uArtCrown;varying vec3 vCanopyNormal;varying float vRelativeHeight;\n':'')+'varying vec3 vToonWorld;\n'+(material.isMeshBasicMaterial?'varying vec3 vToonLowNormal;\n':'')+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 toonPosition=vec4(transformed,1.0);
        #ifdef USE_BATCHING
          toonPosition=batchingMatrix*toonPosition;
        #endif
        #ifdef USE_INSTANCING
          toonPosition=instanceMatrix*toonPosition;
        #endif
        vToonWorld=(modelMatrix*toonPosition).xyz;
        ${material.userData.artBounds?`vec3 artRel=(position-uArtLocalMin)/max(uArtLocalSize,vec3(.01));vRelativeHeight=clamp(artRel.y,0.,1.);
        vec3 artEnvelope=normalize(vec3((artRel.x-.5)*1.8,(artRel.y-uArtCrown)*2.5+.13,(artRel.z-.5)*1.8)+vec3(0.,.0001,0.));
        #ifdef USE_INSTANCING
          vec3 artScale2=vec3(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz));
          artEnvelope=mat3(instanceMatrix)*(artEnvelope/max(artScale2,vec3(.0001)));
        #endif
        vCanopyNormal=normalize(inverseTransformDirection(normalMatrix*artEnvelope,viewMatrix));`:''}
        ${material.isMeshBasicMaterial?'vToonLowNormal=inverseTransformDirection(normalMatrix*normal,viewMatrix);':''}`);
      shader.fragmentShader=(material.isMeshBasicMaterial?'varying vec3 vToonLowNormal;\n':'')+worldPatternFunctions+'varying vec3 vToonWorld;uniform float uNight,uNightLight,uExposure,uKind,uSurfaceType,uWet,uBiome,uGroundDetail,uFineNoise,uEnvEndpoints;uniform vec3 uLightDir;\n'+diagnosticToon+'\n'+shader.fragmentShader;
      shader.fragmentShader='uniform sampler2D uEnvDay,uEnvNight;uniform float uEnvYaw,uNativeEnvEnabled;\n'+shader.fragmentShader;
      // The source returns HDR radiance, which africanToon4 grades itself.
      shader.fragmentShader=shader.fragmentShader.replace('void main() {',endpointFunctions+'\n'+(material.userData.toonGround?'uniform sampler2D uContactMap;uniform vec4 uContactBounds;uniform float uContactOn;\n'+diagnosticGroundNoise(groundLightingFunctions.replace('materialNoise(worldP*.32),fine=materialNoise(worldP*2.6)','materialNoise(worldPatternPosition(worldP)*.32),fine=materialNoise(worldPatternPosition(worldP)*2.6)').replace('sin(worldP.z*.024)','sin(worldPatternPosition(worldP).z*.024)')):'')+'\n'+(material.userData.biomeGround?groundMaterialFunctions+(material.userData.biomeGround.uGroundLayered?.value?savannaLayerFunctions:''):'')+'\n'+(material.userData.artBounds?'uniform vec3 uArtSun,uArtShade,uArtFoliage;uniform vec4 uArtParams,uArtShape;uniform float uArtHighlight,uArtVolcanicGlow;varying vec3 vCanopyNormal;varying float vRelativeHeight;\n'+(material.userData.visualLabNormalDetail?normalDetailLightingFunctions:artLightingFunctions):'')+'\n'+(material.userData.nativeSurface?diagnosticVolcanic:'')+'\nvoid main() {');
      if(material.userData.horizonBounds){
        shader.uniforms.uHorizonBounds={value:material.userData.horizonBounds};shader.fragmentShader='uniform vec4 uHorizonBounds;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          if(vToonWorld.x>=uHorizonBounds.x&&vToonWorld.z>=uHorizonBounds.y&&vToonWorld.x<uHorizonBounds.z&&vToonWorld.z<uHorizonBounds.w)discard;`);
      }
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',material.userData.toonGround?`
        vec3 toonV=normalize(cameraPosition-vToonWorld);
        vec3 toonN=${material.isMeshBasicMaterial?'normalize(vToonLowNormal)':'inverseTransformDirection(normal,viewMatrix)'};
        if(!gl_FrontFacing)toonN=-toonN;
        vec3 groundColor=${material.userData.nativeGroundColor?'diffuseColor.rgb':'pow(max(diffuseColor.rgb,vec3(0.)),vec3(1./2.2))'};
        float groundRough,groundWet;
        ${material.userData.biomeGround?material.userData.biomeGround.uGroundLayered?.value?`groundRough=1.;groundWet=0.;groundSavannaLayer(vToonWorld,toonN,groundColor,toonN,groundRough,groundWet);`:`groundRough=1.;groundWet=0.;groundMaterial417(vToonWorld,toonN,groundColor,toonN,groundRough,groundWet);`:`nativeGroundSurface4(vToonWorld,groundColor,toonN,groundRough,groundWet,uBiome>3.5&&uBiome<4.5?1.:0.,uBiome>4.5?1.:0.,uGroundDetail);`}
        vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));
        float groundVisibility=1.;
        ${material.isMeshBasicMaterial?'':`#if NUM_DIR_LIGHT_SHADOWS > 0 && defined(USE_SHADOWMAP)
          groundVisibility=1.-nativeShadowOcclusion(toonN,vToonWorld)*.93;
        #endif`}
        vec3 groundReflection=uNativeEnvEnabled>.5?environment4(reflect(-toonV,toonN),groundRough):vec3(0.);
        vec3 groundLit=nativeGroundLight4(groundAlbedo,toonN,toonV,groundRough,groundVisibility,groundReflection,nativeContact4(vToonWorld));
        ${material.userData.biomeGround?`
        if(uBiome<4.5){
          vec3 biomeSun=mix(vec3(3.65,3.30,2.78),vec3(.22,.36,.66)*uNightLight,uNight);
          vec3 biomeAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);
          vec3 biomeDirect=brdf4(toonN,toonV,uLightDir,groundAlbedo,groundRough,0.)*biomeSun*groundVisibility;
          vec3 biomeSpec=groundReflection*fresnel4(max(dot(toonN,toonV),0.),vec3(.04))*(1.-groundRough*.72)*.48;
          float biomeAO=nativeContact4(vToonWorld)*materialAO410;
          groundLit=biomeDirect*mix(.48,1.,materialAO410)+groundAlbedo*biomeAmbient*biomeAO*(.76+.24*clamp(toonN.y,0.,1.))+biomeSpec*biomeAO;
          outgoingLight=toLinear4(filmic4(groundLit));
        }else outgoingLight=toLinear4(africanToon4(groundLit,groundAlbedo,toonN,toonV,uLightDir,groundReflection,groundRough,groundVisibility,0.,groundWet,0.,max(dot(toonN,toonV),0.),worldPatternPosition(vToonWorld)));
        `:`outgoingLight=toLinear4(africanToon4(groundLit,groundAlbedo,toonN,toonV,uLightDir,groundReflection,groundRough,groundVisibility,0.,groundWet,0.,max(dot(toonN,toonV),0.),worldPatternPosition(vToonWorld)));`}
        #include <opaque_fragment>
      `:`
        vec3 toonN=inverseTransformDirection(normal,viewMatrix);
        vec3 toonV=normalize(cameraPosition-vToonWorld);
        float toonVisibility=1.0;
        #if NUM_DIR_LIGHT_SHADOWS > 0 && defined(USE_SHADOWMAP)
          // Standard lighting and object grading use the same unmodified normal.
          toonVisibility=receiveShadow?nativeDirectVisibility:1.;
        #endif
        float toonLeaf=${material.userData.artSurface===5?'0.':material.userData.nativeSurface?'nativeLeaf':'smoothstep(.018,.13,diffuseColor.g-diffuseColor.r*.87)*smoothstep(.06,.20,diffuseColor.g)'};
        vec3 toonReflection=uNativeEnvEnabled>.5?environment4(reflect(-toonV,toonN),roughnessFactor):reflectedLight.indirectSpecular;
        ${material.userData.nativeSurface?'vec3 nativeEmission=uNativeVolcanicGlow>.5?nativeVolcanic4(nativeGlowTexel):vec3(0.);':''}
        ${material.userData.artBounds?`vec3 artGeometric=inverseTransformDirection(normalize(vNormal),viewMatrix);if(!gl_FrontFacing)artGeometric=-artGeometric;toonN=normalize(mix(artGeometric,toonN,mix(${material.userData.visualLabNormal?'.92':'.68'},.10,toonLeaf)));toonN=normalize(mix(toonN,normalize(vCanopyNormal),toonLeaf*uArtShape.x));`:''}
        outgoingLight=toLinear4(${material.userData.nativeSurface?'africanToonEmission4':'africanToon4'}(outgoingLight,diffuseColor.rgb,toonN,toonV,uLightDir,toonReflection,roughnessFactor,toonVisibility,toonLeaf,${material.userData.toonGround?'uWet*(1.-toonLeaf*.35)':material.userData.nativeSurface?'nativeWet':'0.0'},metalnessFactor,max(dot(toonN,toonV),0.0),worldPatternPosition(vToonWorld)${material.userData.nativeSurface?',nativeEmission':''}))+totalEmissiveRadiance;
        ${material.userData.artBounds?`outgoingLight=toLinear4(artLighting416(sRGBTransferOETF(vec4(diffuseColor.rgb,1.)).rgb,artGeometric,toonN,toonV,toonLeaf,roughnessFactor,${material.userData.nativeSurface?'mix(.80,1.,smoothstep(0.,.22,nativeRelH))':'1.'},(1.-toonVisibility)/.93));`:''}
        #include <opaque_fragment>`);

    };
    if(material.userData.toonGround&&material.userData.biomeGround&&material.userData.riverSoil){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=patchRiverSoil(shader.fragmentShader);};
    }
    if(material.userData.toonGround&&material.userData.biomeGround&&material.userData.mangroveSubstrate){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=patchMangroveSubstrate(shader.fragmentShader);};
    }
    if(this.globalVisualLighting&&material.userData.toonGround&&['savanna','grand_river','mangrove','canyons'].includes(material.userData.groundBiome)){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=patchGlobalGroundFill(shader.fragmentShader,ART_PROFILES[material.userData.groundBiome].shade);};
    }
    if(this.globalVisualLighting&&material.userData.toonGround&&material.userData.groundBiome==='volcanoes'){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=patchVolcanicCharcoal(shader.fragmentShader);shader.fragmentShader=patchVolcanicAsh(shader.fragmentShader,material.userData.volcanicAsh);shader.fragmentShader=patchVolcanicRock(shader.fragmentShader,material.userData.volcanicRock);if(this.volcanicNightAmbient&&material.userData.biomeGround)shader.fragmentShader=patchVolcanicNightAmbient(shader.fragmentShader,this.volcanicNightSpectrum);};
    }
    if(this.globalVisualLighting&&material.userData.toonGround&&material.userData.biomeGround&&['savanna','grand_river','canyons'].includes(material.userData.groundBiome)){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=patchDryGroundRoughness(shader.fragmentShader);};
    }
    if(this.globalVisualLighting&&material.userData.toonGround&&material.userData.groundBiome==='canyons'&&material.userData.biomeGround?.uCliffRock){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=patchCanyonRock(shader.fragmentShader);};
    }
    material.onBeforeCompile=((compile)=>(shader,renderer)=>{compile(shader,renderer);patchNativeShadow(shader,this.shadowUniforms,'vToonWorld');})(material.onBeforeCompile);
    if(this.globalVisualLighting&&material.userData.toonGround&&material.userData.groundBiome==='desert'){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=patchDesertLight(shader.fragmentShader);};
    }
    if(this.globalVisualLighting&&material.userData.toonGround&&material.userData.desertSand){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=patchDesertSand(shader.fragmentShader,this.desertResidualWear);if(this.desertMeso)shader.fragmentShader=patchDesertMeso(shader.fragmentShader);};
    }
    if(this.globalVisualLighting&&material.userData.toonGround&&material.userData.canyonSand){
      const compile=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.fragmentShader=patchCanyonSand(shader.fragmentShader,material.userData.canyonSandFull,material.userData.canyonSandSoft);};
    }
    recordNativeDepthHook(material,original,'toon',...(material.userData.horizonBounds?['horizon']:[]));
    material.customProgramCacheKey=()=>cache()+atmosphereCacheKey+(this.desertMeso?'|desert-meso-filter-v1':'')+(this.desertResidualWear?'|desert-residual-wear-v1':'')+(this.volcanicNightSpectrum?'|volcanic-night-spectrum-v1':this.volcanicNightAmbient?'|volcanic-night-ambient-v1':'')+(material.userData.volcanicRock?'|volcanic-rock-layered-v1':'')+(material.userData.riverSoil?'|river-soil-v2':'')+(material.userData.mangroveSubstrate?'|mangrove-substrate-full-v1':'')+(material.userData.canyonSand?'|canyon-sand-v2:'+Boolean(material.userData.canyonSandFull):'')+(material.userData.canyonSandSoft?'|canyon-sand-soft-v1':'')+(material.userData.volcanicAsh?'|volcanic-ash-v1:'+material.userData.volcanicAsh:'')+(material.userData.desertSand?'|desert-sand-v1':'')+(material.userData.biomeGround?.uCliffRock?'|cliff-rock-v1':'')+(this.globalVisualLighting?'|global-visual-lighting|desert-soft-v1|'+(material.userData.groundBiome??'object'):'')+'|african-toon-v4.1.4|native-pcf-relative|fine-noise-diagnostic|hdr-endpoints|'+(material.userData.biomeGround?'biome-ground-4.1.10.3':material.userData.toonGround?'ground':'object')+'|'+(material.userData.biomeGround?.uGroundLayered?.value?'visual-layer':'base-ground')+'|'+(material.userData.artBounds?'illustrated-4.1.6':'toon-4.1.4')+'|'+(material.userData.visualLabNormalDetail?'visual-normal-detail':material.userData.visualLabNormal?'visual-normal':'authored-normal')+'|'+material.type+'|'+(material.userData.horizonBounds?'horizon-clip':'resident');
    // The source function already applies its filmic curve. Three still performs
    // output color conversion and fog, without applying a second tone curve.
    material.toneMapped=false;material.needsUpdate=true;
  }
  apply(root){root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])this.material(m);});}
}

// DEST keeps its original damage field, textures, cut-outs, collapse and emission.
export function toonDestruction(fragment){
  return fragment.replace('out vec4 fragColor;', worldPatternFunctions+'uniform mat4 uToonModel;uniform float uNight,uNightLight,uExposure,uKind,uSurfaceType,uFineNoise,uEnvEndpoints,uNativeEnvEnabled,uEnvYaw;uniform sampler2D uEnvDay,uEnvNight;\n#define uLightDir uSun\n'+diagnosticToon+'\n'+endpointFunctions+'\nout vec4 fragColor;')
    .replace('toSRGB(tonemap(color))','africanToon4(color,base,N,V,L,uNativeEnvEnabled>.5?environment4(normalize(mat3(uToonModel)*reflect(-V,N)),rough):vec3(0.),rough,sh,0.,0.,metal,max(dot(N,V),0.),worldPatternPosition((uToonModel*vec4(vWorld,1.)).xyz))+toSRGB(emit)');
}

export function toonDebris(vertex,fragment){
  vertex=vertex.replace('uniform mat4 uVP;', 'out vec3 vDebrisPosition,vDebrisNormal,vDebrisBase;uniform mat4 uVP;')
    .replace('vColor=aColor*(', 'vDebrisPosition=p;vDebrisNormal=n;vDebrisBase=aColor;vColor=aColor*(');
  const declarations=worldPatternFunctions+'in vec3 vDebrisPosition,vDebrisNormal,vDebrisBase;uniform mat4 uToonModel;uniform vec3 uEye,uSun;uniform float uNight,uNightLight,uExposure,uKind,uSurfaceType,uFineNoise,uEnvEndpoints,uNativeEnvEnabled,uEnvYaw;uniform sampler2D uEnvDay,uEnvNight;\n#define uLightDir uSun\n';
  fragment=fragment.replace('out vec4 fragColor;', 'out vec4 fragColor;\n'+declarations+diagnosticToon+'\n'+endpointFunctions)
    .replace('pow(x,vec3(1./2.2))',`africanToon4(vColor,toLinear4(vDebrisBase),N,V,normalize(uSun),uNativeEnvEnabled>.5?environment4(normalize(mat3(uToonModel)*reflect(-V,N)),.9):vec3(0.),.9,1.,0.,0.,0.,max(dot(N,V),0.),worldPatternPosition((uToonModel*vec4(vDebrisPosition,1.)).xyz))`)
    .replace('void main(){', 'void main(){vec3 N=normalize(vDebrisNormal);if(!gl_FrontFacing)N=-N;vec3 V=normalize(uEye-vDebrisPosition);');
  return {vertex,fragment};
}

export function paintedWaterMaterial(color,lava=false,seed=42,bounds=null,lighting=null,clipOutside=false){
  const material=new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.1,side:THREE.DoubleSide});
  const originalDepthHook=material.onBeforeCompile;
  const experimentalWater=!!lighting?.globalWaterSurface&&!lava;
  const waterSlope=experimentalWater?acquireWaterSlope(lighting,material):null;
  if(waterSlope)material.userData.globalWaterSlope=waterSlope;
  const shadowUniforms=lighting?.shadowUniforms??createNativeShadowUniforms();if(!lighting?.shadowUniforms)material.addEventListener('dispose',()=>shadowUniforms.fallback.dispose());
  const uniforms={uTime:{value:0},uWaterScale:{value:WATER_DEFAULTS.scale},uAmplitude:{value:WATER_DEFAULTS.amplitude},uStrokeWidth:{value:WATER_DEFAULTS.strokeWidth},uHandmade:{value:WATER_DEFAULTS.handmade},uPigment:{value:0},uMotifs:{value:0},uSeedOffset:{value:new THREE.Vector2(...waterSeed(seed))}};
  waterPalette(color,lava).forEach((ink,i)=>uniforms['uInk'+i]={value:new THREE.Vector3(...ink)});
  uniforms.uFluidClip={value:bounds?(clipOutside?2:1):0};uniforms.uFluidBounds={value:new THREE.Vector4(...(bounds??[-1e8,-1e8,1e8,1e8]))};
  Object.assign(uniforms,{uEnvEndpoints:lighting?.uniforms.uEnvEndpoints??{value:1},uWorldOrigin:lighting?.uniforms.uWorldOrigin??{value:new THREE.Vector2()},uEnvDay:{value:lighting?.textures[0]??null},uEnvNight:{value:lighting?.textures[1]??null},uEnvYaw:lighting?.yaw??{value:0},uNight:lighting?.uniforms.uNight??{value:0},uNightLight:lighting?.uniforms.uNightLight??{value:1.12},uLightDir:lighting?.uniforms.uLightDir??{value:new THREE.Vector3(-30,55,25).normalize()},uExposure:{value:1},uKind:{value:1},uSurfaceLava:{value:lava?1:0}});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 vPaintWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 paintPosition=vec4(transformed,1.0);
      #ifdef USE_BATCHING
        paintPosition=batchingMatrix*paintPosition;
      #endif
      #ifdef USE_INSTANCING
        paintPosition=instanceMatrix*paintPosition;
      #endif
      vPaintWorld=(modelMatrix*paintPosition).xyz;`);
    shader.fragmentShader=worldPatternFunctions+'varying vec3 vPaintWorld;uniform float uWaterScale,uFluidClip,uEnvYaw,uEnvEndpoints,uNight,uNightLight,uExposure,uKind,uSurfaceLava;uniform vec3 uLightDir;uniform sampler2D uEnvDay,uEnvNight;uniform vec4 uFluidBounds;\n'+waterFunctions+'\n'+endpointFluidFunctions.replace('vec2 uWorldOrigin=vec2(0.);','').replace('sin(worldP.x*.43+worldP.z*.18+uTime*.40)','sin(worldPatternPosition(worldP).x*.43+worldPatternPosition(worldP).z*.18+uTime*.40)').replace('cos(worldP.z*.37-worldP.x*.16-uTime*.32)','cos(worldPatternPosition(worldP).z*.37-worldPatternPosition(worldP).x*.16-uTime*.32)')+'\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(uFluidClip>.5){bool inside=vPaintWorld.x>=uFluidBounds.x&&vPaintWorld.z>=uFluidBounds.y&&vPaintWorld.x<uFluidBounds.z&&vPaintWorld.z<uFluidBounds.w;if((uFluidClip<1.5&&!inside)||(uFluidClip>1.5&&inside))discard;}`);

    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      float fluidVisibility=1.;
      #if NUM_DIR_LIGHT_SHADOWS > 0 && defined(USE_SHADOWMAP)
        fluidVisibility=1.-nativeShadowOcclusion(inverseTransformDirection(normal,viewMatrix),vPaintWorld)*.93;
      #endif
      outgoingLight=sRGBTransferEOTF(vec4(nativeFluid4(vPaintWorld,normalize(cameraPosition-vPaintWorld),fluidVisibility),1.)).rgb;
      #include <opaque_fragment>`);
  };
  if(waterSlope){const compile=material.onBeforeCompile;material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.uniforms.uGlobalWaterSlope=waterSlope;shader.fragmentShader=patchGlobalWaterSurface(shader.fragmentShader);};}
  material.onBeforeCompile=((compile)=>(shader,renderer)=>{compile(shader,renderer);patchNativeShadow(shader,shadowUniforms,'vPaintWorld');})(material.onBeforeCompile);
  material.toneMapped=false;material.customProgramCacheKey=()=>lava?'african-lava-relative-v4.1.4|hdr-endpoints':'african-water-relative-v4.1.4|hdr-endpoints'+atmosphereCacheKey+(experimentalWater?'|global-water-slope-map':'');
  material.userData.paintUniforms=uniforms;recordNativeFluidDepthHook(material,originalDepthHook,uniforms);return material;
}
