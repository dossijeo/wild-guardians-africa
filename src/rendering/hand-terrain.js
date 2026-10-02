// Clip the whole hand plane against the actual 1.5 m terrain triangles.
// The maximum of a linear height difference occurs at a clipped vertex.
export function terrainTriangleHeight(x,z,surface){
  const step=1.5,origin=-24,loX=origin+Math.floor((x-origin)/step)*step,loZ=origin+Math.floor((z-origin)/step)*step,u=(x-loX)/step,v=(z-loZ)/step;
  const a=Math.fround(surface(loX,loZ)),b=Math.fround(surface(loX,loZ+step)),c=Math.fround(surface(loX+step,loZ));
  if(u+v<=1)return a+u*(c-a)+v*(b-a);
  const d=Math.fround(surface(loX+step,loZ+step));return d+(1-u)*(b-d)+(1-v)*(c-d);
}
function clipTriangle(points,triangle){
  let poly=points.map(p=>p.slice());
  const side=(a,b,p)=>(b[0]-a[0])*(p[2]-a[2])-(b[2]-a[2])*(p[0]-a[0]);
  const orientation=Math.sign(side(triangle[0],triangle[1],triangle[2]));
  for(let i=0;i<3;i++){
    const a=triangle[i],b=triangle[(i+1)%3],input=poly;poly=[];
    for(let j=0;j<input.length;j++){
      const p=input[j],q=input[(j+1)%input.length],dp=side(a,b,p)*orientation,dq=side(a,b,q)*orientation;
      if(dp>=0)poly.push(p);
      if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);poly.push(p.map((v,k)=>v+(q[k]-v)*t));}
    }
  }
  return poly;
}
export function quadTerrainLift(corners,surface,margin=.035){
  let required=0;
  const step=1.5,origin=-24,minX=Math.min(...corners.map(p=>p[0])),maxX=Math.max(...corners.map(p=>p[0])),minZ=Math.min(...corners.map(p=>p[2])),maxZ=Math.max(...corners.map(p=>p[2]));
  const loX=origin+Math.floor((minX-origin)/step)*step,loZ=origin+Math.floor((minZ-origin)/step)*step;
  for(let z=loZ;z<=maxZ;z+=step)for(let x=loX;x<=maxX;x+=step){
    // Float32 matches the vertices actually submitted by WorldScene.terrain.
    const a=[x,Math.fround(surface(x,z)),z],b=[x,Math.fround(surface(x,z+step)),z+step],c=[x+step,Math.fround(surface(x+step,z)),z],d=[x+step,Math.fround(surface(x+step,z+step)),z+step];
    for(const tri of [[a,b,c],[c,b,d]]){
      const [p,q,r]=tri,det=(q[0]-p[0])*(r[2]-p[2])-(r[0]-p[0])*(q[2]-p[2]);
      for(const v of clipTriangle(corners,tri)){
        const u=((v[0]-p[0])*(r[2]-p[2])-(r[0]-p[0])*(v[2]-p[2]))/det;
        const w=((q[0]-p[0])*(v[2]-p[2])-(v[0]-p[0])*(q[2]-p[2]))/det;
        required=Math.max(required,p[1]+u*(q[1]-p[1])+w*(r[1]-p[1])+margin-v[1]);
      }
    }
  }
  return required;
}
