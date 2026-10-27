// Four curved radial fronds, shared centre; low silhouette, no crossed planes.
export function fernClumpGeometryData(){
 const d={position:[],normal:[],flatPosition:[],flatNormal:[],bladeRoot:[],uv:[],cardUv:[],frondAngle:[],frondSlope:[],index:[]};
 for(let f=0;f<4;f++){
  const angle=f*Math.PI/2+[0,.15,-.12,.08][f],ca=Math.cos(angle),sa=Math.sin(angle),base=d.position.length/3;
  const length=[.70,.65,.73,.68][f],width=[.19,.21,.18,.20][f];
  for(let row=0;row<5;row++)for(let side=0;side<2;side++){
   const t=row/4,x=(side?1:-1)*width*.85,z=t*length,y=.035+Math.sin(t*Math.PI)*.18+.14*t;
   const p=[x*ca-z*sa,y,x*sa+z*ca];
   d.position.push(...p);d.flatPosition.push(...p);d.normal.push(0,1,0);d.flatNormal.push(0,1,0);d.bladeRoot.push(0,.035,0);d.uv.push(t,.2);d.cardUv.push(.25+.5*side,.22+.76*t);d.frondAngle.push(angle);d.frondSlope.push((Math.cos(t*Math.PI)*Math.PI*.18+.14)/length*1.6/1.35);
  }
  for(let row=0;row<4;row++){const a=base+row*2;d.index.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 return d;
}
