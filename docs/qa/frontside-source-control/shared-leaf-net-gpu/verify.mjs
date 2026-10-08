import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {analysePairedGpu} from './analyzer.mjs';
const base=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',base))),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(readFileSync(new URL('analyzer.mjs',base))),receipt.analyzerSha256);
const reports={};
for(const kind of ['timing','resources']){
 const gz=readFileSync(new URL(kind+'.json.gz',base)),raw=gunzipSync(gz),expected=receipt.artifacts[kind];
 assert.equal(hash(gz),expected.gzipSha256);assert.equal(hash(raw),expected.rawSha256);assert.equal(hash(readFileSync(new URL(kind+'.png',base))),expected.pngSha256);
 const r=reports[kind]=JSON.parse(raw);assert.equal(r.campaign,kind);assert.equal(r.sharedLeafGpuNet,true);assert.equal(r.plantCount,1089);assert.equal(r.growth,1);assert.equal(r.clock,1.75);
 assert.deepEqual(r.resolution,[1280,720]);assert.equal(r.cameraFov,42);assert.deepEqual(r.cameraPosition,[40,35,50]);
 assert.equal(r.cleanup.closed,true);assert.deepEqual(r.cleanup.errors,[]);assert.equal(r.contextLost,true);
 assert.equal(r.campaignConditions.bufferMetadataQueries,kind==='resources');
 assert.deepEqual(r.materialSides.find(m=>m.arm===0).sides,[2]);assert.deepEqual(r.materialSides.find(m=>m.arm===3).sides,[0,0,0]);
 for(const b of r.blocks){assert.ok([0,3].includes(b.arm));assert.equal(b.submissions.calls,b.arm===0?4:8);assert.equal(b.submissions.triangles,b.arm===0?10748433:10741899);
  assert.equal(b.shadowDraws.length,b.arm===0?1:3);for(const draw of b.shadowDraws){assert.equal(draw.arm,b.arm);assert.equal(draw.activeArm,b.arm);assert.equal(draw.instances,1089);assert.equal(draw.depthSide,2);}
 }
}
const timing=reports.timing;assert.equal(timing.blocks.length,12);assert.equal(timing.invalidCollection,undefined);assert.equal(timing.analysisError,undefined);
const analysis=analysePairedGpu(timing.blocks);assert.deepEqual(analysis,timing.analysis);assert.equal(analysis.performanceThresholdsSatisfied,true);
const resources=reports.resources;assert.deepEqual(resources.blocks.map(b=>b.arm),[0,3]);assert.equal(resources.analysis,undefined);
assert.deepEqual(resources.bufferSnapshots.map(s=>s.liveBytes),[0,481082,895410]);assert.equal(resources.bufferAudit.liveBytes,0);assert.equal(resources.bufferAudit.liveBuffers.length,0);
for(const snapshot of resources.bufferSnapshots)assert.equal(snapshot.liveBytes,snapshot.liveBuffers.reduce((sum,b)=>sum+b.bytes,0));
for(const key of ['sourceMapping','archiveSha256','cameraPosition','cameraTarget','contextAttributes','resources','materialSides'])assert.deepEqual(timing[key],resources[key],key);
console.log(JSON.stringify({passed:true,savedMs:analysis.savedMs,savedPercent:analysis.savedPercent,pairedConfidence95:analysis.pairedMeanSavedMsConfidence95,bufferPeak:resources.bufferAudit.peakBytes,finalBuffers:resources.bufferAudit.liveBuffers.length,scope:'Representative net GPU threshold passed; visual/category/integration acceptance remains independent'},null,2));
