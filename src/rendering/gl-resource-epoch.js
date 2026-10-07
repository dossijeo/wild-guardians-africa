// Three's pre-loss disposal callbacks can outlive the context that owns their handles.
// Track creation, without querying GL state, and suppress only proven stale deletes.
const resourcePairs=[['createBuffer','deleteBuffer'],['createVertexArray','deleteVertexArray'],['createTexture','deleteTexture'],['createProgram','deleteProgram'],['createShader','deleteShader'],['fenceSync','deleteSync'],['createFramebuffer','deleteFramebuffer'],['createRenderbuffer','deleteRenderbuffer']];
function restoreProperty(target,name,descriptor){if(descriptor)Object.defineProperty(target,name,descriptor);else delete target[name];}
export function installGlResourceEpoch(gl){
 let epoch=0,disposed=false;const handles=new WeakMap(),patches=[],stats={epoch:0,created:0,staleDeletes:0,currentDeletes:0,unknownDeletes:0};
 const lost=()=>{epoch++;stats.epoch=epoch;};
 try{
  for(const [createName,deleteName] of resourcePairs){
   const create=gl[createName],remove=gl[deleteName];if(typeof create!=='function'||typeof remove!=='function')continue;
   const createDescriptor=Object.getOwnPropertyDescriptor(gl,createName),deleteDescriptor=Object.getOwnPropertyDescriptor(gl,deleteName);
   function trackedCreate(...args){const handle=create.apply(this,args);if(handle!==null&&(typeof handle==='object'||typeof handle==='function')){handles.set(handle,{epoch,deleteName});stats.created++;}return handle;}
   function trackedDelete(handle,...args){const record=handle!==null&&(typeof handle==='object'||typeof handle==='function')?handles.get(handle):null;if(record?.deleteName===deleteName){if(record.epoch<epoch){stats.staleDeletes++;return;}stats.currentDeletes++;}else stats.unknownDeletes++;return remove.call(this,handle,...args);}
   gl[createName]=trackedCreate;patches.push([createName,trackedCreate,createDescriptor]);gl[deleteName]=trackedDelete;patches.push([deleteName,trackedDelete,deleteDescriptor]);
  }
  gl.canvas.addEventListener('webglcontextlost',lost);
 }catch(error){for(const [name,wrapper,descriptor] of patches.reverse())if(gl[name]===wrapper)restoreProperty(gl,name,descriptor);throw error;}
 return {stats,dispose(){if(disposed)return;disposed=true;gl.canvas.removeEventListener('webglcontextlost',lost);for(const [name,wrapper,descriptor] of patches)if(gl[name]===wrapper)restoreProperty(gl,name,descriptor);}};
}
// Preserve Three's own context creation attributes and its internal alpha option.
// The intercepted call installs tracking before the constructor allocates resources.
export function createRendererWithGlEpoch(canvas,createRenderer){
 const original=canvas.getContext,descriptor=Object.getOwnPropertyDescriptor(canvas,'getContext');let guard=null,context=null;
 function trackedContext(...args){const gl=original.apply(this,args);if(args[0]==='webgl2'&&gl!==null){if(context!==null&&context!==gl)throw new Error('Renderer requested multiple WebGL contexts');if(!guard){guard=installGlResourceEpoch(gl);context=gl;}}return gl;}
 canvas.getContext=trackedContext;
 try{return {renderer:createRenderer(),guard};}catch(error){guard?.dispose();throw error;}finally{if(canvas.getContext===trackedContext)restoreProperty(canvas,'getContext',descriptor);}
}
