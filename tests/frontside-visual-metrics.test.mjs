import test from 'node:test';
import assert from 'node:assert/strict';
import {accumulateControlEnvelope,addControlUncertainty,controlEnvelopeMetrics,alphaDistanceGate,regions} from '../tools/lib/frontside-visual-metrics.mjs';
const width=64,linear=Float64Array.from({length:256},(_,i)=>{const v=i/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
function opaque(value){const out=new Uint8Array(width*width*4);for(let p=0;p<width*width;p++)out.set([value,value,value,255],p*4);return out;}

test('observed control deviations are added per channel and bound every measured reference',()=>{
 const reference=opaque(64),envelope=new Float64Array(width*width*3),repeats=[];
 for(const [pixel,channel,value] of [[0,0,65],[2,1,66],[0,0,63]]){const repeat=reference.slice();repeat[pixel*4+channel]=value;repeats.push(repeat);accumulateControlEnvelope(envelope,reference,repeat,linear);}
 const candidate=reference.slice();candidate[0]=68;
 for(const repeat of repeats)for(let p=0;p<width*width;p++)for(let c=0;c<3;c++){
  const nominal=Math.abs(linear[candidate[p*4+c]]-linear[reference[p*4+c]]),actual=Math.abs(linear[candidate[p*4+c]]-linear[repeat[p*4+c]]);
  assert.ok(addControlUncertainty(nominal,envelope[p*3+c])>=actual);
 }
 assert.equal(envelope[1],0,'noise from red must not replace independent green evidence');
});

test('uncertainty consumes the unchanged tile budget even when its own source budget passes',()=>{
 const reference=opaque(64),repeat=reference.slice(),envelope=new Float64Array(width*width*3);repeat[0]=65;accumulateControlEnvelope(envelope,reference,repeat,linear);
 assert.equal(controlEnvelopeMetrics(envelope,reference,width).passes,true);
 const nominal=.009999;let boundedTileSum=0;
 for(let y=0;y<16;y++)for(let x=0;x<16;x++)for(let c=0;c<3;c++)boundedTileSum+=addControlUncertainty(nominal,envelope[(y*width+x)*3+c]);
 assert.ok(nominal<.01);assert.ok(boundedTileSum/(16*16*3)>.01,'a passing nominal tile must fail when its margin cannot cover measured uncertainty');
});

test('alpha changes invalidate source stability and connected noise cannot hide in global MAE',()=>{
 const reference=opaque(127),repeat=reference.slice(),envelope=new Float64Array(width*width*3);repeat[3]=254;
 assert.equal(accumulateControlEnvelope(envelope,reference,repeat,linear).alphaDifferences,1);
 repeat.set(reference);for(let p=0;p<4;p++)repeat[p*4]=128;
 accumulateControlEnvelope(envelope,reference,repeat,linear);const noise=controlEnvelopeMetrics(envelope,reference,width);
 assert.ok(noise.linearRgbMae<.0004);assert.ok(noise.maxTileMae<.002);assert.equal(noise.outliers[0].pixels,4);assert.equal(noise.passes,false);
});

test('one-pixel Hausdorff uses Euclidean distance and interior holes retain their classification',()=>{
 const a=new Uint8Array(width*width*4),b=a.slice();a[(5*width+5)*4+3]=255;b[(5*width+6)*4+3]=255;
 assert.equal(alphaDistanceGate(a,b,width).passes,true);b.fill(0);b[(6*width+6)*4+3]=255;assert.equal(alphaDistanceGate(a,b,width).passes,false);
 const original=new Uint8Array(width*width);for(let y=2;y<width-2;y++)for(let x=2;x<width-2;x++)original[y*width+x]=1;
 const mask=new Uint8Array(width*width);mask[5*width+5]=1;assert.equal(regions(mask,width,original)[0].classification,'interior');mask.fill(0);mask[5*width+2]=1;assert.equal(regions(mask,width,original)[0].classification,'contour');
});
