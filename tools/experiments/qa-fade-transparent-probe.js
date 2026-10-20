import * as THREE from 'three';

// Diagnostic only: a transparent marker behind a real partially hidden asset.
// No entity or authoritative geometry is changed; all render state is restored.
export function probeTransparentDepth(w){
 const fades=[];
 w.scene.traverseVisible(o=>{if(o.name==='qa-obstruction-blend'&&o.qaDepth?.visible){
  const box=new THREE.Box3().setFromObject(o),center=box.getCenter(new THREE.Vector3());
  const screen=center.clone().project(w.camera);
  if(Math.abs(screen.x)<.95&&Math.abs(screen.y)<.95&&screen.z>-1&&screen.z<1)fades.push({o,box,center,screen});
 }});
 fades.sort((a,b)=>a.screen.lengthSq()-b.screen.lengthSq());
 if(!fades.length)throw Error('No screen-visible partial asset for transparency probe');
 const selected=fades[0],direction=selected.center.clone().sub(w.camera.position).normalize();
 const visibility=selected.o.geometry.attributes.nativeVisibility,originalVisibility=visibility.getX(0);
 // Hold a clearly partial QA opacity. Color and depth share this attribute.
 visibility.setX(0,.35);visibility.needsUpdate=true;
 const size=selected.box.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z)*.6;
 const marker=new THREE.Mesh(new THREE.PlaneGeometry(radius*2,radius*2),new THREE.MeshBasicMaterial({color:0xff00ff,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
 marker.position.copy(selected.center).addScaledVector(direction,radius+1);marker.quaternion.copy(w.camera.quaternion);
 marker.userData.materialRegistryExcluded=true;w.scene.add(marker);
 const helpers=[];w.scene.traverse(o=>{if(o.name==='qa-obstruction-blend'||o.name==='qa-obstruction-surface-depth')helpers.push([o,o.visible]);});
 const renderer=w.renderer,auto=renderer.autoClear,target=renderer.getRenderTarget(),clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
 const images=[];
 try{
  renderer.setRenderTarget(null);renderer.autoClear=true;renderer.setClearColor(0x202020,1);
  // Hide fade color in both conditions to isolate the auxiliary depth's effect.
  for(const [o] of helpers)if(o.name==='qa-obstruction-blend')o.visible=false;
  for(const depth of [true,false])for(const visible of [false,true]){
   for(const [o,original]of helpers)if(o.name==='qa-obstruction-surface-depth')o.visible=depth&&original;
   marker.visible=visible;renderer.render(w.scene,w.camera);
   images.push({depth,marker:visible,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,data:renderer.domElement.toDataURL('image/png').split(',')[1],glError:renderer.getContext().getError()});
  }
  return {selected:{center:selected.center.toArray(),size:size.toArray(),screen:selected.screen.toArray(),visibility:visibility.getX(0),originalVisibility},marker:{position:marker.position.toArray(),width:radius*2},images};
 }finally{
  for(const[o,visible]of helpers)o.visible=visible;
  visibility.setX(0,originalVisibility);visibility.needsUpdate=true;
  marker.removeFromParent();marker.geometry.dispose();marker.material.dispose();
  renderer.setRenderTarget(target);renderer.autoClear=auto;renderer.setClearColor(clear,alpha);
 }
}
