import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',dir))),hash=b=>createHash('sha256').update(b).digest('hex');
for(const piece of m.pieces){const b=gunzipSync(readFileSync(new URL(piece.path,dir)));assert.equal(b.length,piece.rawBytes);assert.equal(hash(b),piece.rawSha256);}
assert.equal(hash(readFileSync(new URL('comparison.png',dir))),m.comparisonSha256);
const read=p=>JSON.parse(gunzipSync(readFileSync(new URL(p,dir))));
const control=read('control.json.gz'),front=read('front.json.gz');assert.equal(control.sourceRepackControl,true);assert.equal(front.closedSubset,true);
assert.equal(front.selectedClosedParts.reduce((n,p)=>n+p.triangles,0),8640);
for(const r of [control,front]){
 assert.equal(r.samples.length,1);const s=r.samples[0];assert.equal(s.clip,'Carry_Crate');assert.equal(s.fraction,.90625);assert.equal(s.alphaIoU,1);assert.equal(s.linearRgbMae,0);assert.equal(s.maxTileMae,0);assert.equal(s.shadowPackedDifference.differentBytes,0);
 assert.deepEqual(s.drawInfo.map(d=>[d.calls,d.triangles]),[[20,65662],[20,65662]]);
 assert.ok(s.unchangedOriginalControls.every(c=>c.differentBytes===0));
}
for(const p of front.selectedClosedParts){const side=front.materialSides.find(s=>s.side===1&&s.mesh===p.mesh);assert.equal(side.colorSide,0);assert.equal(side.shadowSide,2);assert.equal(side.sourceDoubleShaderDefine,true);}
console.log('PASS archive integrity/local screen coherence; NOT model/GPU/category acceptance');
