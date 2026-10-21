import * as THREE from 'three';

// Diagnostic only: a transparent marker behind a real partially hidden asset.
// No entity or authoritative geometry is changed; all render state is restored.
export function probeIsolatedSmokeDepth(w){
 const fades=[];
 w.scene.traverseVisible(o=>{if(o.name==='native-obstruction-blend'){
  const box=new THREE.Box3().setFromObject(o),center=box.getCenter(new THREE.Vector3());
  const raycaster=new THREE.Raycaster();
  for(const sy of [0,-.3,.3,-.6,.6])for(const sx of [0,-.3,.3,-.6,.6]){
   raycaster.setFromCamera(new THREE.Vector2(sx,sy),w.camera);const hit=raycaster.ray.intersectBox(box,new THREE.Vector3());
   if(hit)fades.push({o,box,center:hit,screen:new THREE.Vector3(sx,sy,0)});
  }
 }});
 fades.sort((a,b)=>a.screen.lengthSq()-b.screen.lengthSq());
 if(!fades.length)throw Error('No screen-visible partial asset for transparency probe');
 const selected=fades[0],direction=selected.center.clone().sub(w.camera.position).normalize();
 const visibility=selected.o.geometry.attributes.nativeVisibility,originalVisibility=visibility.getX(0);
 // Hold a clearly partial QA opacity. Color and depth share this attribute.
 visibility.setX(0,.35);visibility.needsUpdate=true;
 const size=selected.box.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z)*.6;
 const building=[...w.destructionPass.buildings][0];if(!building)throw Error('No native building effects available');
 const fx=building.effects,smoke=fx.native.smoke,saved=smoke.slice(),oldVisible=fx.smoke.visible,oldMatrix=fx.smoke.matrix.clone();
 building.updateWorldMatrix(true,false);fx.smoke.matrix.copy(building.matrixWorld);fx.smoke.updateWorldMatrix(true,false);
 const center=selected.center.clone().addScaledVector(direction,radius+1),local=building.worldToLocal(center.clone()),scale=new THREE.Vector3();building.getWorldScale(scale);
 const particles=Array.from({length:12},(_,i)=>({p:[local.x+(i%3-1)*radius*.25/scale.x,local.y+(Math.floor(i/3)-1)*radius*.2/scale.y,local.z],v:[0,0,0],age:.7,life:4,size:radius*.5/scale.x,rotation:i*.6,spin:0,alpha:.65,color:[.35,.36,.32],kind:0,phase:i*2}));
 smoke.splice(0,smoke.length,...particles);fx.smoke.visible=true;
 const helpers=[];w.scene.traverse(o=>{if(o.name==='native-obstruction-blend')helpers.push([o,o.material.colorWrite]);});
 const renderer=w.renderer,auto=renderer.autoClear,target=renderer.getRenderTarget(),clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
 const images=[];
 try{
  renderer.setRenderTarget(null);renderer.autoClear=true;renderer.setClearColor(0x202020,1);
  // Hide fade color in both conditions to isolate the isolated depth's effect.
  for(const [o] of helpers)o.material.colorWrite=false;
  for(const depth of [true,false])for(const visible of [false,true]){
   w.qaIsolatedFadeDepth.enabled=depth;
   smoke.splice(0,smoke.length,...(visible?particles:[]));renderer.render(w.scene,w.camera);if(visible)w.destructionPass.renderSmoke(w.camera,w.scene);
   images.push({depth,marker:visible,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,data:renderer.domElement.toDataURL('image/png').split(',')[1],glError:renderer.getContext().getError()});
  }
  return {selected:{center:selected.center.toArray(),size:size.toArray(),screen:selected.screen.toArray(),visibility:visibility.getX(0),originalVisibility},smoke:{position:center.toArray(),particles:particles.length,source:"BuildingEffects + native destruction renderSmoke"},images};
 }finally{
  for(const[o,colorWrite]of helpers)o.material.colorWrite=colorWrite;w.qaIsolatedFadeDepth.enabled=true;
  visibility.setX(0,originalVisibility);visibility.needsUpdate=true;
  smoke.splice(0,smoke.length,...saved);fx.smoke.visible=oldVisible;fx.smoke.matrix.copy(oldMatrix);fx.prepareSmoke(w.camera);
  renderer.setRenderTarget(target);renderer.autoClear=auto;renderer.setClearColor(clear,alpha);
 }
}
