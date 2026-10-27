import {Vector2,Vector4} from 'three';
// QA prototype: conservative clip-space bounds of every soft-particle quad.
// Return null for full-frame fallback, including near-plane intersections.
export function softDepthRegion(world,width,height){
 if([...world.destructionPass.buildings].some(b=>b.effects.native.smoke.length))return null;
 const p=new Vector4();let x0=1,y0=1,x1=-1,y1=-1,seen=false;
 for(const slot of ['workVfx','attackVfx','shieldVfx','agricultureVfx','materialVfx','locomotionVfx'])for(const fx of world[slot]?.effects.values()??[]){
  if(fx.stopped||!fx.softParticleDepth)continue;
  const data=fx.spriteBuffer.array,count=fx.sprites.geometry.instanceCount,vp=fx.uniforms.uVP.value;
  for(let i=0;i<count;i++){const o=i*25;if(!(data[o+21]>0))continue;
   // Rotated unit corner square fits a circle of radius sqrt(0.5).
   // Orthogonal billboard basis then fits this local-space enclosing cube.
   const radius=Math.SQRT1_2*Math.hypot(data[o+3],data[o+4]);
   if(!Number.isFinite(radius))return null;seen=true;
   for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
    p.set(data[o]+x*radius,data[o+1]+y*radius,data[o+2]+z*radius,1).applyMatrix4(vp);
    if(!Number.isFinite(p.x+p.y+p.z+p.w)||p.w<=0||p.z<=-p.w)return null;
    x0=Math.min(x0,p.x/p.w);x1=Math.max(x1,p.x/p.w);y0=Math.min(y0,p.y/p.w);y1=Math.max(y1,p.y/p.w);
   }
  }
 }
 if(!seen)return null;
 const left=Math.max(0,Math.floor((x0+1)*width/2)-2),bottom=Math.max(0,Math.floor((y0+1)*height/2)-2);
 const right=Math.min(width,Math.ceil((x1+1)*width/2)+2),top=Math.min(height,Math.ceil((y1+1)*height/2)+2);
 if(right<=left||top<=bottom)return null;
 return {x:left,y:bottom,width:right-left,height:top-bottom};
}
export function installSoftDepthRegion(world){
 const owner=world.destructionPass,original=owner.captureDepth,records=[];
 const wrapped=function(camera,scene){const target=this.smokeDepth,old=target.scissor.clone(),enabled=target.scissorTest;
  const size=this.renderer.getDrawingBufferSize(new Vector2());if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);const region=softDepthRegion(world,size.x,size.y);records.push({at:performance.now(),region,width:target.width,height:target.height});
  try{if(region){target.scissor.set(region.x,region.y,region.width,region.height);target.scissorTest=true;}return original.call(this,camera,scene);}
  finally{target.scissor.copy(old);target.scissorTest=enabled;}
 };
 owner.captureDepth=wrapped;return ()=>{if(owner.captureDepth===wrapped)owner.captureDepth=original;return records;};
}
