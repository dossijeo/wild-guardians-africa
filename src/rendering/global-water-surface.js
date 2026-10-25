import * as THREE from 'three';
// Numerical periodic slope data: RG8, 256², shared by all water materials.
const fract=x=>x-Math.floor(x),wrap=x=>(x%32+32)%32;
function hash(x,y){let a=fract(wrap(x)*.1031),b=fract(wrap(y)*.1030),c=fract(wrap(x)*.0973);const d=a*(b+19.19)+b*(c+19.19)+c*(a+19.19);a+=d;b+=d;c+=d;return fract((a+b)*c)}
export function createWaterSlopeTexture(){
 const size=256,data=new Uint8Array(size*size*2);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=(x+.5)/size*32,py=(y+.5)/size*32,ix=Math.floor(px),iy=Math.floor(py),fx=fract(px),fy=fract(py),ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
  const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1),mixed=a-b-c+d;
  const sx=6*fx*(1-fx)*(b-a+mixed*uy),sy=6*fy*(1-fy)*(c-a+mixed*ux),at=(y*size+x)*2;
  data[at]=Math.round((sx/3+.5)*255);data[at+1]=Math.round((sy/3+.5)*255);
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

// One numerical slope map per lighting context. Retired chunks release their
// reference; the last water material releases the texture, including load failure.
const bindings=new WeakMap();
export function acquireWaterSlope(lighting,material){
 let entry=bindings.get(lighting);
 if(!entry){entry={uniform:{value:createWaterSlopeTexture()},owners:0};bindings.set(lighting,entry);}
 entry.owners++;
 const release=()=>{material.removeEventListener('dispose',release);if(--entry.owners===0){entry.uniform.value.dispose();bindings.delete(lighting);}};
 material.addEventListener('dispose',release);return entry.uniform;
}

export function patchGlobalWaterSurface(source){
  const old='vec3 wn=normalize(vec3(.040*sin(worldPatternPosition(worldP).x*.43+worldPatternPosition(worldP).z*.18+uTime*.40),1.,.040*cos(worldPatternPosition(worldP).z*.37-worldPatternPosition(worldP).x*.16-uTime*.32)));';
  if(!source.includes(old))throw Error('Water ripple shader anchor missing');
  const paint='vec3 paint=paintedWater(wp,.001);vec3 base=mix(uInk1,paint,.42)*.72;';
  for(const token of [paint,'environment4(reflect(-V,wn),.22)','clamp(f*.78,.03,.75)'])if(!source.includes(token))throw Error('Experimental water source changed');
  return ('uniform sampler2D uGlobalWaterSlope;\nvec2 globalWaterSlope(vec2 p){return texture2D(uGlobalWaterSlope,p/32.).rg*3.-1.5;}\n'+source)
   .replace(old,`vec2 rippleP=worldPatternPosition(worldP).xz+uSeedOffset;
   vec2 slope=.17*globalWaterSlope(rippleP*1.05+vec2(uTime*.12,uTime*.07))+.065*globalWaterSlope(rippleP*2.7+vec2(-uTime*.16,uTime*.10));
   vec3 wn=normalize(vec3(slope.x,1.,slope.y));`)
   .replace(paint,'vec3 base=uInk0*.72;')
   .replace('environment4(reflect(-V,wn),.22)','environment4(reflect(-V,wn),.10)')
   .replace('clamp(f*.78,.03,.75)','clamp(f*.78,.18,.75)');
}
