import {Vector3} from 'three';
// Diagnostic only. Clone geometry; preserve all vertex positions, UVs and skin.
export function studySmoothBodyNormals(model,restore=false){
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||mesh.name!=='Mesh_0')return;
  if(restore){if(mesh.userData.qaOriginalGeometry){mesh.geometry.dispose();mesh.geometry=mesh.userData.qaOriginalGeometry;delete mesh.userData.qaOriginalGeometry;}return;}
  if(mesh.userData.qaOriginalGeometry)return;
  mesh.userData.qaOriginalGeometry=mesh.geometry;mesh.geometry=mesh.geometry.clone();
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,index=g.index,groups=new Map(),keys=[];
  for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].join(',');keys.push(key);if(!groups.has(key))groups.set(key,new Vector3());}
  const a=new Vector3(),b=new Vector3(),c=new Vector3(),ab=new Vector3(),ac=new Vector3();
  for(let t=0;t<(index?.count??p.count);t+=3){const ids=[0,1,2].map(k=>index?index.getX(t+k):t+k);a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);ab.subVectors(b,a);ac.subVectors(c,a);ab.cross(ac);for(const i of ids)groups.get(keys[i]).add(ab);}
  for(const v of groups.values())v.normalize();for(let i=0;i<p.count;i++){const v=groups.get(keys[i]);n.setXYZ(i,v.x,v.y,v.z);}n.needsUpdate=true;
 });
}
