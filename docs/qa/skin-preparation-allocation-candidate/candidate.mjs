import {Box3,Matrix4,Sphere,Vector3} from 'three';

const point=new Vector3(),matrix=new Matrix4(),part=new Box3(),bounds=new Box3(),sphere=new Sphere();
const groupBounds=new Box3(),contribution=new Box3();
const prepared=new WeakMap();
const transforms=[];
const affine=m=>m.elements.every(Number.isFinite)&&m.elements[3]===0&&m.elements[7]===0&&m.elements[11]===0&&m.elements[15]!==0;

// Prepare while loading. Group bind-space vertices by their influencing bones
// and weight bins; runtime work depends on these groups, not vertex count.
// Morphing and invalid weights deliberately use the original vertex path.
export function prepareSkinEnvelope(mesh){
 const geometry=mesh.geometry,position=geometry?.attributes.position,index=geometry?.attributes.skinIndex,weight=geometry?.attributes.skinWeight;
 const count=mesh.skeleton?.bones.length;
 if(!mesh.isSkinnedMesh||!position?.count||!index||!weight||index.itemSize!==4||weight.itemSize!==4||
   position.count!==index.count||position.count!==weight.count||!count||
   Object.values(geometry.morphAttributes).some(a=>a.length)||!affine(mesh.bindMatrix))return null;
 const cached=prepared.get(geometry);
 if(cached&&cached.boxes.length===count&&cached.bind.equals(mesh.bindMatrix)&&cached.position===position&&cached.index===index&&cached.weight===weight&&
   [position,index,weight].every((a,i)=>a.version===cached.versions[i]))return cached;
 const boxes=Array.from({length:count},()=>new Box3()),groups=new Map(),influences=new Map(),weightedPoint=new Vector3();let minSum=Infinity,maxSum=0;
 for(let vertex=0;vertex<position.count;vertex++){
  point.fromBufferAttribute(position,vertex).applyMatrix4(mesh.bindMatrix);
  if(![point.x,point.y,point.z].every(Number.isFinite))return null;
  let sum=0;influences.clear();
  for(let component=0;component<4;component++){
   const w=weight.getComponent(vertex,component),bone=index.getComponent(vertex,component);
   if(!Number.isFinite(w)||w<0||!Number.isInteger(bone)||bone<0||bone>=count)return null;
   sum+=w;if(w>0){boxes[bone].expandByPoint(point);influences.set(bone,(influences.get(bone)??0)+w);}
  }
  if(!Number.isFinite(sum))return null;minSum=Math.min(minSum,sum);maxSum=Math.max(maxSum,sum);
  const bones=[...influences.keys()].sort((a,b)=>a-b),key=bones.map(bone=>bone+':'+Math.floor(influences.get(bone)*8)).join(',');
  let group=groups.get(key);
  if(!group){group=bones.map(bone=>({bone,weighted:new Box3(),minWeight:Infinity,maxWeight:0}));groups.set(key,group);}
  group.minSum=Math.min(group.minSum??Infinity,sum);group.maxSum=Math.max(group.maxSum??0,sum);
  for(const term of group){
   const w=influences.get(term.bone);
   term.weighted.expandByPoint(weightedPoint.copy(point).multiplyScalar(w));
   term.minWeight=Math.min(term.minWeight,w);term.maxWeight=Math.max(term.maxWeight,w);
  }
 }
 for(const group of groups.values())for(const term of group){term.lo=[term.weighted.min.x,term.weighted.min.y,term.weighted.min.z,term.minWeight];term.hi=[term.weighted.max.x,term.weighted.max.y,term.weighted.max.z,term.maxWeight];}
 const envelope={geometry,position,index,weight,versions:[position.version,index.version,weight.version],bind:mesh.bindMatrix.clone(),boxes,minSum,maxSum,groups:[...groups.values()]};
 prepared.set(geometry,envelope);return envelope;
}

