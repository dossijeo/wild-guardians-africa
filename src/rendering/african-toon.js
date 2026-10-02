import * as THREE from 'three';
import {toonFunctions,waterFunctions} from './african-toon-source.js';
import {WATER_DEFAULTS,waterPalette,waterSeed} from './world-atmosphere.js';
import {fluidLightingFunctions,environmentFunctions} from './fluid-lighting-source.js';
import {groundLightingFunctions} from './ground-lighting-source.js';
import {volcanicFunctions} from './volcanic-source.js';
import {createNativeShadowUniforms,patchNativeShadow} from './native-shadow.js';

// Shared by the world renderer only. The original menu owns a separate renderer.
export class AfricanToon {
  constructor(){
    this.uniforms={uBiome:{value:0},uWet:{value:0},uNight:{value:0},uNightLight:{value:1},uExposure:{value:1},uLightDir:{value:new THREE.Vector3(-30,55,25).normalize()},uKind:{value:0},uSurfaceType:{value:1},uGroundDetail:{value:1}};
    this.materials=new WeakSet();this.shadowUniforms=createNativeShadowUniforms();
    this.contactUniforms={uContactMap:{value:null},uContactBounds:{value:new THREE.Vector4(0,0,1,1)},uContactOn:{value:0}};
    this.environmentUniforms={uNativeEnvEnabled:{value:0},uEnvDay:{value:null},uEnvNight:{value:null},uEnvYaw:{value:0}};
  }
  environment(textures,yaw){const u=this.environmentUniforms;u.uEnvDay.value=textures?.[0]??null;u.uEnvNight.value=textures?.[1]??null;u.uNativeEnvEnabled.value=textures?.length===2?1:0;this.environmentYaw=yaw;u.uEnvYaw.value=yaw?.value??0;}
  update(night,sun,biome){this.uniforms.uBiome.value=['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'].indexOf(biome);this.uniforms.uWet.value=biome==='manglares'?.72:biome==='gran-rio'?.25:0;this.uniforms.uNight.value=Number(night);this.uniforms.uNightLight.value=1.12;this.uniforms.uLightDir.value.copy(sun.position).sub(sun.target.position).normalize();this.environmentUniforms.uEnvYaw.value=this.environmentYaw?.value??0;}
  material(material){
    if(!(material?.isMeshStandardMaterial||material?.isMeshBasicMaterial&&material.userData.toonGround)||material.transparent||material.userData.paintUniforms||this.materials.has(material))return;
    this.materials.add(material);
    const original=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
    material.onBeforeCompile=(shader,renderer)=>{
      original.call(material,shader,renderer);Object.assign(shader.uniforms,this.uniforms,this.environmentUniforms);if(material.userData.toonGround)Object.assign(shader.uniforms,this.contactUniforms);shader.uniforms.uSurfaceType={value:material.userData.toonGround?0:material.userData.nativeSurface?.type??1};
      shader.vertexShader='varying vec3 vToonWorld;\n'+(material.isMeshBasicMaterial?'varying vec3 vToonLowNormal;\n':'')+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 toonPosition=vec4(transformed,1.0);
        #ifdef USE_BATCHING
          toonPosition=batchingMatrix*toonPosition;
        #endif
        #ifdef USE_INSTANCING
          toonPosition=instanceMatrix*toonPosition;
        #endif
        vToonWorld=(modelMatrix*toonPosition).xyz;
        ${material.isMeshBasicMaterial?'vToonLowNormal=inverseTransformDirection(normalMatrix*normal,viewMatrix);':''}`);
      shader.fragmentShader=(material.isMeshBasicMaterial?'varying vec3 vToonLowNormal;\n':'')+'varying vec3 vToonWorld;uniform float uNight,uNightLight,uExposure,uKind,uSurfaceType,uWet,uBiome,uGroundDetail;uniform vec3 uLightDir;\n'+toonFunctions+'\n'+shader.fragmentShader;
      shader.fragmentShader='uniform sampler2D uEnvDay,uEnvNight;uniform float uEnvYaw,uNativeEnvEnabled;\n'+shader.fragmentShader;
      // The source returns HDR radiance, which africanToon4 grades itself.
      shader.fragmentShader=shader.fragmentShader.replace('void main() {',environmentFunctions+'\n'+(material.userData.toonGround?'uniform sampler2D uContactMap;uniform vec4 uContactBounds;uniform float uContactOn;\n'+groundLightingFunctions:'')+'\n'+(material.userData.nativeSurface?volcanicFunctions:'')+'\nvoid main() {');
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
        nativeGroundSurface4(vToonWorld,groundColor,toonN,groundRough,groundWet,uBiome>3.5&&uBiome<4.5?1.:0.,uBiome>4.5?1.:0.,uGroundDetail);
        vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));
        float groundVisibility=1.;
        ${material.isMeshBasicMaterial?'':`#if NUM_DIR_LIGHT_SHADOWS > 0 && defined(USE_SHADOWMAP)
          groundVisibility=1.-nativeShadowOcclusion(toonN,vToonWorld)*.93;
        #endif`}
        vec3 groundReflection=uNativeEnvEnabled>.5?environment4(reflect(-toonV,toonN),groundRough):vec3(0.);
        vec3 groundLit=nativeGroundLight4(groundAlbedo,toonN,toonV,groundRough,groundVisibility,groundReflection,nativeContact4(vToonWorld));
        outgoingLight=toLinear4(africanToon4(groundLit,groundAlbedo,toonN,toonV,uLightDir,groundReflection,groundRough,groundVisibility,0.,groundWet,0.,max(dot(toonN,toonV),0.),vToonWorld));
        #include <opaque_fragment>
      `:`
        vec3 toonN=inverseTransformDirection(normal,viewMatrix);
        vec3 toonV=normalize(cameraPosition-vToonWorld);
        float toonVisibility=1.0;
        #if NUM_DIR_LIGHT_SHADOWS > 0 && defined(USE_SHADOWMAP)
          toonVisibility=receiveShadow?1.-nativeShadowOcclusion(toonN,vToonWorld):1.;
        #endif
        float toonLeaf=${material.userData.nativeSurface?'nativeLeaf':'smoothstep(.018,.13,diffuseColor.g-diffuseColor.r*.87)*smoothstep(.06,.20,diffuseColor.g)'};
        vec3 toonReflection=uNativeEnvEnabled>.5?environment4(reflect(-toonV,toonN),roughnessFactor):reflectedLight.indirectSpecular;
        ${material.userData.nativeSurface?'vec3 nativeEmission=uNativeVolcanicGlow>.5?nativeVolcanic4(nativeGlowTexel):vec3(0.);':''}
        outgoingLight=toLinear4(${material.userData.nativeSurface?'africanToonEmission4':'africanToon4'}(outgoingLight,diffuseColor.rgb,toonN,toonV,uLightDir,toonReflection,roughnessFactor,toonVisibility,toonLeaf,${material.userData.toonGround?'uWet*(1.-toonLeaf*.35)':material.userData.nativeSurface?'nativeWet':'0.0'},metalnessFactor,max(dot(toonN,toonV),0.0),vToonWorld${material.userData.nativeSurface?',nativeEmission':''}))+totalEmissiveRadiance;
        #include <opaque_fragment>`);

    };
    material.onBeforeCompile=((compile)=>(shader,renderer)=>{compile(shader,renderer);patchNativeShadow(shader,this.shadowUniforms,'vToonWorld');})(material.onBeforeCompile);
    material.customProgramCacheKey=()=>cache()+'|african-toon-v4.1.4|native-pcf|'+(material.userData.toonGround?'ground':'object')+'|'+material.type+'|'+(material.userData.horizonBounds?'horizon-clip':'resident');
    // The source function already applies its filmic curve. Three still performs
    // output color conversion and fog, without applying a second tone curve.
    material.toneMapped=false;material.needsUpdate=true;
  }
  apply(root){root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])this.material(m);});}
}

