// Generated from Bioma Lab V4.0 by tools/prepare_obstruction.py.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}, TAU=Math.PI*2;
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], norm=a=>mul(a,1/(Math.hypot(...a)||1));
function obstructionRecord(p,prototype){
 const lo=prototype.min,hi=prototype.max,sx=p.sx??1,sy=p.sy??1,sz=p.sz??1;
 return {id:p.id,x:p.x,y:p.y,z:p.z,cos:Math.cos(p.yaw||0),sin:Math.sin(p.yaw||0),
  center:[(lo[0]+hi[0])*.5*sx,(lo[1]+hi[1])*.5*sy,(lo[2]+hi[2])*.5*sz],
  half:[(hi[0]-lo[0])*.5*sx,(hi[1]-lo[1])*.5*sy,(hi[2]-lo[2])*.5*sz]};
}
function obstructionFrame(eye,target,fov,aspect,distance){
 const forward=norm(sub(target,eye)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
 return {eye,forward,right,up,tan:Math.tan(fov*.5),aspect,distance};
}
function obstructionVisibility(rec,frame,offsetX=0,offsetZ=0){
 const dx=frame.eye[0]-offsetX-rec.x,dz=frame.eye[2]-offsetZ-rec.z;
 const ex=dx*rec.cos-dz*rec.sin-rec.center[0],ey=frame.eye[1]-rec.y-rec.center[1],ez=dx*rec.sin+dz*rec.cos-rec.center[2],h=rec.half;
 const distance=Math.hypot(Math.max(Math.abs(ex)-h[0],0),Math.max(Math.abs(ey)-h[1],0),Math.max(Math.abs(ez)-h[2],0));
 if(distance>=frame.distance)return 1;
 // A camera inside the volume must never be surrounded by opaque canopy triangles.
 if(distance<.18)return 0;
 const centerDelta=[-rec.cos*ex-rec.sin*ez,-ey,rec.sin*ex-rec.cos*ez];
 const support=axis=>Math.abs(axis[0]*rec.cos-axis[2]*rec.sin)*h[0]+Math.abs(axis[1])*h[1]+Math.abs(axis[0]*rec.sin+axis[2]*rec.cos)*h[2];
 const depth=dot(centerDelta,frame.forward);
 if(depth+support(frame.forward)<.15)return 1; // entirely behind the camera
 // Protect a broad central viewing corridor. Nearby props off to the side stay visible.
 const focalDepth=Math.max(.5,depth),pad=.45;
 if(Math.abs(dot(centerDelta,frame.right))>support(frame.right)+focalDepth*frame.tan*frame.aspect*.82+pad)return 1;
 if(Math.abs(dot(centerDelta,frame.up))>support(frame.up)+focalDepth*frame.tan*.82+pad)return 1;
 return smooth(frame.distance*.45,frame.distance,distance);
}
export const OBSTRUCTION_SOURCE_SHA256="c1eaa6a1fa947b53110bacc5d776672159217350d40ded570b7f53fd85591ebe";
export const coverageThreshold="float coverageThreshold(vec2 pixel){\n ivec2 p=ivec2(pixel)&7;int n=0;\n for(int bit=0;bit<3;bit++){int x=(p.x>>bit)&1,y=(p.y>>bit)&1;n=n*4+(2*(x^y)+y);} \n return (float(n)+.5)/64.;\n}";
export {obstructionRecord,obstructionFrame,obstructionVisibility};
