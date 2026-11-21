import {readFile,writeFile} from 'node:fs/promises';

// Correlate CPU timing envelopes with wall intervals in one instrumented run.
// The remainder is unattributed; it is not a measurement of GPU execution.
const input=process.env.CAMERA_PROFILE_INPUT??'docs/lighting/tree-near-retexture/performance/mangrove-foreground-live-reveal-camera-stage-profile-a.json';
const output=process.env.CAMERA_PROFILE_OUTPUT??'docs/guardian/gpu-animation/camera-frame-attribution.json';
const report=JSON.parse(await readFile(input,'utf8')),p=report.cameraPause;
if(!p?.frameRows?.length||!p.profileRows?.length)throw Error('Profile or frame intervals missing');
const result=p.frameRows.map(frame=>{
 const start=frame.at-frame.wallInterval,end=frame.at,stages=Array(9).fill(0);let draw=0,updates=0,partial=0;
 for(const row of p.profileRows){const total=row.stages.reduce((a,b)=>a+b,0)+(row.draw??0);if(row.at<start||row.at>=end)continue;if(row.at+total>end){partial++;continue;}updates++;row.stages.forEach((value,i)=>stages[i]+=value);draw+=row.draw??0;}
 const measured=stages.reduce((a,b)=>a+b,0)+draw;
 return {at:frame.at,wall:frame.wallInterval,raf:frame.rafInterval,updates,partial,stages,draw,measured,unattributed:frame.wallInterval-measured};
});
const top=[...result].sort((a,b)=>b.wall-a.wall).slice(0,10);
await writeFile(output,JSON.stringify({scope:'One instrumented paused-camera run. A stage envelope is counted only if fully inside the interval; remainder includes scheduling, async work, profiling and other unmeasured work and is not GPU time.',renderer:report.renderer,selected:p.selected,frames:result,top},null,2)+'\n');
console.log(JSON.stringify({frames:result.length,top:top.slice(0,3)}));
