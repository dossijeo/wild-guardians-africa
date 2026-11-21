const fract=x=>x-Math.floor(x),wrap=x=>(x%32+32)%32;
function hash(x,y){let a=fract(wrap(x)*.1031),b=fract(wrap(y)*.1030),c=fract(wrap(x)*.0973);const d=a*(b+19.19)+b*(c+19.19)+c*(a+19.19);a+=d;b+=d;c+=d;return fract((a+b)*c)}
export function createWaterSlopePixels(){
 const size=256,data=new Uint8Array(size*size*2);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=(x+.5)/size*32,py=(y+.5)/size*32,ix=Math.floor(px),iy=Math.floor(py),fx=fract(px),fy=fract(py),ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
  const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1),mixed=a-b-c+d;
  const sx=6*fx*(1-fx)*(b-a+mixed*uy),sy=6*fy*(1-fy)*(c-a+mixed*ux),at=(y*size+x)*2;
  data[at]=Math.round((sx/3+.5)*255);data[at+1]=Math.round((sy/3+.5)*255);
 }
 return {width:size,height:size,pixels:data};
}
