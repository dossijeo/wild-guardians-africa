// QA candidate: retain the actual scene's lighting/fog/output recipe, while
// uploading only a non-shadow-casting root. No flags survive an async boundary.
export function withGpuRootIsolation(renderer,root,scene,draw){
 const renderable=object=>object.isMesh||object.isLine||object.isPoints||object.isSprite;
 const keep=new Set(),hidden=[];root.traverse(object=>{keep.add(object);if(renderable(object)&&object.castShadow)throw Error('Isolated GPU root cannot contain shadow casters');});
 for(let ancestor=root.parent;ancestor;ancestor=ancestor.parent)keep.add(ancestor);
 const shadow=renderer.shadowMap,auto=shadow?.autoUpdate,needs=shadow?.needsUpdate;
 try{
  scene.traverse(object=>{if(renderable(object)&&!keep.has(object)){hidden.push([object,object.visible]);object.visible=false;}});
  // Keep enabled and the existing depth map: disabling shadows changes the
  // receiving material's program. These roots have no shadows to prepare.
  if(shadow){shadow.autoUpdate=false;shadow.needsUpdate=false;}
  return draw();
 }finally{for(const [object,visible] of hidden)object.visible=visible;if(shadow){shadow.autoUpdate=auto;shadow.needsUpdate=needs;}}
}
