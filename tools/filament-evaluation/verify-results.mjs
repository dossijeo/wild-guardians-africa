import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const roots=['docs/qa/filament-evaluation/results-native','docs/qa/filament-evaluation/results-expanded'];
let blocks=0,callbacks=0,gpuSamples=0,accepted=0;const indexes=[];
for(const root of roots){const bytes=await readFile(`${root}/index.json`);indexes.push({root,sha256:createHash('sha256').update(bytes).digest('hex')});const index=JSON.parse(bytes);for(const item of index.records){
 const name=`${item.scenario}-${item.density}-${item.backend}-${item.run}-${item.night}`;
 const row=JSON.parse(await readFile(`${root}/${name}.json`,'utf8'));
 assert.equal(row.errors.length,0,name);assert.equal(row.interactive.length,300,name);assert.equal(row.timed.length,60,name);
 assert.ok(row.timed.every(x=>Number.isFinite(x.gpuMs)&&x.gpuMs>0),name);
 const rendered=row.interactive.filter(x=>x.accepted);assert.equal(rendered.length,row.summary.acceptedFrames,name);
 assert.ok(rendered.every(x=>x.drawCalls>0&&x.triangles>0),name);
 if(row.backend==='filament')assert.ok(row.interactive.every(x=>x.accepted===(x.submits>0)&&x.triangleCountIsExact),name);
 if(row.scenario==='C')assert.ok(rendered.every(x=>x.triangles===row.metadata.triangles&&x.drawCalls===2),name);
 assert.ok(Math.abs(row.summary.fps-1000*rendered.length/row.interactive.reduce((n,x)=>n+x.interval,0))<1e-6,name);
 const png=await readFile(`${root}/${name}.png`);assert.equal(png.readUInt32BE(16),1280,name);assert.equal(png.readUInt32BE(20),720,name);
 blocks++;callbacks+=row.interactive.length;gpuSamples+=row.timed.length;accepted+=rendered.length;
}}
assert.equal(blocks,48);assert.equal(callbacks,14400);assert.equal(gpuSamples,2880);
for(const scenario of ['A','B','C'])for(const backend of ['three','filament']){const control=JSON.parse(await readFile(`docs/qa/filament-evaluation/resource-controls/${scenario}-${backend}.json`,'utf8'));assert.equal(control.raw.errors.length+control.resources.errors.length+control.cleanup.errors.length,0);}
const report={verified:new Date().toISOString(),blocks,callbacks,gpuSamples,accepted,errors:0,indexes};
await writeFile('docs/qa/filament-evaluation/VALIDATION.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
