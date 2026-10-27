export function patchMudFast(shader,low){
 const start='vec3 toonV=normalize(cameraPosition-vToonWorld);',end='#include <opaque_fragment>';
 if(shader.split(start).length!==2||shader.split(end).length!==2)throw Error('Mud fast path anchors changed');
 const fast=`vec2 qaMudDx=dFdx(vQAMudUV),qaMudDy=dFdy(vQAMudUV);
 if(vQAMudEdge>=.85+2.*fwidth(vQAMudEdge)){
 vec3 eye=normalize(cameraPosition-vToonWorld);
 vec3 albedo=textureGrad(uQAMudBase,vQAMudUV,qaMudDx,qaMudDy).rgb*vec3(.58,.61,.64);
 vec3 nm=textureGrad(uQAMudNormal,vQAMudUV,qaMudDx,qaMudDy).xyz*2.-1.;
 vec3 packed=textureGrad(uQAMudPacked,vQAMudUV,qaMudDx,qaMudDy).rgb;
 vec3 up=${low?'normalize(vToonLowNormal)':'normalize(inverseTransformDirection(normalize(vNormal),viewMatrix))'};
 vec3 tangent=normalize(vec3(1.,0.,0.)-up*up.x),bitangent=normalize(cross(up,tangent));
 vec3 N=normalize(tangent*nm.x*.55+bitangent*nm.y*.55+up*max(nm.z,.1));
 float visibility=1.;
 ${low?'':`#if NUM_DIR_LIGHT_SHADOWS > 0 && defined(USE_SHADOWMAP)
 visibility=1.-nativeShadowOcclusion(N,vToonWorld)*.93;
 #endif`}
 float rough=max(.04,packed.g*.52);
 float leaf=smoothstep(.018,.13,albedo.g-albedo.r*.87)*smoothstep(.06,.20,albedo.g);
 vec3 reflection=uNativeEnvEnabled>.5?environment4(reflect(-eye,N),rough):vec3(0.);
 outgoingLight=toLinear4(africanToon4(vec3(0.),albedo,N,eye,uLightDir,reflection,rough,visibility,leaf,0.,0.,max(dot(N,eye),0.),worldPatternPosition(vToonWorld)));
 }else{
 `;
 return shader.replace(start,fast+start).replace(end,'}\n'+end);
}
export function mudFastSource(source){
 const anchor='  material.customProgramCacheKey=()=>key.call(material)';
 if(source.split(anchor).length!==2)throw Error('Mud hook anchor changed');
 return "import {patchMudFast} from '/tools/experiments/qa-mud-fast-path-20261023.mjs';\n"+source.replace(anchor,`  {const previous=material.onBeforeCompile;material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.fragmentShader=patchMudFast(shader.fragmentShader,material.isMeshBasicMaterial);};}
`+anchor);
}
