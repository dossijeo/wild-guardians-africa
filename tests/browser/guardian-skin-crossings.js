import {Box3,Ray,Triangle,Vector3} from 'three';
// QA only. Reports strict transverse surface crossings, not penetration depth,
// containment, coplanar overlap or proof of separation. Never used by gameplay.
function triangles(meshes,region){
 const result=[];
 for(const mesh of meshes){
  const geometry=mesh.geometry,points=Array.from({length:geometry.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld));
  const index=geometry.index,count=index?.count??points.length;
  for(let i=0;i+2<count;i+=3){
   const p=[0,1,2].map(k=>points[index?index.getX(i+k):i+k]);
   if(region&&['x','y','z'].some(axis=>Math.max(...p.map(v=>v[axis]))<region.min[axis]||Math.min(...p.map(v=>v[axis]))>region.max[axis]))continue;
   result.push({triangle:new Triangle(...p),box:new Box3().setFromPoints(p)});
  }
 }
 return result;
}
function tree(items){
 const box=new Box3();for(const item of items)box.union(item.box);
 if(items.length<=8)return {box,items};
 const size=box.getSize(new Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
 items.sort((a,b)=>(a.box.min[axis]+a.box.max[axis])-(b.box.min[axis]+b.box.max[axis]));
 const middle=Math.floor(items.length/2);return {box,left:tree(items.slice(0,middle)),right:tree(items.slice(middle))};
}
const normal=new Vector3(),direction=new Vector3(),hit=new Vector3(),bary=new Vector3(),ray=new Ray();
function crossEdge(start,end,triangle){
 triangle.getNormal(normal);const first=normal.dot(start)-normal.dot(triangle.a),last=normal.dot(end)-normal.dot(triangle.a);
 // Exclude tangent/end-point contacts: those are not transverse crossings.
 if(!((first>1e-7&&last< -1e-7)||(first< -1e-7&&last>1e-7)))return null;
 direction.subVectors(end,start).normalize();ray.set(start,direction);
 if(!ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,hit))return null;
 triangle.getBarycoord(hit,bary);if(Math.min(bary.x,bary.y,bary.z)<=1e-7)return null;
 return hit.toArray();
}
function crossing(a,b){
 for(const [one,two] of [[a,b],[b,a]])for(const [start,end] of [[one.a,one.b],[one.b,one.c],[one.c,one.a]]){
  const point=crossEdge(start,end,two);if(point)return point;
 }
 return null;
}
export function sampleMeshSurfaceCrossings(meshesA,meshesB,limit=8,region=null){
 const a=triangles(meshesA,region),b=triangles(meshesB,region),points=[];let pairs=0;
 function visit(x,y){
  if(points.length>=limit||!x.box.intersectsBox(y.box))return;
  if(x.items&&y.items){for(const u of x.items)for(const v of y.items){if(points.length>=limit)return;if(!u.box.intersectsBox(v.box))continue;pairs++;const point=crossing(u.triangle,v.triangle);if(point)points.push(point);}return;}
  if(!x.items){visit(x.left,y);visit(x.right,y);}else{visit(x,y.left);visit(x,y.right);}
 }
 if(a.length&&b.length)visit(tree(a),tree(b));
 return {points,limitReached:points.length>=limit,trianglePairsTested:pairs,triangles:[a.length,b.length],scope:'Strict transverse crossings only; zero does not prove separation (containment/coplanar contacts excluded).'};
}