// DEST keeps its original damage field, textures, cut-outs, collapse and emission.
export function toonDestruction(fragment){
  return fragment.replace('out vec4 fragColor;', 'uniform mat4 uToonModel;uniform float uNight,uNightLight,uExposure,uKind,uSurfaceType,uNativeEnvEnabled,uEnvYaw;uniform sampler2D uEnvDay,uEnvNight;\n#define uLightDir uSun\n'+toonFunctions+'\n'+environmentFunctions+'\nout vec4 fragColor;')
    .replace('toSRGB(tonemap(color))','africanToon4(color,base,N,V,L,uNativeEnvEnabled>.5?environment4(normalize(mat3(uToonModel)*reflect(-V,N)),rough):vec3(0.),rough,sh,0.,0.,metal,max(dot(N,V),0.),(uToonModel*vec4(vWorld,1.)).xyz)+toSRGB(emit)');
}

export function toonDebris(vertex,fragment){
  vertex=vertex.replace('uniform mat4 uVP;', 'out vec3 vDebrisPosition,vDebrisNormal,vDebrisBase;uniform mat4 uVP;')
    .replace('vColor=aColor*(', 'vDebrisPosition=p;vDebrisNormal=n;vDebrisBase=aColor;vColor=aColor*(');
  const declarations='in vec3 vDebrisPosition,vDebrisNormal,vDebrisBase;uniform mat4 uToonModel;uniform vec3 uEye,uSun;uniform float uNight,uNightLight,uExposure,uKind,uSurfaceType,uNativeEnvEnabled,uEnvYaw;uniform sampler2D uEnvDay,uEnvNight;\n#define uLightDir uSun\n';
  fragment=fragment.replace('out vec4 fragColor;', 'out vec4 fragColor;\n'+declarations+toonFunctions+'\n'+environmentFunctions)
    .replace('pow(x,vec3(1./2.2))',`africanToon4(vColor,toLinear4(vDebrisBase),N,V,normalize(uSun),uNativeEnvEnabled>.5?environment4(normalize(mat3(uToonModel)*reflect(-V,N)),.9):vec3(0.),.9,1.,0.,0.,0.,max(dot(N,V),0.),(uToonModel*vec4(vDebrisPosition,1.)).xyz)`)
    .replace('void main(){', 'void main(){vec3 N=normalize(vDebrisNormal);if(!gl_FrontFacing)N=-N;vec3 V=normalize(uEye-vDebrisPosition);');
  return {vertex,fragment};
}

