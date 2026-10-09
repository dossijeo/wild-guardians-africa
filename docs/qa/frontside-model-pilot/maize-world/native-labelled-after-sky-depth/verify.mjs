import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),read=n=>fs.readFileSync(new URL(n,base)),json=n=>JSON.parse(read(n));
const manifest=json('manifest.json');for(const f of manifest.files){const b=read(f.path);assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}
const after=json('report.json'),before=json('../native-labelled-892/report.json'),a=after.liveGrowthBindings.probe.records,b=before.liveGrowthBindings.probe.records;
assert.equal(a.length,48);assert.equal(b.length,48);assert.equal(b.filter(r=>r.changedBytes>0).length,17);
for(const [i,r]of a.entries()){assert.equal(r.status,'BOUND_GPU_BYTES_MATCH_CPU');assert.equal(r.changedBytes,0);assert.equal(r.activeChangedBytes,0);assert.equal(r.unusedCapacityChangedBytes,0);assert.equal(r.bufferToken,1);assert.deepEqual(r.label,b[i].label);assert.equal(r.count,b[i].count);assert.equal(r.activeByteLength,b[i].activeByteLength);assert.equal(r.drawContext.materialType,b[i].drawContext.materialType);}
for(const type of ['MeshDepthMaterial','MeshStandardMaterial'])assert.equal(a.filter(r=>r.drawContext.materialType===type).length,24);
assert.equal(after.liveGrowthBindings.probe.readBytes,1572864);assert.deepEqual(after.liveGrowthBindings.probe.errors,[]);assert.deepEqual(after.errors,[]);assert.deepEqual(after.cleanup.errors,[]);assert.equal(after.cleanup.closed,true);assert.equal(after.cleanup.contextLost,true);
console.log('PASS 893 matched48/48 vs892 depth17 differences retained; no all-growth/shadow/net-GPU approval');
