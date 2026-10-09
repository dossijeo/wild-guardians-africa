import * as THREE from 'three';
import {nativeDepthRecipe} from './depth-recipes.js';
import {nativeAssetClipFragment} from './asset-clip.js';
import {coverageThreshold} from './obstruction-source.js';
import {surfaceMapBias,surfaceMapFragment} from './surface-alpha.js';

const cache=new WeakMap();
const properties=['side','depthFunc','depthTest','depthWrite','opacity','alphaTest','alphaToCoverage','alphaMap','map','displacementMap','displacementScale','displacementBias','vertexColors','wireframe','wireframeLinewidth'];
export function standardDepthMaterial(source){
  if(!(source.isMeshStandardMaterial||source.isMeshBasicMaterial)||source.transparent||source.alphaHash||source.polygonOffset||source.clippingPlanes?.length)return null;
  const recipe=nativeDepthRecipe(source);if(!recipe)return null;
  const fluid=recipe.features.has('painted-fluid-clip')?recipe.fluidUniforms:null;
  if(recipe.features.has('painted-fluid-clip')&&(!fluid?.uFluidClip||!fluid?.uFluidBounds))return null;
  const surface=recipe.features.has('surface')?source.userData.nativeSurface:null;
  const bias=surfaceMapBias(surface);
  const signature=[...recipe.features].sort().join('|')+(recipe.features.has('surface')?'|surface-map-bias='+bias:'');let entry=cache.get(source);
  if(!entry||entry.signature!==signature){
    if(entry){source.removeEventListener('dispose',entry.dispose);entry.material.dispose();}
    const material=new THREE.MeshDepthMaterial({depthPacking:THREE.BasicDepthPacking});
    material.userData.worldDepthCompatible=true;material.defaultAttributeValues={...source.defaultAttributeValues};
    material.onBeforeCompile=shader=>{
      // Stock depth supplies instancing/batching, morph, skinning, alpha maps,
      // UV transforms and displacement. Color alpha needs the stock color chunks.
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n#include <color_pars_vertex>');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#include <color_vertex>');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n#include <color_pars_fragment>');
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#include <color_fragment>');
      if(bias)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',surfaceMapFragment(surface));
      if(recipe.features.has('clip')){
        shader.uniforms.uNativeClip=source.userData.nativeChunkClip;
        shader.vertexShader='attribute vec4 nativeClipBounds;varying vec4 vNativeClipBounds;varying vec3 vNativeClipWorld;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec4 nativeClipPosition=vec4(transformed,1.);
          #ifdef USE_INSTANCING
            nativeClipPosition=instanceMatrix*nativeClipPosition;
          #endif
          vNativeClipWorld=nativeClipPosition.xyz;vNativeClipBounds=nativeClipBounds;`);
        shader.fragmentShader='varying vec4 vNativeClipBounds;varying vec3 vNativeClipWorld;uniform float uNativeClip;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+nativeAssetClipFragment);
      }
      if(recipe.features.has('obstruction')){
        shader.vertexShader='attribute float nativeVisibility;varying float vNativeVisibility;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNativeVisibility=nativeVisibility;');
        shader.fragmentShader='varying float vNativeVisibility;\n'+coverageThreshold+'\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}`);
      }
      if(recipe.features.has('painted-fluid-clip')){
        shader.uniforms.uFluidClip=fluid.uFluidClip;shader.uniforms.uFluidBounds=fluid.uFluidBounds;
        // Exact authored water/lava coverage after stock morph/skinning and
        // displacement; preserve batching, instancing and scene-space bounds.
        shader.vertexShader='varying vec3 vPaintWorld;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 paintPosition=vec4(transformed,1.0);
      #ifdef USE_BATCHING
        paintPosition=batchingMatrix*paintPosition;
      #endif
      #ifdef USE_INSTANCING
        paintPosition=instanceMatrix*paintPosition;
      #endif
      vPaintWorld=(modelMatrix*paintPosition).xyz;`);
        shader.fragmentShader='varying vec3 vPaintWorld;uniform float uFluidClip;uniform vec4 uFluidBounds;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(uFluidClip>.5){bool inside=vPaintWorld.x>=uFluidBounds.x&&vPaintWorld.z>=uFluidBounds.y&&vPaintWorld.x<uFluidBounds.z&&vPaintWorld.z<uFluidBounds.w;if((uFluidClip<1.5&&!inside)||(uFluidClip>1.5&&inside))discard;}`);
      }
      if(recipe.features.has('horizon')){
        shader.uniforms.uHorizonBounds={value:source.userData.horizonBounds};
        shader.vertexShader='varying vec3 vDepthWorld;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec4 depthPosition=vec4(transformed,1.0);
          #ifdef USE_BATCHING
            depthPosition=batchingMatrix*depthPosition;
          #endif
          #ifdef USE_INSTANCING
            depthPosition=instanceMatrix*depthPosition;
          #endif
          vDepthWorld=(modelMatrix*depthPosition).xyz;`);
        shader.fragmentShader='varying vec3 vDepthWorld;uniform vec4 uHorizonBounds;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          if(vDepthWorld.x>=uHorizonBounds.x&&vDepthWorld.z>=uHorizonBounds.y&&vDepthWorld.x<uHorizonBounds.z&&vDepthWorld.z<uHorizonBounds.w)discard;`);
      }
    };
    material.customProgramCacheKey=()=>`world-standard-depth-v1|${signature}`;
    entry={material,signature,sourceVersion:source.version,dispose:()=>{material.dispose();cache.delete(source);source.removeEventListener('dispose',entry.dispose);}};
    source.addEventListener('dispose',entry.dispose);cache.set(source,entry);
  }
  const depth=entry.material;let changed=false;
  for(const key of properties)if(depth[key]!==source[key]){depth[key]=source[key];changed=true;}
  if(entry.sourceVersion!==source.version){entry.sourceVersion=source.version;changed=true;}
  if(changed)depth.needsUpdate=true;return depth;
}
