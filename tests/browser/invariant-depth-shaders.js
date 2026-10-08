import {nativeDepthRecipe,recordNativeDepthHook} from '../../src/rendering/depth-recipes.js';

// QA only: invariance is a hypothesis about cross-program projection/UV output.
// Both native and specialized shaders must participate; no production defaults.
export class InvariantDepthShaders{
 constructor(world,mode){
  if(!['position','position-uv'].includes(mode))throw Error('Invalid invariant shader mode');
  this.world=world;this.mode=mode;this.materials=new Map();this.compiles=[];
  const renderer=world.renderer,owner=this;this.original=renderer.renderBufferDirect;
  this.draw=function(camera,scene,geometry,material,object,group){owner.wrap(material);return owner.original.call(this,camera,scene,geometry,material,object,group);};
  renderer.renderBufferDirect=this.draw;
 }
 wrap(material){
  if(this.materials.has(material))return;
  const recipe=nativeDepthRecipe(material);
  if(!(material.isMeshStandardMaterial||material.isMeshBasicMaterial||material.isMeshDepthMaterial)||!recipe&&!material.userData.worldDepthCompatible)return;
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey,owner=this;
  material.onBeforeCompile=function(shader,renderer){
   previous.call(this,shader,renderer);
   shader.vertexShader='invariant gl_Position;\n'+shader.vertexShader;
   if(owner.mode==='position-uv'){
    if(!shader.vertexShader.includes('#include <uv_pars_vertex>'))throw Error('QA invariance requires the stock UV declaration');
    shader.vertexShader=shader.vertexShader.replace('#include <uv_pars_vertex>','#include <uv_pars_vertex>\n#ifdef USE_MAP\ninvariant vMapUv;\n#endif');
   }
   owner.compiles.push({material:material.id,type:material.type,mode:owner.mode,position:true,mapUv:owner.mode==='position-uv'&&Boolean(material.map)});
  };
  if(recipe)recordNativeDepthHook(material,previous);
  material.customProgramCacheKey=function(){return key.call(this)+'|qa-invariant='+owner.mode;};
  this.materials.set(material,{previous,key,wrapped:material.onBeforeCompile,recipe:!!recipe});material.needsUpdate=true;
 }
 report(){return {mode:this.mode,wrappedMaterials:this.materials.size,compiles:this.compiles.slice(),scope:'QA shader invariance experiment; unchanged assets and alpha safeguard. Counts are not GPU timings or visual acceptance.'};}
 dispose(){
  if(this.world.renderer.renderBufferDirect===this.draw)this.world.renderer.renderBufferDirect=this.original;
  for(const [material,entry] of this.materials){
   if(material.onBeforeCompile!==entry.wrapped)continue;
   material.onBeforeCompile=entry.previous;if(entry.recipe)recordNativeDepthHook(material,entry.wrapped);
   material.customProgramCacheKey=entry.key;material.needsUpdate=true;
  }
  this.materials.clear();
 }
}