export function updateSkinEnvelopeSphere(mesh,envelope,{grouped=true}={}){
 if(!envelope||mesh.geometry!==envelope.geometry||!mesh.bindMatrix.equals(envelope.bind)||
   mesh.skeleton?.bones.length!==envelope.boxes.length||!affine(mesh.bindMatrixInverse)||
   mesh.geometry.attributes.position!==envelope.position||mesh.geometry.attributes.skinIndex!==envelope.index||mesh.geometry.attributes.skinWeight!==envelope.weight||
   Object.values(mesh.geometry.morphAttributes).some(a=>a.length)||
   [envelope.position,envelope.index,envelope.weight].some((a,i)=>a.version!==envelope.versions[i]))return false;
 bounds.makeEmpty();
 if(grouped){
  // Within one influence-topology group, enclose each weighted contribution
  // A*(weight*position) + translation*weight, then sum their intervals. Tiny
  // weights no longer extrapolate a distant vertex with full bone influence.
  for(let bone=0;bone<envelope.boxes.length;bone++){
   if(envelope.boxes[bone].isEmpty())continue;
   const inverse=mesh.skeleton.boneInverses[bone];if(!inverse)return false;
   matrix.multiplyMatrices(mesh.skeleton.bones[bone].matrixWorld,inverse);matrix.premultiply(mesh.bindMatrixInverse);if(!affine(matrix))return false;
   const normalized=transforms[bone]??=new Float64Array(12),m=matrix.elements;
   for(let axis=0;axis<3;axis++)for(let component=0;component<4;component++)normalized[axis*4+component]=m[axis+component*4]/m[15];
  }
  for(const group of envelope.groups){
   groupBounds.set(point.set(0,0,0),point);
   for(const term of group){
    const m=transforms[term.bone],lo=term.lo,hi=term.hi;
    for(let axis=0;axis<3;axis++){
     let min=0,max=0;
     for(let component=0;component<4;component++){
      const coefficient=m[axis*4+component],a=coefficient*lo[component],b=coefficient*hi[component];min+=Math.min(a,b);max+=Math.max(a,b);
     }
     contribution.min.setComponent(axis,min);contribution.max.setComponent(axis,max);
    }
   groupBounds.min.add(contribution.min);groupBounds.max.add(contribution.max);
   }
   // Moving the bind inverse inside the weighted sum adds its translation
   // sum(weights) times. Restore the single translation used by Three.js.
   const inv=mesh.bindMatrixInverse.elements;
   for(let axis=0;axis<3;axis++){
    const t=inv[12+axis]/inv[15],a=t*(1-group.minSum),b=t*(1-group.maxSum);
    groupBounds.min.setComponent(axis,groupBounds.min.getComponent(axis)+Math.min(a,b));
    groupBounds.max.setComponent(axis,groupBounds.max.getComponent(axis)+Math.max(a,b));
   }
   bounds.union(groupBounds);
  }
 }else{
 for(let bone=0;bone<envelope.boxes.length;bone++){
  if(envelope.boxes[bone].isEmpty())continue;
  const inverse=mesh.skeleton.boneInverses[bone];if(!inverse)return false;
  matrix.multiplyMatrices(mesh.skeleton.bones[bone].matrixWorld,inverse);if(!affine(matrix))return false;
  bounds.union(part.copy(envelope.boxes[bone]).applyMatrix4(matrix));
 }
 // Each weighted position is sum(weights) times a point in the convex hull.
 // Interval scaling handles non-normalized weights without adding world origin
 // to ordinary unit-weight bounds (which would explode for distant actors).
 if(bounds.isEmpty())bounds.set(point.set(0,0,0),point);
 for(const axis of ['x','y','z']){
  const a=bounds.min[axis],b=bounds.max[axis],lo=envelope.minSum,hi=envelope.maxSum;
  bounds.min[axis]=Math.min(a*lo,a*hi,b*lo,b*hi);bounds.max[axis]=Math.max(a*lo,a*hi,b*lo,b*hi);
 }
 }
 if(!grouped)bounds.applyMatrix4(mesh.bindMatrixInverse);
 const tolerance=1e-6*Math.max(1,...bounds.min.toArray().map(Math.abs),...bounds.max.toArray().map(Math.abs));
 bounds.expandByScalar(tolerance);
 bounds.getBoundingSphere(sphere);
 if(!Number.isFinite(sphere.radius)||![sphere.center.x,sphere.center.y,sphere.center.z].every(Number.isFinite))return false;
 mesh.boundingSphere??=new Sphere();mesh.boundingSphere.copy(sphere);return true;
}
