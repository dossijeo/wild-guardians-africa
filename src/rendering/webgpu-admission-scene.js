// Three r180's object compile uses a separate light node even when it pulls
// lights from the target scene. Temporarily use the target scene's identity
// during synchronous setup; never overwrite ownership changed reentrantly.
export function compileWithAdmissionSceneLighting(renderer,object,camera,targetScene,compile){
 if(!targetScene?.isScene||typeof object?.traverseVisible!=='function'||typeof renderer?._renderLists?.get!=='function'||typeof renderer?.lighting?.getNode!=='function')return compile();
 let embedded=false;if(object!==targetScene)object.traverseVisible(node=>{if(node.isLight&&node.layers.test(camera.layers))embedded=true;});if(embedded)return compile();
 const list=renderer._renderLists.get(object,camera),node=renderer.lighting.getNode(targetScene,camera),previousNode=list?.lightsNode;
 if(!list||!node||typeof node.getLights!=='function'||typeof node.setLights!=='function')return compile();
 // compileAsync does not advance renderer.info.calls. Three's per-call scene
 // hash may otherwise hide a changed fog/environment or light list here.
 renderer._nodes?.callHashCache?.delete([targetScene,node]);
 if(previousNode===node)return compile();
 const previousLights=node.getLights(),previousScene=renderer._wgCompileSceneReference;
 try{renderer._wgCompileSceneReference=targetScene;list.lightsNode=node;return compile();}
 finally{
  let stale=false;
  if(list.lightsNode===node)list.lightsNode=previousNode;else stale=true;
  const lights=node.getLights();if(lights===list.lightsArray)node.setLights(previousLights);else if(lights!==previousLights)stale=true;
  if(renderer._wgCompileSceneReference===targetScene)renderer._wgCompileSceneReference=previousScene;else stale=true;
  if(stale)throw Object.assign(Error('Admission lighting ownership changed'),{code:'admission-stale'});
 }
}
