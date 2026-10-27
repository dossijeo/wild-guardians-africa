import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/qa/mangrove-magic-20261026/impostor-3d-matched';
const stats=a=>{const s=[...a].sort((a,b)=>a-b);return {n:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:s.at(-1)};};
const rows=[];
for(let i=0;i<4;i++){
 const read=async name=>JSON.parse(await fs.readFile(`${root}/${i}-${i%2}/${name}.json`)),[r,g,a]=await Promise.all(['report','gpu','representation'].map(read));
 if(r.errors.length||g.disjoint||!g.supported||g.gpu.length!==240)throw Error('Invalid GPU run '+i);
 const population=a.adapters.flatMap((a,slot)=>a.trees.map(t=>({slot,...t}))).sort((a,b)=>a.slot-b.slot||a.id.localeCompare(b.id));
 rows.push({run:i,models3D:!!(i%2),renderer:g.renderer,camera:a.camera,target:a.target,seed:r.data.seed,population:population.length,populationHash:createHash('sha256').update(JSON.stringify(population)).digest('hex'),gpu:stats(g.gpu),cpuSubmission:stats(g.cpu),presentation:stats(g.intervals),render:g.render,resources:g.memory,standby:a.adapters.map(a=>({rendered:a.stats.standby.rendered,budgetEvictions:a.stats.standby.budgetEvictions,unready:a.unreadyWithinDensity?.length??null,errors:a.stats.errors.concat(a.stats.standby.errors),status:a.status}))});
}
const conditionsMatch=rows.every(r=>r.renderer===rows[0].renderer&&r.seed===rows[0].seed&&JSON.stringify(r.camera)===JSON.stringify(rows[0].camera)&&r.populationHash===rows[0].populationHash);
const replacementComplete=rows.filter(r=>r.models3D).every(r=>r.standby.every(s=>s.unready===0&&s.budgetEvictions===0&&!s.errors.length));
const result={scope:'Normal game camera, medium720p Intel UHD as reported. Same logical population and fade policy. Static paused simulation; CPU is renderer submission. Current old impostor atlases versus approved new 3D LODs: visual assets are not identical. No claim for dynamic streaming.',conditionsMatch,replacementComplete,rows,pairs:[0,2].map(i=>({baseline:i,candidate:i+1,gpuDeltaMs:rows[i+1].gpu.mean-rows[i].gpu.mean,cpuDeltaMs:rows[i+1].cpuSubmission.mean-rows[i].cpuSubmission.mean}))};
await fs.writeFile(root+'/summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(!conditionsMatch||!replacementComplete)process.exitCode=2;
