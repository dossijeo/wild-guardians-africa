import * as THREE from 'three';

// QA prototype only: envelopes for the current authored growth/bridge shaders.
// Radial bounds survive the instance's Y rotation; Three then tests each batch
// against the render camera or shadow camera independently.
function extent(attribute,indices=null){
 const out={radius:0,lo:Infinity,hi:-Infinity};
 for(let i=0;i<attribute.count;i++)if(!indices||indices(i)){
  const x=attribute.getX(i),y=attribute.getY(i),z=attribute.getZ(i);
  out.radius=Math.max(out.radius,Math.hypot(x,z));out.lo=Math.min(out.lo,y);out.hi=Math.max(out.hi,y);
 }
 return out;
}
function join(a,b){return {radius:Math.max(a.radius,b.radius),lo:Math.min(a.lo,b.lo),hi:Math.max(a.hi,b.hi)};}
export function growthEnvelope(raw,sy,sr,folded=1){
 const above=Math.max(0,raw.hi-.1);
 return {radius:raw.radius*Math.max(1,sr)+.026*Math.hypot(1,.47),lo:Math.min(raw.lo,.1),hi:Math.max(raw.hi,.1)+above*Math.max(0,sy-1)+folded*(.1+above*.12)};
}
export function bridgeEnvelope(raw,metas,e){
 let radius=0;
 for(let role=0;role<2;role++){
  const own=metas[role],height=metas[0].height*(1-e)+metas[1].height*e;
  const r=metas[0].foliageRadius*(1-e)+metas[1].foliageRadius*e;
  const b=growthEnvelope(raw[role],(height-.1)/Math.max(.12,own.height-.1),Math.max(.25,Math.min(2.8,r/Math.max(.08,own.foliageRadius))),role*.3);
  radius=Math.max(radius,Math.hypot(b.radius,Math.max(Math.abs(b.lo),Math.abs(b.hi))));
 }
 // pivot + rotated(v-root)*sqrt(weight): <= B + B + B. Ground
 // exchange may lower y by .75. Quaternions are normalized by prepareBridges.
 radius=radius*3+.75;return {radius,lo:-radius,hi:radius};
}
export function installCropFrustum(batch,scene,gltf){
 const originals=Array(40);gltf.scene.traverse(o=>{if(o.isMesh)originals[o.userData.cropIndex*5+o.userData.stage-1]=o;});
 const items=[];
 for(const mesh of scene.children){
  const growth=mesh.geometry?.attributes.iGrowth,bridge=mesh.geometry?.attributes.iBridge;if(!growth&&!bridge)continue;
  if(growth){const src=originals.find(o=>o.name===mesh.name);if(!src)throw Error('Unknown native crop');items.push({mesh,attr:growth,raw:extent(mesh.geometry.attributes.position)});}
  else{
   const match=originals.findIndex(o=>mesh.name===`puente_${o.userData.crop}_${o.userData.stage}_${o.userData.stage+1}`);
   if(match<0||match%5===4)throw Error('Unknown native bridge');
   const geo=mesh.geometry,roles=geo.attributes.aPart,raw=[];
   for(let role=0;role<2;role++)raw[role]=join(extent(geo.attributes.position,i=>roles.getX(i)===role),join(extent(geo.attributes.aRoot,i=>roles.getX(i)===role),extent(geo.attributes.aPeerRoot,i=>roles.getX(i)!==role)));
   items.push({mesh,attr:bridge,raw,metas:[originals[match].userData,originals[match+1].userData]});
  }
 }
 if(items.length!==72)throw Error('Expected 40 native stages and 32 bridges');
 const original=batch.update,matrix=new THREE.Matrix4(),box=new THREE.Box3(),lo=new THREE.Vector3(),hi=new THREE.Vector3();
 let enabled=false,updates=0;
 function refresh(){for(const item of items){
  const {mesh,attr}=item;mesh.frustumCulled=enabled;if(!enabled||!mesh.count)continue;
  const stamp=mesh.count+':'+mesh.instanceMatrix.version+':'+attr.version;if(stamp===item.stamp)continue;
  box.makeEmpty();
  for(let i=0;i<mesh.count;i++){
   const at=i*4,b=item.metas?bridgeEnvelope(item.raw,item.metas,attr.array[at+1]):growthEnvelope(item.raw,attr.array[at],attr.array[at+1],1-attr.array[at+2]);
   mesh.getMatrixAt(i,matrix);const m=matrix.elements;
   // Native crop instance matrices contain unit scale and Y rotation only.
   lo.set(m[12]-b.radius,m[13]+b.lo,m[14]-b.radius);hi.set(m[12]+b.radius,m[13]+b.hi,m[14]+b.radius);box.expandByPoint(lo);box.expandByPoint(hi);
  }
  mesh.boundingBox??=new THREE.Box3();mesh.boundingBox.copy(box).expandByScalar(1e-4);
  mesh.boundingSphere??=new THREE.Sphere();mesh.boundingBox.getBoundingSphere(mesh.boundingSphere);item.stamp=stamp;updates++;
 }}
 batch.update=function(...args){const result=original.apply(this,args);if(enabled)refresh();return result;};
 return {setEnabled(value){enabled=!!value;refresh();},get updates(){return updates;},items,dispose(){batch.update=original;for(const {mesh} of items)mesh.frustumCulled=false;}};
}
