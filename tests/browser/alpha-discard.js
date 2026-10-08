import * as THREE from 'three';
import {nativeDepthRecipe,recordNativeDepthHook} from '../../src/rendering/depth-recipes.js';

// QA isolation: keep alpha sampling and both programs, toggle only discard via
// one uniform. Off changes the silhouette and is never a production candidate.
export class AlphaDiscardExperiment {
 constructor(world,enabled=true){
  this.world=world;this.uniform={value:enabled?1:0};this.materials=new Map();this.compiles=[];
  const owner=this;this.original=world.renderer.renderBufferDirect;
  this.draw=function(camera,scene,geometry,material,object,group){owner.wrap(material);return owner.original.call(this,camera,scene,geometry,material,object,group);};
  world.renderer.renderBufferDirect=this.draw;
 }
 setEnabled(enabled){this.uniform.value=enabled?1:0;}
 wrap(material){
  if(this.materials.has(material)||!material.alphaTest||material.alphaToCoverage)return;
  const recipe=nativeDepthRecipe(material);
  if(!(material.isMeshStandardMaterial||material.isMeshBasicMaterial||material.isMeshDepthMaterial)||!recipe&&!material.userData.worldDepthCompatible)return;
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey,owner=this;
  material.onBeforeCompile=function(shader,renderer){
   previous.call(this,shader,renderer);
   if(!shader.fragmentShader.includes('#include <alphatest_fragment>'))throw Error('QA discard requires stock alpha test');
   shader.uniforms.uQaAlphaDiscard=owner.uniform;
   shader.fragmentShader='uniform float uQaAlphaDiscard;\n'+shader.fragmentShader.replace('#include <alphatest_fragment>',THREE.ShaderChunk.alphatest_fragment.replaceAll('discard;','if(uQaAlphaDiscard>.5)discard;'));
   owner.compiles.push({material:material.id,type:material.type});
  };
  if(recipe)recordNativeDepthHook(material,previous);
  material.customProgramCacheKey=function(){return key.call(this)+'|qa-alpha-discard-uniform';};
  this.materials.set(material,{previous,key,wrapped:material.onBeforeCompile,recipe:!!recipe});material.needsUpdate=true;
 }
 report(){return {enabled:this.uniform.value===1,uniform:this.uniform.value,wrappedMaterials:this.materials.size,compiles:this.compiles.slice(),scope:'QA discard isolation; off changes silhouettes, no production acceptance or GPU timing.'};}
 dispose(){
  if(this.world.renderer.renderBufferDirect===this.draw)this.world.renderer.renderBufferDirect=this.original;
  for(const [material,entry]of this.materials){if(material.onBeforeCompile!==entry.wrapped)continue;material.onBeforeCompile=entry.previous;if(entry.recipe)recordNativeDepthHook(material,entry.wrapped);material.customProgramCacheKey=entry.key;material.needsUpdate=true;}
  this.materials.clear();
 }
}
