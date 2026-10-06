// Offline only. Project a common envelope for every horizontal capture view.
// baseV locates the logical trunk foot, independently of the image's padding.
export function atlasElevationFrame(position,base,height,elevationDegrees,views=8){
 if(!Number.isFinite(elevationDegrees)||elevationDegrees<0||elevationDegrees>45)throw Error('Invalid atlas elevation');
 if(!Number.isInteger(views)||views<1||!Number.isFinite(height)||height<=0)throw Error('Invalid atlas frame');
 const angle=elevationDegrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 if(!elevationDegrees)return {elevationDegrees,projectedBottom:0,projectedTop:height*1.04,impostorHeight:height*1.04,baseV:0};
 let min=0,max=0;
 for(let view=0;view<views;view++){
  const yaw=view*Math.PI*2/views,dx=Math.sin(yaw),dz=Math.cos(yaw);
  for(let i=0;i<position.count;i++){
   const up=(position.getY(i)-base[1])*c-((position.getX(i)-base[0])*dx+(position.getZ(i)-base[2])*dz)*s;
   min=Math.min(min,up);max=Math.max(max,up);
  }
 }
 const padding=(max-min)*.02,bottom=min-padding,top=max+padding,range=top-bottom;
 return {elevationDegrees,projectedBottom:bottom,projectedTop:top,impostorHeight:range/c,baseV:-bottom/range};
}
