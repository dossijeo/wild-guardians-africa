import * as THREE from 'three';
import {nativeGroundMaterial} from './render-quality.js';
import {computeMudEdgeSteps} from './mangrove-mud-edge-data.js';
export {mudTerrainKey} from './mangrove-mud-edge-data.js';
// One-time visual preparation of existing mud triangles; no world queries or per-frame work.
export function bindMangroveMudEdges(world,group){
 const steps=bindMangroveMudEdgesSteps(world,group);while(!steps.next().done){}
}

export function* bindMangroveMudEdgesSteps(world,group,{executor=null}={}){
 let attributeBytes=0;
  const ground=group.children.find(m=>m.userData.ground),mud=group.children.find(m=>m.name==='mangrove-mud-patches');if(!ground||!mud)return;
  let cpuMs=0,sliceStart=performance.now();
  function* pause(label){cpuMs+=performance.now()-sliceStart;yield label;sliceStart=performance.now();}
  const g=mud.geometry;
  const input={gp:ground.geometry.attributes.position,gc:ground.geometry.attributes.color,gn:ground.geometry.attributes.normal,p:g.attributes.position,origin:group.userData.nativeChunkOrigin,outlines:g.userData.mudOutlines};
  let computed;
  if(executor){const owner=new AbortController();cpuMs+=performance.now()-sliceStart;try{computed=yield {label:'mud-edges-worker',waitFor:executor.run(input,{signal:owner.signal}).catch(()=>null)};}finally{owner.abort();}sliceStart=performance.now();}
  const steps=computed?null:computeMudEdgeSteps(input);
  if(steps)try{for(;;){const step=steps.next();if(step.done){computed=step.value;break;}yield* pause(step.value);}}finally{steps.return();}
  const {colors,normals,edges,cacheHits,uniqueVertices,segmentTests}=computed;
  yield* pause('mud-edges-publish');
  const old=mud.material,normalAttribute=g.attributes.normal;
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));normalAttribute.array.set(normals);normalAttribute.needsUpdate=true;g.setAttribute('qaMudEdge',new THREE.BufferAttribute(edges,1));attributeBytes+=colors.byteLength+normals.byteLength+edges.byteLength;
  const material=nativeGroundMaterial(world.quality);Object.assign(material.userData,ground.material.userData);material.userData.retainBiomeGround?.(material);
  material.userData.mangroveMudTextures={base:old.map,normal:old.normalMap,packed:old.roughnessMap};
  configureMangroveMudMaterial(world,material);mud.material=material;
  old.dispose();
  mud.userData.globalMudBlend={attributeBytes,cacheHits,uniqueVertices,segmentTests,buildMs:cpuMs+performance.now()-sliceStart};
}

// Reapply the same edge recipe when the quality profile replaces the ground material.
export function configureMangroveMudMaterial(world,material){
 const textures=material.userData.mangroveMudTextures;
 if(!textures)return;
 world.toon.material(material);
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
  material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);Object.assign(shader.uniforms,{uQAMudBase:{value:textures.base},uQAMudNormal:{value:textures.normal},uQAMudPacked:{value:textures.packed}});
   shader.vertexShader='attribute float qaMudEdge;varying float vQAMudEdge;varying vec2 vQAMudUV;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQAMudEdge=qaMudEdge;vQAMudUV=uv;');
   shader.fragmentShader='uniform sampler2D uQAMudBase,uQAMudNormal,uQAMudPacked;varying float vQAMudEdge;varying vec2 vQAMudUV;\n'+shader.fragmentShader;
   const anchor='vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));';if(!shader.fragmentShader.includes(anchor))throw Error('Missing ground mix anchor');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,`
     float mudWeight=smoothstep(.05,.85,vQAMudEdge);
     vec3 mudLinear=texture2D(uQAMudBase,vQAMudUV).rgb*vec3(.58,.61,.64);
     vec3 mudBase=sRGBTransferOETF(vec4(mudLinear,1.)).rgb;
     vec3 mudN=texture2D(uQAMudNormal,vQAMudUV).xyz*2.-1.;
     vec3 mudPacked=texture2D(uQAMudPacked,vQAMudUV).rgb;
     vec3 mudUp=${material.isMeshBasicMaterial?'normalize(vToonLowNormal)':'normalize(inverseTransformDirection(normalize(vNormal),viewMatrix))'};
     vec3 mudT=normalize(vec3(1.,0.,0.)-mudUp*mudUp.x),mudB=normalize(cross(mudUp,mudT));
     vec3 mudWorldN=normalize(mudT*mudN.x*.55+mudB*mudN.y*.55+mudUp*max(mudN.z,.1));
     groundColor=mix(groundColor,mudBase,mudWeight);toonN=normalize(mix(toonN,mudWorldN,mudWeight));groundRough=mix(groundRough,max(.30,mudPacked.g*.52),mudWeight);materialAO410=mix(materialAO410,mudPacked.r,mudWeight);
   `+anchor);
  };
  {const previous=material.onBeforeCompile;material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
   const anchor='#include <opaque_fragment>';if(!shader.fragmentShader.includes(anchor))throw Error('Mud interior output anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,`
    vec3 qaMudAlbedo=mudLinear;
    float qaMudRough=max(.04,mudPacked.g*.52);
    float qaMudLeaf=smoothstep(.018,.13,qaMudAlbedo.g-qaMudAlbedo.r*.87)*smoothstep(.06,.20,qaMudAlbedo.g);
    vec3 qaMudReflection=uNativeEnvEnabled>.5?environment4(reflect(-toonV,mudWorldN),qaMudRough):vec3(0.);
    vec3 qaMudToon=toLinear4(africanToon4(vec3(0.),qaMudAlbedo,mudWorldN,toonV,uLightDir,qaMudReflection,qaMudRough,groundVisibility,qaMudLeaf,0.,0.,max(dot(mudWorldN,toonV),0.),worldPatternPosition(vToonWorld)));
    outgoingLight=mix(outgoingLight,qaMudToon,mudWeight);
   `+anchor);
  };}
  material.customProgramCacheKey=()=>key.call(material)+'|global-mud-moss-full-v1';material.needsUpdate=true;
}
