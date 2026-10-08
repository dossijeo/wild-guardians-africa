// Prospective shadow gate for Three r180 RGBADepthPacking readbacks. No renderer
// mutation: callers must separately record the effective onBeforeShadow side.
export function comparePackedShadow(source,candidate,{near,far,height}){
 if(!(source instanceof Uint8Array)||!(candidate instanceof Uint8Array)||source.length!==candidate.length||source.length%4||!source.length)throw Error('Invalid packed shadow buffers');
 if(!Number.isFinite(near)||!Number.isFinite(far)||far<=near||!Number.isFinite(height)||height<=0)throw Error('Invalid shadow world scale');
 let union=0,intersection=0,missing=0,added=0,changedTexels=0,differentBytes=0,maxWorldDepthDelta=0;
 const unpack=(p,i)=>Math.min(1,p[i]/256+p[i+1]/65536+p[i+2]/16777216+p[i+3]/(255*16777216));
 for(let i=0;i<source.length;i+=4){
  const a=unpack(source,i),b=unpack(candidate,i),coveredA=a<1-1/16777216,coveredB=b<1-1/16777216;
  union+=coveredA||coveredB;intersection+=coveredA&&coveredB;missing+=coveredA&&!coveredB;added+=!coveredA&&coveredB;
  let changed=false;for(let c=0;c<4;c++)if(source[i+c]!==candidate[i+c]){differentBytes++;changed=true;}
  changedTexels+=changed;if(coveredA||coveredB)maxWorldDepthDelta=Math.max(maxWorldDepthDelta,Math.abs(a-b)*(far-near));
 }
 const alphaIoU=union?intersection/union:1,coverageDifferenceFraction=union?(missing+added)/union:0;
 const worldDepthLimit=Math.max(.0001,height*.0001);
 return {alphaIoU,missingTexels:missing,addedTexels:added,coverageDifferenceFraction,changedTexels,differentBytes,maxWorldDepthDelta,worldDepthLimit,passes:alphaIoU>=.999&&coverageDifferenceFraction<=.001&&maxWorldDepthDelta<=worldDepthLimit,meaning:'RGBADepthPacking CPU decode matching Three r180; coverage excludes clear far-depth within one D24 quantum. Depth gate applies over either-covered texels. No source-noise subtraction or GPU benefit.'};
}
