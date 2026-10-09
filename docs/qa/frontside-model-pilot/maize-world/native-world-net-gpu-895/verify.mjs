import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {analysePairedGpu} from '../../../../../tools/lib/frontside-paired-gpu-analysis.mjs';
const base=new URL('./',import.meta.url),read=n=>fs.readFileSync(new URL(n,base)),json=n=>JSON.parse(read(n));
const manifest=json('manifest.json');for(const f of manifest.files){const b=read(f.path);assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}
const r=json('report.json'),t=r.timing;
assert.equal(r.campaign,'timing');assert.equal(r.qaDepth,'front');assert.equal(r.vfx,'on');assert.equal(r.conditions.bufferReadback,false);assert.equal(r.conditions.bufferMetadataQueries,undefined);assert.equal(r.conditions.gpuTiming,true);assert.equal(r.resourceSnapshots,undefined);assert.equal(r.bufferAudit,undefined);assert.equal(t.invalidCollection,null);assert.equal(t.analysisError,null);assert.equal(t.blocks.length,12);
for(const b of t.blocks){assert.equal(b.gpu.samples.length,300);assert.equal(b.logicalUnchanged,true);assert.equal(b.inputsUnchanged,true);assert.deepEqual(b.inputsBefore,b.inputsAfter);assert.deepEqual(b.inputsBefore,t.blocks[0].inputsBefore);assert.equal(b.submissions.calls,b.arm===0?186:192);assert.equal(b.submissions.triangles,b.arm===0?20397635:20386322);}
assert.deepEqual(analysePairedGpu(t.blocks),t.analysis);assert.equal(t.analysis.performanceThresholdsSatisfied,true);assert.ok(t.analysis.pairs.every(p=>p.savedMs>0));
assert.equal(r.cleanup.closed,true);assert.equal(r.cleanup.contextLost,true);assert.deepEqual(r.cleanup.errors,[]);assert.deepEqual(r.errors,[]);assert.equal(r.visualReview.status,'HUMAN_REVIEW_PENDING');
console.log('PASS immutable895/recomputed3600 queries:10.6773% dense World GPU; no category/all-growth/user approval');