export function paintedWaterMaterial(color,lava=false,seed=42,bounds=null,lighting=null,clipOutside=false){
  const material=new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.1,side:THREE.DoubleSide});
  const shadowUniforms=lighting?.shadowUniforms??createNativeShadowUniforms();if(!lighting?.shadowUniforms)material.addEventListener('dispose',()=>shadowUniforms.fallback.dispose());
  const uniforms={uTime:{value:0},uWaterScale:{value:WATER_DEFAULTS.scale},uAmplitude:{value:WATER_DEFAULTS.amplitude},uStrokeWidth:{value:WATER_DEFAULTS.strokeWidth},uHandmade:{value:WATER_DEFAULTS.handmade},uPigment:{value:0},uMotifs:{value:0},uSeedOffset:{value:new THREE.Vector2(...waterSeed(seed))}};
  waterPalette(color,lava).forEach((ink,i)=>uniforms['uInk'+i]={value:new THREE.Vector3(...ink)});
  uniforms.uFluidClip={value:bounds?(clipOutside?2:1):0};uniforms.uFluidBounds={value:new THREE.Vector4(...(bounds??[-1e8,-1e8,1e8,1e8]))};
  Object.assign(uniforms,{uEnvDay:{value:lighting?.textures[0]??null},uEnvNight:{value:lighting?.textures[1]??null},uEnvYaw:lighting?.yaw??{value:0},uNight:lighting?.uniforms.uNight??{value:0},uNightLight:lighting?.uniforms.uNightLight??{value:1.12},uLightDir:lighting?.uniforms.uLightDir??{value:new THREE.Vector3(-30,55,25).normalize()},uExposure:{value:1},uKind:{value:1},uSurfaceLava:{value:lava?1:0}});
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
    shader.fragmentShader='varying vec3 vPaintWorld;uniform float uWaterScale,uFluidClip,uEnvYaw,uNight,uNightLight,uExposure,uKind,uSurfaceLava;uniform vec3 uLightDir;uniform sampler2D uEnvDay,uEnvNight;uniform vec4 uFluidBounds;\n'+waterFunctions+'\n'+fluidLightingFunctions+'\n'+shader.fragmentShader;
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
  material.onBeforeCompile=((compile)=>(shader,renderer)=>{compile(shader,renderer);patchNativeShadow(shader,shadowUniforms,'vPaintWorld');})(material.onBeforeCompile);
  material.toneMapped=false;material.customProgramCacheKey=()=>lava?'african-lava-hdr-v4.1.4':'african-water-hdr-v4.1.4';
  material.userData.paintUniforms=uniforms;return material;
}
