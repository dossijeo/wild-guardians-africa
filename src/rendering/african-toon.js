import * as THREE from 'three';
import {toonFunctions,waterFunctions} from './african-toon-source.js';

// Shared by the world renderer only. The original menu owns a separate renderer.
export class AfricanToon {
  constructor(){
    this.uniforms={uWet:{value:0},uNight:{value:0},uNightLight:{value:1},uExposure:{value:1.15},uLightDir:{value:new THREE.Vector3(-30,55,25).normalize()},uKind:{value:0},uSurfaceType:{value:1}};
    this.materials=new WeakSet();
  }
  update(night,sun,biome){this.uniforms.uWet.value=biome==='manglares'?.72:biome==='gran-rio'?.25:0;this.uniforms.uNight.value=night?1:0;this.uniforms.uLightDir.value.copy(sun.position).sub(sun.target.position).normalize();}
  material(material){
    if(!material?.isMeshStandardMaterial||material.transparent||material.userData.paintUniforms||this.materials.has(material))return;
    this.materials.add(material);
    const original=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
    material.onBeforeCompile=(shader,renderer)=>{
      original.call(material,shader,renderer);Object.assign(shader.uniforms,this.uniforms);shader.uniforms.uSurfaceType={value:material.userData.toonGround?0:1};
      shader.vertexShader='varying vec3 vToonWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 toonPosition=vec4(transformed,1.0);
        #ifdef USE_BATCHING
          toonPosition=batchingMatrix*toonPosition;
        #endif
        #ifdef USE_INSTANCING
          toonPosition=instanceMatrix*toonPosition;
        #endif
        vToonWorld=(modelMatrix*toonPosition).xyz;`);
      shader.fragmentShader='varying vec3 vToonWorld;uniform float uNight,uNightLight,uExposure,uKind,uSurfaceType,uWet;uniform vec3 uLightDir;\n'+toonFunctions+'\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec3 toonN=inverseTransformDirection(normal,viewMatrix);
        vec3 toonV=normalize(cameraPosition-vToonWorld);
        float toonVisibility=1.0;
        #if NUM_DIR_LIGHT_SHADOWS > 0 && defined(USE_SHADOWMAP)
          toonVisibility=getShadowMask();
        #endif
        float toonLeaf=smoothstep(.018,.13,diffuseColor.g-diffuseColor.r*.87)*smoothstep(.06,.20,diffuseColor.g);
        vec3 toonReflection=reflectedLight.indirectSpecular;
        outgoingLight=toLinear4(africanToon4(outgoingLight,diffuseColor.rgb,toonN,toonV,uLightDir,toonReflection,roughnessFactor,toonVisibility,toonLeaf,${material.userData.toonGround?'uWet*(1.-toonLeaf*.35)':'0.0'},metalnessFactor,max(dot(toonN,toonV),0.0),vToonWorld))+totalEmissiveRadiance;
        #include <opaque_fragment>`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>','#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>');
    };
    material.customProgramCacheKey=()=>cache()+'|african-toon-v4.1.4';
    // The source function already applies its filmic curve. Three still performs
    // output color conversion and fog, without applying a second tone curve.
    material.toneMapped=false;material.needsUpdate=true;
  }
  apply(root){root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])this.material(m);});}
}

// DEST keeps its original damage field, textures, cut-outs, collapse and emission.
export function toonDestruction(fragment){
  return fragment.replace('out vec4 fragColor;', 'uniform mat4 uToonModel;uniform float uNight,uNightLight,uExposure,uKind,uSurfaceType;\n#define uLightDir uSun\n'+toonFunctions+'\nout vec4 fragColor;')
    .replace('toSRGB(tonemap(color))','africanToon4(color,base,N,V,L,vec3(0.),rough,sh,0.,0.,metal,max(dot(N,V),0.),(uToonModel*vec4(vWorld,1.)).xyz)+toSRGB(emit)');
}

export function paintedWaterMaterial(color,lava=false){
  const material=new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.1,side:THREE.DoubleSide});
  const uniforms={uTime:{value:0},uAmplitude:{value:1},uStrokeWidth:{value:1},uHandmade:{value:.5},uPigment:{value:0},uMotifs:{value:0},uSeedOffset:{value:new THREE.Vector2()},uInk0:{value:new THREE.Color(lava?'#281916':color)},uInk1:{value:new THREE.Color(lava?'#682817':color).multiplyScalar(1.2)},uInk2:{value:new THREE.Color(lava?'#ed5a12':'#71aea9')},uInk3:{value:new THREE.Color(lava?'#ffc859':'#e1dcc4')}};
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 vPaintWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader='varying vec3 vPaintWorld;\n'+waterFunctions+'\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb='+ (lava?'paintedLava(vPaintWorld.zx*vec2(.88,1.8))':'paintedWater(vPaintWorld.zx*vec2(.22,.45),.001)')+';');
    if(lava)shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*1.4;');
  };
  material.customProgramCacheKey=()=>lava?'african-lava-v4.1.4':'african-water-v4.1.4';
  material.userData.paintUniforms=uniforms;return material;
}
