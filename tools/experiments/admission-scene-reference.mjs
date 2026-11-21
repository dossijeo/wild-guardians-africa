// QA-only transaction. The installed Three r180 patch honors this hook while
// compileAsync sets up a pass synchronously, before its first await.
export function useRealAdmissionScene(source){
 const legacy='pending=renderer.compileAsync(object,passCamera,targetScene);';
 const integrated='pending=sharedSceneLighting?compileWithAdmissionSceneLighting(renderer,object,passCamera,targetScene,()=>renderer.compileAsync(object,passCamera,targetScene)):renderer.compileAsync(object,passCamera,targetScene);';
 const before=source.includes(integrated)?integrated:legacy;
 const after="const previousSceneReference=renderer._wgCompileSceneReference;try{renderer._wgCompileSceneReference=targetScene;pending=renderer.compileAsync(object,passCamera,targetScene);}finally{renderer._wgCompileSceneReference=previousSceneReference;}";
 if(source.split(before).length!==2)throw Error('Admission scene anchor missing');return source.replace(before,after);
}

// QA-only: reuse the target scene's light-node identity during synchronous
// compile setup and restore both render-list ownership and light contents.
export function useRealAdmissionLighting(source){
 const before="const previousSceneReference=renderer._wgCompileSceneReference;try{renderer._wgCompileSceneReference=targetScene;pending=renderer.compileAsync(object,passCamera,targetScene);}finally{renderer._wgCompileSceneReference=previousSceneReference;}";
 const after="let canShare=targetScene?.isScene===true&&object!==targetScene;if(canShare)object.traverseVisible(node=>{if(node.isLight&&node.layers.test(passCamera.layers))canShare=false;});if(!canShare)pending=renderer.compileAsync(object,passCamera,targetScene);else{const previousSceneReference=renderer._wgCompileSceneReference,list=renderer._renderLists.get(object,passCamera),previousNode=list.lightsNode,sharedNode=renderer.lighting.getNode(targetScene,passCamera),swap=previousNode!==sharedNode,previousLights=swap?sharedNode.getLights():null;try{renderer._wgCompileSceneReference=targetScene;if(swap)list.lightsNode=sharedNode;pending=renderer.compileAsync(object,passCamera,targetScene);}finally{if(swap){list.lightsNode=previousNode;sharedNode.setLights(previousLights);}renderer._wgCompileSceneReference=previousSceneReference;}}";
 if(source.split(before).length!==2)throw Error('Admission lighting anchor missing');return source.replace(before,after);
}
