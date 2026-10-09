import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),read=n=>fs.readFileSync(new URL(n,base)),json=n=>JSON.parse(read(n));
const manifest=json('manifest.json');for(const f of manifest.files){const b=read(f.path);assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}
const report=json('report.json'),records=report.liveGrowthBindings.probe.records;
assert.equal(manifest.sourceHead,'c5f035eed835ea092e1a547e30e0faa0ff1ebed1');assert.equal(records.length,48);
const depth=records.filter(r=>r.drawContext.materialType==='MeshDepthMaterial'),color=records.filter(r=>r.drawContext.materialType==='MeshStandardMaterial');
assert.equal(depth.length,24);assert.equal(color.length,24);assert.equal(depth.filter(r=>r.changedBytes>0).length,17);
for(const r of color){assert.equal(r.changedBytes,0);assert.equal(r.drawContext.renderTargetToken,null);assert.equal(r.drawContext.shadowMapEnabled,true);}
for(const r of depth){assert.equal(r.drawContext.renderTargetToken,1);assert.equal(r.drawContext.shadowMapEnabled,false);assert.equal(r.unusedCapacityChangedBytes,0);assert.equal(r.activeChangedBytes,r.changedBytes);}
for(const step of [0,1,2,3])assert.equal(color.filter(r=>r.label.step===step).length,step%2?9:3);
assert.equal(report.liveGrowthBindings.probe.readBytes,1572864);assert.deepEqual(report.liveGrowthBindings.probe.errors,[]);assert.equal(report.cleanup.closed,true);assert.equal(report.cleanup.contextLost,true);assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup.errors,[]);
console.log('PASS 892 retained: color24 MATCH, depth17 DIFFER/7 MATCH, active lanes only; depth fix and net World GPU pending');
