// Pure metrics used only by the isolated FrontSide QA fixture.
export function accumulateControlEnvelope(envelope,reference,repeat,linear){
 if(reference.length!==repeat.length||envelope.length!==reference.length/4*3)throw Error('Control dimensions differ');
 let differentBytes=0,maxByteDifference=0,alphaDifferences=0;
 for(let i=0;i<repeat.length;i++){if(repeat[i]!==reference[i]){differentBytes++;const c=i%4;
  if(c===3)alphaDifferences++;else{const pixel=Math.floor(i/4),delta=Math.abs(linear[repeat[i]]-linear[reference[i]]);envelope[pixel*3+c]=Math.max(envelope[pixel*3+c],2*delta);}
 }maxByteDifference=Math.max(maxByteDifference,Math.abs(repeat[i]-reference[i]));}
 return{differentBytes,maxByteDifference,alphaDifferences};
}
export function addControlUncertainty(nominalError,envelope){return nominalError+envelope;}
export function regions(mask,width,originalAlpha){
 const seen=new Uint8Array(mask.length),queue=new Uint32Array(mask.length),out=[];
 for(let seed=0;seed<mask.length;seed++){if(!mask[seed]||seen[seed])continue;let head=0,tail=1,minX=width,maxX=0,minY=width,maxY=0,contour=false;queue[0]=seed;seen[seed]=1;
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=width){contour=true;continue;}const n=ny*width+nx;if(originalAlpha&&!originalAlpha[n])contour=true;if(mask[n]&&!seen[n]){seen[n]=1;queue[tail++]=n;}}
  }out.push({pixels:tail,diameterUpperBound:Math.hypot(maxX-minX,maxY-minY),bounds:[minX,minY,maxX,maxY],classification:originalAlpha?(contour?'contour':'interior'):'rgb'});
 }return out.sort((a,b)=>b.pixels-a.pixels);
}
// The declared Hausdorff gate is one pixel. Test the exact Euclidean radius-1
// neighborhood in both directions; diagonal neighbors are farther than 1px.
export function alphaDistanceGate(a,b,width){
 const violations=(from,to)=>{let count=0;for(let p=0;p<from.length/4;p++){
  if(!from[p*4+3])continue;const x=p%width,y=Math.floor(p/width);
  if(to[p*4+3]||(x>0&&to[(p-1)*4+3])||(x+1<width&&to[(p+1)*4+3])||(y>0&&to[(p-width)*4+3])||(y+1<width&&to[(p+width)*4+3]))continue;count++;
 }return count;};
 const missingBeyondOnePixel=violations(a,b),addedBeyondOnePixel=violations(b,a);
 return{radiusPixels:1,missingBeyondOnePixel,addedBeyondOnePixel,passes:missingBeyondOnePixel===0&&addedBeyondOnePixel===0};
}
export function controlEnvelopeMetrics(envelope,reference,width){
 const columns=Math.ceil(width/16),hist=new Uint32Array(256),sum=new Float64Array(columns*columns),count=new Uint32Array(columns*columns),mask=new Uint8Array(width*width);let error=0,channels=0,maxError=0;
 for(let pixel=0;pixel<reference.length/4;pixel++){if(!reference[pixel*4+3])continue;const tile=Math.floor(pixel/width/16)*columns+Math.floor(pixel%width/16);
  for(let c=0;c<3;c++){const value=envelope[pixel*3+c];error+=value;channels++;sum[tile]+=value;count[tile]++;maxError=Math.max(maxError,value);hist[Math.min(255,Math.ceil(value*255))]++;if(value>.006)mask[pixel]=1;}}
 let accumulated=0,p99=0;for(let i=0;i<hist.length;i++){accumulated+=hist[i];if(accumulated>=channels*.99){p99=i/255;break;}}
 const maxTileMae=Math.max(...Array.from(sum,(v,i)=>count[i]?v/count[i]:0)),outliers=regions(mask,width);
 const mae=error/Math.max(channels,1);return{linearRgbMae:mae,p99Approx:p99,maxTileMae,maxError,outliers,passes:mae<=.0004&&p99<=.003&&maxTileMae<=.002&&!outliers.some(r=>r.pixels>3)};
}
