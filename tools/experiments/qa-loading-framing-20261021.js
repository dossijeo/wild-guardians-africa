import * as THREE from 'three';
// QA conservative envelope, camera-only. Does not alter models or planting.
export function installLoadingFraming(d){
 const update=d.camera.updateProjectionMatrix.bind(d.camera),out=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),delta=new THREE.Vector3(),worldUp=new THREE.Vector3(0,1,0);
 let lastKey='',required=0;
 d.camera.updateProjectionMatrix=()=>{
  const c=d.camera;out.copy(c.position).sub(d.focus);const base=out.length();out.normalize();right.crossVectors(worldUp,out).normalize();up.crossVectors(out,right);
  const key=[c.aspect,d.plants.plants.length,...out.toArray().map(v=>v.toFixed(4))].join('|');
  if(key!==lastKey){
   const ty=Math.tan(c.fov*Math.PI/360),tx=ty*c.aspect,lift=c.aspect<.8?0:.22,bottom=c.aspect<.8?.62:.30+lift;
   required=base;
   for(const p of d.plants.plants)for(const x of [-.55,.55])for(const z of [-.55,.55])for(const y of [.09,2.7]){
    delta.set(p.x+x,y,p.z+z).sub(d.focus);const px=delta.dot(right),py=delta.dot(up),pz=delta.dot(out);
    required=Math.max(required,pz+Math.abs(px)/(tx*.88),pz+(py>=0?py/(ty*(.78-lift)):-py/(ty*bottom)));
   }
   lastKey=key;
  }
  c.position.copy(d.focus).addScaledVector(out,Math.max(base,required));c.lookAt(d.focus);update();
  // Place the garden in the free area above the landscape ornament.
  if(c.aspect>=.8){c.projectionMatrix.elements[9]-=.22;c.projectionMatrixInverse.copy(c.projectionMatrix).invert();}
  const extra=Math.max(0,c.position.distanceTo(d.focus)-8.235);
  d.scene.fog.near=18+extra;d.scene.fog.far=28+extra;
 };
}
