// Diagnostic only: retain mesh, vertex shader, depth/discard and draw settings.
export function installGroundAblation(w,variant){
 if(!['base','flat'].includes(variant))throw Error('Unknown ground ablation');
 const materials=new Set();w.scene.traverse(o=>{if(o.userData.ground)materials.add(o.material);});
 if(!materials.size)throw Error('No resident ground materials');
 if(variant==='flat')for(const material of materials){const prior=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);material.onBeforeCompile=function(shader,renderer){prior.call(this,shader,renderer);const a='vec3 toonV=normalize(cameraPosition-vToonWorld);',b='#include <opaque_fragment>',start=shader.fragmentShader.indexOf(a),end=shader.fragmentShader.indexOf(b,start);if(start<0||end<start)throw Error('Ground output anchors changed');shader.fragmentShader=shader.fragmentShader.slice(0,start)+'outgoingLight=vec3(.18,.24,.09);\n'+shader.fragmentShader.slice(end);};material.customProgramCacheKey=()=>key()+'|qa-ground-flat';material.needsUpdate=true;}
 return {variant,materials:materials.size,scope:'resident ground only; mud overlays, horizon, shadows, geometry and draw settings retained'};
}
