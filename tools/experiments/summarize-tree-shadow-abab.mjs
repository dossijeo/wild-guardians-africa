import fs from 'node:fs/promises';
const root=process.argv[2]??'docs/qa/mangrove-magic-20261026/tree-shadow-abab';
const stats=a=>{if(!a.length||a.some(x=>!Number.isFinite(x)))throw Error('Invalid samples');const s=[...a].sort((a,b)=>a-b);return {samples:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:s.at(-1)};};
const rows=[];
for(let i=0;i<4;i++){
 const dir=`${root}/${i}-${i%2}`,read=async f=>JSON.parse(await fs.readFile(dir+'/'+f+'.json'));
 const [r,g,c]=await Promise.all(['report','gpu','elevated-coverage'].map(read));
 if(r.errors.length||g.disjoint||!g.supported||g.gpu.length!==240)throw Error('Invalid run '+i);
 const mask=r.data.farGround.flatMap(x=>x.treeShadows?[x.treeShadows]:[]);if(!!mask.length!==!!(i%2))throw Error('Wrong shadow condition '+i);
 rows.push({run:i,shadows:!!(i%2),renderer:g.renderer,seed:r.data.seed,camera:c.camera,target:c.target,gpu:stats(g.gpu),cpuSubmission:stats(g.cpu),presentation:stats(g.intervals),draw:g.render,resources:g.memory,maskBaseBytes:mask.reduce((n,m)=>n+m.bytes,0)});
}
for(const r of rows)if(r.renderer!==rows[0].renderer||r.seed!==rows[0].seed||JSON.stringify(r.camera)!==JSON.stringify(rows[0].camera)||JSON.stringify(r.target)!==JSON.stringify(rows[0].target))throw Error('Mismatched conditions');
const result={scope:'A/B/A/B: shader without regional shadow sampler versus one-channel mask. Paused scene, elevated fixed camera, 720p medium, 60 warmup + 240 GPU samples per run. Resource counts are not VRAM bytes; CPU submission excludes native worker execution. No streaming or fern range extension in this isolated test.',rows,pairs:[0,2].map(i=>({baseline:i,candidate:i+1,gpuDeltaMs:rows[i+1].gpu.mean-rows[i].gpu.mean,triangleDelta:rows[i+1].draw.triangles-rows[i].draw.triangles,callDelta:rows[i+1].draw.calls-rows[i].draw.calls}))};
await fs.writeFile(root+'/summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
