import {Break,Fn,If,Loop,abs,clamp,float,floor,getScreenPosition,getViewPosition,int,ivec2,max,min,mix,textureLoad,vec2,vec4} from 'three/tsl';

// Trace a finite view-space segment against a minimum-depth hierarchy. All
// levels are separate textures: selecting one via uniform branches preserves
// conservative traversal for odd-sized attachments without filtered samples.
// Returns hit UV in xy and confidence in z; zero confidence means sky fallback.
export function hiSsrTraceNode({depth,levels,resolution,start,end,projection,projectionInverse,thickness,maxSteps=96}){
 if(!depth?.isNode||!Array.isArray(levels)||levels.length>12||levels.some(level=>!level?.isNode)||![resolution,start,end,projection,projectionInverse,thickness].every(node=>node?.isNode)||!Number.isSafeInteger(maxSteps)||maxSteps<1||maxSteps>512)throw TypeError('Invalid Hi-SSR trace inputs');
 return Fn(()=>{
  const a=getScreenPosition(start,projection).mul(resolution).toVar(),b=getScreenPosition(end,projection).mul(resolution).toVar(),delta=b.sub(a).toVar();
  const clipA=projection.mul(vec4(start,1)),clipB=projection.mul(vec4(end,1)),depthA=clipA.z.div(clipA.w),depthB=clipB.z.div(clipB.w);
  // Start beyond the source pixel to avoid hitting the surface itself.
  const span=max(max(abs(delta.x),abs(delta.y)),.0001),t=float(1).div(span).toVar(),level=int(levels.length).toVar(),hit=vec4(0).toVar();
  Loop(maxSteps,()=>{
   const p=a.add(delta.mul(t)).toVar();
   If(t.greaterThanEqual(1).or(p.x.lessThan(0)).or(p.y.lessThan(0)).or(p.x.greaterThanEqual(resolution.x)).or(p.y.greaterThanEqual(resolution.y)),()=>Break());
   const size=float(1).toVar(),cellDepth=float(1).toVar();
   for(let i=0;i<=levels.length;i++){
    const scale=2**i,source=i===0?depth:levels[i-1];
    If(level.equal(i),()=>{
     size.assign(scale);
     const pixel=ivec2(floor(p.div(scale)));
     const sample=textureLoad(source,pixel).setUpdateMatrix(false);
     cellDepth.assign(i===0?sample:sample.r);
    });
   }
   const cell=floor(p.div(size)),edgeX=cell.x.add(delta.x.greaterThan(0).select(1,0)).mul(size),edgeY=cell.y.add(delta.y.greaterThan(0).select(1,0)).mul(size);
   const tx=abs(delta.x).greaterThan(.00001).select(edgeX.sub(a.x).div(delta.x),float(2)),ty=abs(delta.y).greaterThan(.00001).select(edgeY.sub(a.y).div(delta.y),float(2));
   const next=min(float(1),max(t.add(.000001),min(tx,ty).add(.000001))).toVar(),front=mix(depthA,depthB,t),back=mix(depthA,depthB,next);
   If(max(front,back).lessThan(cellDepth),()=>{t.assign(next);level.assign(min(level.add(1),levels.length));}).Else(()=>{
    If(level.greaterThan(0),()=>{level.subAssign(1);}).Else(()=>{
     const uv=clamp(a.add(delta.mul(next)).div(resolution),vec2(0),vec2(.999999));
     const surface=getViewPosition(uv,cellDepth,projectionInverse),ray=getViewPosition(uv,back,projectionInverse),gap=surface.z.sub(ray.z);
     If(cellDepth.lessThan(1).and(back.greaterThanEqual(cellDepth)).and(gap.greaterThanEqual(0)).and(gap.lessThanEqual(thickness)),()=>{
      const edge=min(min(uv.x,uv.y),min(float(1).sub(uv.x),float(1).sub(uv.y)));
      hit.assign(vec4(uv,clamp(edge.mul(12),0,1),1));Break();
     });
     t.assign(next);level.assign(min(level.add(1),levels.length));
    });
   });
  });
  return hit;
 })();
}
