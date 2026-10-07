// Offline QA of the existing experimental texture, never imported by gameplay.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FineNoiseVolume,cornerNoise} from '../tests/browser/noise-volume.js';

const smooth=f=>f*f*(3-2*f),mix=(a,b,t)=>a+(b-a)*t;
const wrap=(i,size)=>((i%size)+size)%size;
function interpolate(p,read){
  const i=p.map(Math.floor),f=p.map((v,k)=>smooth(v-i[k]));
  const x=(y,z)=>mix(read(i[0],y,z),read(i[0]+1,y,z),f[0]);
  const y=z=>mix(x(i[1],z),x(i[1]+1,z),f[1]);
  return mix(y(i[2]),y(i[2]+1),f[2]);
}
export const analyticNoise=p=>interpolate(p,cornerNoise);
export const sampleVolume=(p,data,size=64)=>interpolate(p,(x,y,z)=>data[wrap(x,size)+size*(wrap(y,size)+size*wrap(z,size))]/255);

function metrics(values){
  const sorted=[...values].sort((a,b)=>a-b),n=values.length;
  return {samples:n,meanAbsolute:values.reduce((a,b)=>a+b,0)/n,
    rootMeanSquare:Math.sqrt(values.reduce((a,b)=>a+b*b,0)/n),
    p95Absolute:sorted[Math.ceil(n*.95)-1],maxAbsolute:sorted.at(-1)};
}
// Reproducible points, with no Math.random or distribution changed each run.
function generator(seed=712){
  let value=seed>>>0;
  return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}
export function auditNoiseVolume(){
  const volume=new FineNoiseVolume({singleExit:true}),data=volume.texture.image.data,size=64;
  try{
    const random=generator(),points=4096,interior=[],seam=[],wide=[],periodic=[],negative=[];
    let maxContinuityGap=0;
    for(let j=0;j<points;j++){
      // Interior cells use precisely the same eight analytic corners; only R8 differs.
      const p=[random()*63,random()*63,random()*63];
      interior.push(Math.abs(sampleVolume(p,data)-analyticNoise(p)));
      const edge=[63+random(),random()*63,random()*63];
      seam.push(Math.abs(sampleVolume(edge,data)-analyticNoise(edge)));
      const world=[(random()*2-1)*1024,(random()*2-1)*128,(random()*2-1)*1024];
      wide.push(Math.abs(sampleVolume(world,data)-analyticNoise(world)));
      periodic.push(Math.abs(sampleVolume(world,data)-sampleVolume([world[0]+64,world[1],world[2]],data)));
      const neg=[-random()*63,-random()*63,-random()*63];
      negative.push(Math.abs(sampleVolume(neg,data)-analyticNoise(neg)));
      // Wrapped field must stay continuous across positive AND negative tile seams.
      for(const boundary of [-64,0,64]){
        const yz=[random()*64,random()*64],epsilon=1e-6;
        maxContinuityGap=Math.max(maxContinuityGap,Math.abs(sampleVolume([boundary-epsilon,...yz],data)-sampleVolume([boundary+epsilon,...yz],data)));
      }
    }
    assert.ok(metrics(interior).maxAbsolute<=.5/255+1e-12,'R8 interpolation exceeded half-byte error in unwrapped cells');
    assert.ok(metrics(periodic).maxAbsolute<1e-10,'wrapped sampler lost its 64-cell period');
    assert.ok(maxContinuityGap<1e-9,'wrapped field has a discontinuity at a tile boundary');
    // Hand-check indexed texel values and interpolation, independent of generated hashes.
    const hand=new Uint8Array(8);hand[1]=255;
    assert.equal(sampleVolume([1,0,0],hand,2),1);
    assert.equal(sampleVolume([.5,0,0],hand,2),.5);
    assert.equal(sampleVolume([1.5,0,0],hand,2),.5);
    assert.equal(sampleVolume([-.5,0,0],hand,2),.5);
    assert.equal(sampleVolume([.5,.5,.5],hand,2),.125);
    assert.equal(sampleVolume([1,.5,.5],hand,2),.25);
    assert.equal(sampleVolume([0,1,0],hand,2),0);
    assert.equal(sampleVolume([0,0,1],hand,2),0);
    return {schema:1,scope:'CPU double-precision model of authored smooth interpolation and normalized R8 repeat sampling; not GPU pixels or visual acceptance',
      seed:712,size,sourceBytes:data.byteLength,dataSha256:createHash('sha256').update(data).digest('hex'),
      checks:{interiorHalfByteBound:true,period64:true,continuousWrappedSeams:true,handCheckedInterpolation:true},
      error:{interior:metrics(interior),wrappedPositiveSeam:metrics(seam),negativeOctant:metrics(negative),wideField:metrics(wide)},
      repeatedSampleDifference:metrics(periodic),maxContinuityGap,
      recipePeriods:[{recipe:'pigment low frequency',scale:.85,axisWorldPeriod:64/.85},
        {recipe:'pigment high frequency',scale:2.2,axisWorldPeriod:64/2.2},
        {recipe:'fallback ground fine noise',scale:2.6,patternSpaceAxisPeriod:64/2.6}],
      combinedPigmentAxisPeriod:1280,
      limitations:['No floating-point GLSL/hash or GPU texture filtering equivalence claim.',
        'Ground coordinates may be transformed by worldPatternPosition; pattern-space period is not necessarily a world-axis period.',
        'Coarse ground noise, palettes, textures and other shading remain nonperiodic; this does not prove a visible repeating ground pattern.',
        'Statistics concern raw scalar noise, not final weighted pigment, shaded color, performance or visibility.']};
  }finally{volume.dispose();}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=auditNoiseVolume();
  report.sources={};
  for(const path of ['tests/browser/noise-volume.js','src/rendering/fine-noise.js','src/rendering/african-toon-source.js','tools/audit_noise_volume.mjs'])
    report.sources[path]=createHash('sha256').update(await readFile(path)).digest('hex');
  const output=resolve(process.argv[2]??'.cache/noise-volume-spatial/report.json');
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output,checks:report.checks,error:report.error,sourceBytes:report.sourceBytes}));
}
