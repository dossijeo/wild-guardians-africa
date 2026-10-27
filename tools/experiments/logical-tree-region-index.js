// Immutable regional billboard anchors only; not authoritative navigation data.
// One index per adopted regional array. Replacement/disposal releases its owner.
export class LogicalTreeRegionIndex {
 constructor(trees){
  this.trees=trees;this.columns=new Map();
  for(const tree of trees){
   const x=Math.floor(tree.x/64),z=Math.floor(tree.z/64);
   let column=this.columns.get(x);if(!column)this.columns.set(x,column=new Map());
   let cell=column.get(z);if(!cell)column.set(z,cell=[]);cell.push(tree);
  }
 }
 candidates(camera,range){
  const result=[],minX=camera.x-range,maxX=camera.x+range,minZ=camera.z-range,maxZ=camera.z+range;
  for(let x=Math.floor(minX/64);x<=Math.floor(maxX/64);x++){
   const column=this.columns.get(x);if(!column)continue;
   for(let z=Math.floor(minZ/64);z<=Math.floor(maxZ/64);z++)for(const t of column.get(z)??[])
    if(t.x>=minX&&t.x<=maxX&&t.z>=minZ&&t.z<=maxZ)result.push(t);
  }
  return result;
 }
}
