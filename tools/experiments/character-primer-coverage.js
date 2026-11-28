import {Vector4} from 'three';
// Queries are installed only by the loading QA route. Restore borrowed hooks
// before returning; retrieve results only after the existing GPU fence.
export function beginPrimerCoverage(renderer,root,camera){
 const gl=renderer.getContext(),queries=[],hooks=[],viewport=new Vector4();
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;let owner=mesh;
  while(owner&&!owner.userData.qaPrimerLabel)owner=owner.parent;
  if(!owner)return;
  const label=owner.userData.qaPrimerLabel,oldBefore=mesh.onBeforeRender,oldAfter=mesh.onAfterRender;
  let active=null;
  mesh.onBeforeRender=function(...args){oldBefore.apply(this,args);if(args[2]!==camera)return;renderer.getViewport(viewport);if(viewport.z<=0||viewport.w<=0)return;const query=gl.createQuery();if(!query)throw Error('Cannot create primer coverage query');gl.beginQuery(gl.ANY_SAMPLES_PASSED,query);active=query;};
  mesh.onAfterRender=function(...args){try{if(active){gl.endQuery(gl.ANY_SAMPLES_PASSED);queries.push({label,mesh:mesh.name,query:active});active=null;}}finally{oldAfter.apply(this,args);}};
  hooks.push(()=>{mesh.onBeforeRender=oldBefore;mesh.onAfterRender=oldAfter;});
 });
 return {finish(){for(const restore of hooks)restore();const result={};for(const {label,mesh,query} of queries){const item=result[label]??={draws:0,passed:0,unavailable:0,meshes:[]},available=gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE);const passed=available?!!gl.getQueryParameter(query,gl.QUERY_RESULT):null;item.draws++;item.passed+=Number(passed===true);item.unavailable+=Number(!available);item.meshes.push({name:mesh,passed});gl.deleteQuery(query);}return result;}};
}
