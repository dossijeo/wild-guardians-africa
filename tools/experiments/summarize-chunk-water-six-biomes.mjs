import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/integrated-water-six-biomes';
const rows=[];
for(const biome of ['sabana','gran-rio','desierto','volcanes','gran-canon','manglares']){
 const r=JSON.parse(fs.readFileSync(root+'/'+biome+'/quality/report.json'));
 const a=r.result.qualityCycle.active;
 assert.equal(r.biome,biome);assert.equal(a.travelFrame,240);
 assert.equal(a.advancingFrames,240);assert.equal(a.pausedFrames,0);
 assert.equal(a.stream.failed,0);assert.equal(a.stream.queued,0);
 assert.equal(a.stream.preparing,0);assert.equal(a.stream.busy,false);
 assert.deepEqual(r.result.qualityCycle.rows.map(x=>x.quality),['baja','media','baja']);
 const otherErrors=r.errors.filter(x=>!x.includes('warning X4000'));
 assert.deepEqual(otherErrors,[]);
 rows.push({biome,water:r.result.chunkWaterBed??{calls:0,yields:0},newChunks:a.created,advancingFrames:a.advancingFrames,travelWallMs:a.travelWallMs,postTravelWaitMs:a.postTravelWaitMs,compilerWarnings:r.errors.length});
}
const report={scope:'Historical populated fixtures; active 240-frame camera travel and low/medium/low quality cycle. Functional diagnostic, not controlled performance comparison or current-layout visual acceptance. Compiler warnings retained.',rows};
fs.writeFileSync(root+'/summary.json',JSON.stringify(report,null,2)+String.fromCharCode(10));
console.log(JSON.stringify(report,null,2));
