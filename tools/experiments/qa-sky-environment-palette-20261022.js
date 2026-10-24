// QA only: display grading converted back to exposed radiance before existing compression.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function gradeRadiance(rgb,index,dy){
 let c=rgb.map(v=>Math.pow(1-Math.exp(-Math.max(0,v)),1/2.2));
 let lum=c[0]*.2126+c[1]*.7152+c[2]*.0722;c=c.map(v=>mix(lum,v,index?1.10:1.28));
 if(index===0){
  const altitude=smooth(-.03,.45,dy),cloud=smooth(.62,.84,Math.min(c[0],c[1]))*(1-smooth(.035,.16,c[2]-c[0]));
  const low=[.66,.76,.83],high=[.22,.48,.78],warm=[1.04,1.02,.98];
  c=c.map((v,i)=>mix(v,mix(low[i],high[i],altitude),(.35+.4*altitude)*(1-cloud)));
  c=c.map((v,i)=>mix(v,v*warm[i],cloud*.65));
  const horizon=1-smooth(.02,.32,Math.max(dy,0));lum=c[0]*.2126+c[1]*.7152+c[2]*.0722;
  c=c.map((v,i)=>mix(v,[.70,.88,1.06][i]*lum,horizon*.55*(1-cloud)));
 }else c=c.map((v,i)=>v*[.66,.80,1.05][i]);
 // Bound inverse exponential at display white; radiance compression remains unchanged.
 return c.map(v=>-Math.log(Math.max(1e-6,1-Math.pow(Math.max(0,Math.min(1,v)),2.2))));
}
const SKY_EXPOSURES=[1.33,.62],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function latitudeDirection(y,h,index){
 const syuv=(y+.5)/h;let lo=0,hi=1;
 for(let j=0;j<16;j++){const mid=(lo+hi)/2;if(mid-(index===0?.025*smooth(.10,.50,mid):0)<syuv)lo=mid;else hi=mid;}
 return Math.cos(Math.PI*(lo+hi)/2);
}
export function buildGradedEnvironmentPixels(data,index,{cacheLatitude=true}={}){
  const started=performance.now();const w=256,h=128,bytes=new Uint8Array(w*h*4),sx=data.width/w,sy=data.height/h,src=data.pixels;
  const expo=SKY_EXPOSURES[index],directions=cacheLatitude?Float64Array.from({length:h},(_,y)=>latitudeDirection(y,h,index)):null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   let r=0,g=0,b=0,n=0;
   for(let dy=0;dy<sy;dy+=2)for(let dx=0;dx<sx;dx+=2){
    const k=((Math.floor(y*sy+dy))*data.width+Math.floor(x*sx+dx))*4;
    const s=src[k+3]?Math.pow(2,src[k+3]-128)/256:0;r+=src[k]*s;g+=src[k+1]*s;b+=src[k+2]*s;n++;
   }
   const at=(y*w+x)*4;
   const graded=gradeRadiance([r/n*expo,g/n*expo,b/n*expo],index,directions?directions[y]:latitudeDirection(y,h,index));
   for(const[c,v]of[[0,graded[0]],[1,graded[1]],[2,graded[2]]]){const l=v;bytes[at+c]=Math.round(clamp(l/(1+l*.45)/4,0,1)*255);}bytes[at+3]=255;
  }
 return {width:w,height:h,pixels:bytes,qaPalette:{index,buildMs:performance.now()-started,bytes:bytes.byteLength}};
}
