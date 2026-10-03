import {destructionFragment,destructionDamageGLSL} from './destruction-native.js';

// Reuse the native discard statements verbatim. The color shader remains the
// authority for the auxiliary shell mask, depth threshold and ash silhouette.
function section(start,end){
  const a=destructionFragment.indexOf(start),b=destructionFragment.indexOf(end,a);
  if(a<0||b<0)throw new Error('Native destruction depth recipe changed');
  return destructionFragment.slice(a,b);
}
const shellCuts=section('  if(uInner>.5){','  float soot=');
const ashCuts=section('  if(uDamage<.235)discard;','  base=mix(vec3(.025');

export const auxiliaryBuildingDepthFragment=`#version 300 es
precision highp float;precision highp int;precision highp sampler3D;
in vec3 vOriginal;in vec2 vUV;in float vSeed;
uniform int uMode;
uniform highp sampler2D uIntactDepth;uniform highp sampler2D uOpeningMask;
${destructionDamageGLSL}
#include <packing>
out vec4 packedDepth;
void main(){
 if(uMode==0){
${shellCuts}
 }else if(uMode==2){
${ashCuts}
 }
 packedDepth=packDepthToRGBA(gl_FragCoord.z);
}`;
