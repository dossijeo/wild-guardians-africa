// Four curved radial fronds, shared centre; low silhouette, no crossed planes.
export function fernClumpGeometryData(){
 const d={position:[],normal:[],flatPosition:[],flatNormal:[],bladeRoot:[],uv:[],cardUv:[],frondAngle:[],index:[]};
 for(let f=0;f<4;f++){
  const angle=f*Math.PI/2+[0,.15,-.12,.08][f],ca=Math.cos(angle),sa=Math.sin(angle),base=d.position.length/3;
  const length=[.53,.49,.55,.51][f],width=[.19,.21,.18,.20][f];
  for(let row=0;row<3;row++)for(let side=0;side<2;side++){
   const t=row/2,x=(side?1:-1)*width*(.45+.55*t),z=t*length,y=.035+Math.sin(t*Math.PI*.78)*.43;
   const p=[x*ca-z*sa,y,x*sa+z*ca];
   d.position.push(...p);d.flatPosition.push(...p);d.normal.push(0,1,0);d.flatNormal.push(0,1,0);d.bladeRoot.push(0,.035,0);d.uv.push(t,.2);d.cardUv.push(.25+.5*side,.02+.96*t);d.frondAngle.push(angle);
  }
  for(let row=0;row<2;row++){const a=base+row*2;d.index.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 return d;
}
