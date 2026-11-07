// Contours are generated with the terrain revision and use world coordinates.
// Called only at an authored foot contact, not on every animation frame.
export function mudContainsPoint(surface,x,z){
 for(let k=0;k<(surface?.mudCenters?.length??0);k++){
  const center=surface.mudCenters[k],dx=x-center.x,dz=z-center.z;if(dx*dx+dz*dz>center.radius*center.radius)continue;
  const contour=surface.mudOutlines[k];let inside=false;
  for(let i=0,j=contour.length-1;i<contour.length;j=i++){
   const a=contour[j],b=contour[i],ex=b[0]-a[0],ez=b[1]-a[1],px=x-a[0],pz=z-a[1],dot=px*ex+pz*ez;
   if(Math.abs(ex*pz-ez*px)<=1e-9&&dot>=0&&dot<=ex*ex+ez*ez)return true;
   if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  if(inside)return true;
 }
 return false;
}
