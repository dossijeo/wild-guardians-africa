// Same center and outer radius as Three's bounding sphere for a position
// attribute. Native center meshes interleave XYZ first in each vertex.
export function centerGeometrySphere(array,stride){
 if(!array.length)return [0,0,0,0];
 let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
 for(let i=0;i<array.length;i+=stride){
  const x=array[i],y=array[i+1],z=array[i+2];
  minX=Math.min(minX,x);minY=Math.min(minY,y);minZ=Math.min(minZ,z);
  maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxZ=Math.max(maxZ,z);
 }
 const cx=(minX+maxX)*.5,cy=(minY+maxY)*.5,cz=(minZ+maxZ)*.5;
 let radiusSquared=0;
 for(let i=0;i<array.length;i+=stride){
  const x=cx-array[i],y=cy-array[i+1],z=cz-array[i+2];
  radiusSquared=Math.max(radiusSquared,x*x+y*y+z*z);
 }
 return Number.isFinite(radiusSquared)?[cx,cy,cz,Math.sqrt(radiusSquared)]:null;
}
