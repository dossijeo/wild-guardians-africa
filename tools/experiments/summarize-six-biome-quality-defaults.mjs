import fs from 'node:fs';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/six-biome-quality-defaults';
const quantiles=v=>{const a=[...v].sort((a,b)=>a-b);return {samples:a.length,p50:a[Math.floor((a.length-1)*.5)],p95:a[Math.floor((a.length-1)*.95)],p99:a[Math.floor((a.length-1)*.99)],max:a.at(-1)};};
const rows=[];
for(const biome of ['manglares','sabana','gran-rio','desierto','volcanes','gran-canon']){
 const file=root+'/'+biome+'/report.json';if(!fs.existsSync(file)){rows.push({biome,status:'missing-or-running'});continue;}
 const r=JSON.parse(fs.readFileSync(file,'utf8')),q=r.result.qualityCycle;
 rows.push({biome,url:r.url,warningOrErrorCount:r.errors.length,messages:[...new Set(r.errors)],active:q?.active,qualities:q?.rows.map(v=>({quality:v.quality,transitionMs:v.transitionMs,settingMs:v.settingMs,diagnosticMs:v.diagnosticMs,frameIntervals:quantiles(v.frameTimes),programs:v.programs,drawCalls:v.drawCalls,capture:v.capture,cache:v.cacheAfter}))});
}
const report={scope:'Compatibility and live quality-cycle diagnostic. Sparse historical saves, production URL defaults. Not an AB performance comparison, GPU benchmark, new-world layout validation or complete game acceptance. Final gl.getError diagnostics and capture settling influence subsequent work; elapsed transition is not blocked CPU time.',rows};
fs.writeFileSync(root+'/summary.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(rows.map(({messages,qualities,...r})=>({...r,qualities:qualities?.map(({capture,cache,...q})=>q)})),null,2));
