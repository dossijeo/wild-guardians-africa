import * as THREE from 'three';

// Track the actual compile hook, not cloneable userData labels. An unknown
// replacement invalidates the recipe until its silhouette has been audited.
const recipes=new WeakMap();
export function nativeDepthRecipe(material){
  const known=recipes.get(material);
  if(known)return known.compile===material.onBeforeCompile?known:null;
  if(material.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)return null;
  return {compile:material.onBeforeCompile,features:new Set()};
}
export function recordNativeDepthHook(material,previous,...features){
  let known=recipes.get(material);
  if(!known){if(previous!==THREE.Material.prototype.onBeforeCompile)return;known={compile:previous,features:new Set()};}
  if(known.compile!==previous)return;
  known.compile=material.onBeforeCompile;features.forEach(feature=>known.features.add(feature));recipes.set(material,known);
}

// Store the actual closure-owned uniforms, not a cloneable userData label.
// A later replacement compile hook invalidates this authority as usual.
export function recordNativeFluidDepthHook(material,previous,uniforms){
  recordNativeDepthHook(material,previous,'painted-fluid-clip');
  const known=recipes.get(material);
  if(known?.compile===material.onBeforeCompile&&known.features.has('painted-fluid-clip'))known.fluidUniforms=uniforms;
}
