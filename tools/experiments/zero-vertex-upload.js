// QA only: retain Three r180's normal program/uniform/VAO setup, but submit
// zero vertices in the synchronous upload draw. This is not proof that a
// driver's first positive draw is warm; native first-visible QA is required.
export function withZeroVertexUpload(renderer,draw){
 const original=renderer.renderBufferDirect;
 if(typeof original!=='function')throw Error('Zero-vertex upload requires native renderBufferDirect');
 let draws=0;
 renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){
  const range=geometry.drawRange,start=range.start,count=range.count;
  // A global count=0 would produce a negative intersection for later groups,
  // returning before VAO setup. Normalize both ranges for this call only;
  // geometry.groups and their original material indices remain untouched.
  const emptyGroup=group==null?group:{...group,start:0,count:0};
  try{range.start=0;range.count=0;draws++;return original.call(this,camera,scene,geometry,material,object,emptyGroup);}
  finally{range.start=start;range.count=count;}
 };
 try{const value=draw();if(value&&typeof value.then==='function'){Promise.resolve(value).catch(()=>{});throw Error('Zero-vertex upload must be synchronous');}return {value,draws};}
 finally{renderer.renderBufferDirect=original;}
}
