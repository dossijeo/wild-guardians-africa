// Box-filter supersampling in premultiplied linear light. Transparent RGB cannot
// bleed into leaf edges. Output uses the runtime's existing linear-alpha recipe.
export function downsamplePrelitLinear(bytes,width,height,factor=2){
 if(!(bytes instanceof Uint8Array)||bytes.length!==width*height*4||!Number.isInteger(factor)||factor<1||width%factor||height%factor)throw Error('Invalid supersampled RGBA image');
 const w=width/factor,h=height/factor,out=new Uint8Array(w*h*4),lut=Float64Array.from({length:256},(_,i)=>{const x=i/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}),encode=x=>Math.round(255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055)),n=factor*factor;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let r=0,g=0,b=0,a=0;
  for(let dy=0;dy<factor;dy++)for(let dx=0;dx<factor;dx++){const i=((y*factor+dy)*width+x*factor+dx)*4,v=bytes[i+3]/255;a+=v;r+=lut[bytes[i]]*v;g+=lut[bytes[i+1]]*v;b+=lut[bytes[i+2]]*v;}
  const i=(y*w+x)*4;out[i]=encode(r/n);out[i+1]=encode(g/n);out[i+2]=encode(b/n);out[i+3]=Math.round(255*a/n);
 }
 return {data:out,width:w,height:h,encoding:'srgb-encoded-linear-premultiplied'};
}
