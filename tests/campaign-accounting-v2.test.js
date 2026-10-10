import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {countWithCarry,projectAffordable} from '../tools/campaign-accounting-v2.mjs';
import {conditionalDraft} from '../tools/screen-campaign-accounting.mjs';
const input=JSON.parse(readFileSync(new URL('../docs/qa/campaign-100-day-mathematical-projection/projection.json',import.meta.url)));
test('fractional maturity eventually produces a harvest and cannot duplicate exhausted stock',()=>{
 let carry=0,total=0;
 for(let i=0;i<10;i++){const r=countWithCarry(.4,carry,1);carry=r.carry;total+=r.count;}
 assert.ok(total>=3);assert.deepEqual(countWithCarry(4,.5,1),{count:1,carry:0});
 assert.deepEqual(countWithCarry(0,.5,0),{count:0,carry:0});
 assert.throws(()=>countWithCarry(-1,0,1));
});
test('reduced receipts still pay affordable staff rather than treating desired staffing as mandatory',()=>{
 const B=structuredClone(input.referenceBalance);for(const c of B.crops)c.base_harvest_value=Math.ceil(c.base_harvest_value*.475);
 const rows=projectAffordable(B,input.calibration,{arm:'neglect'});
 let cash=700,plants=1;
 for(const r of rows.filter(r=>r.status==='proyección')){
  assert.ok(r.wages<=cash);assert.equal(r.wages,r.staff*30);
  assert.equal(r.cash,cash+r.income-r.wages-r.seeds-r.wallCost-r.repairs);
  assert.equal(r.plants,plants+r.planted-r.harvested-r.killed);assert.ok(r.cash>=0&&r.plants>=0);
  cash=r.cash;plants=r.plants;
 }
 assert.equal(rows.length,100); // A lower desired crew is not an automatic loss.
});
test('independent pressure weights change danger without changing fixed capital or crop prices',()=>{
 const B=structuredClone(input.referenceBalance);for(const c of B.crops)c.base_harvest_value=Math.ceil(c.base_harvest_value*.475);
 B.walls.find(w=>w.id==='zarzas').cost=3;const original=JSON.stringify(B);
 const weights=Object.fromEntries(input.referenceBalance.crops.map(c=>[c.id,c.base_harvest_value]));
 const good=projectAffordable(B,input.calibration,{pressurePrices:weights}),bad=projectAffordable(B,input.calibration,{arm:'neglect',pressurePrices:weights});
 assert.equal(good.length,100);assert.ok(bad.length<100);
 assert.ok(bad.at(-1).cash<30);assert.match(bad.at(-1).status,/no prueba de derrota nativa/);
 assert.equal(JSON.stringify(B),original);assert.equal(B.work_center.cost,800);
});
test('published screen identifies both pressure laws and matches frozen source hashes',()=>{
 const r=JSON.parse(readFileSync(new URL('../docs/qa/campaign-accounting-mathematical-screen/screen.json',import.meta.url)));
 assert.equal(r.rows.length,72);assert.equal(new Set(r.rows.map(row=>row.pressureMode)).size,2);
 for(const [name,hash] of Object.entries(r.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../tools/'+name,import.meta.url))).digest('hex'),hash);
 const md=readFileSync(new URL('../docs/qa/campaign-accounting-mathematical-screen/screen.md',import.meta.url),'utf8');
 assert.equal(md.split('\n').filter(l=>l.startsWith('| precio actual |')).length,36);
 assert.equal(md.split('\n').filter(l=>l.startsWith('| puntos originales |')).length,36);
});
test('draft tables cover 100 days per arm while leaving unsupported post-stop days empty',()=>{
 const before=JSON.stringify(input),computed=conditionalDraft(input);
 const retained=JSON.parse(readFileSync(new URL('../docs/qa/campaign-accounting-mathematical-screen/conditional-draft.json',import.meta.url)));
 assert.deepEqual(retained.responsible,computed.responsible);assert.deepEqual(retained.neglect,computed.neglect);
 assert.equal(JSON.stringify(input),before);
 const md=readFileSync(new URL('../docs/qa/campaign-accounting-mathematical-screen/conditional-draft.md',import.meta.url),'utf8');
 assert.equal(md.split('\n').filter(l=>/^\| \d+ \|/.test(l)).length,200);
 assert.ok(md.includes('| 57 | — | — | — | — | — | — |'));
});
