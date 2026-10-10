import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {seedQuote} from '../tools/campaign-cohort-estimate.mjs';
import {projectScarcity} from '../tools/project-seed-scarcity.mjs';
const input=JSON.parse(readFileSync(new URL('../docs/qa/campaign-100-day-mathematical-projection/projection.json',import.meta.url)));
test('scarcity grace, integer rounding, monotonicity and recovery quote',()=>{
 assert.equal(seedQuote(5,0),5);assert.equal(seedQuote(5,100),5);assert.equal(seedQuote(5,101),6);
 assert.equal(seedQuote(5,300),10);assert.equal(seedQuote(150,500),450);
 let previous=0;for(let n=0;n<=2000;n++){const quote=seedQuote(8,n);assert.ok(quote>=previous&&Number.isSafeInteger(quote));previous=quote;}
 assert.ok(seedQuote(8,120)<seedQuote(8,500));assert.throws(()=>seedQuote(5,-1));assert.throws(()=>seedQuote(5,1,{plantsPerStep:0}));
});
test('scarcity projection is paired, reproducible and preserves fixed values',()=>{
 const before=JSON.stringify(input),r=projectScarcity(input);
 assert.equal(JSON.stringify(input),before);assert.equal(input.referenceBalance.work_center.cost,800);
 assert.equal(r.inflated.length,100);assert.ok(r.inflated.every(row=>row.status==='estimate'));
 assert.deepEqual(r.inflated[0],r.baseline[0]); // Starting field remains within grace.
 const saved=JSON.parse(readFileSync(new URL('../docs/qa/seed-scarcity-mathematical-projection/projection.json',import.meta.url)));
 for(const key of ['baseline','inflated','neglect','summary','sensitivity','quoteExamples'])assert.deepEqual(saved[key],r[key]);
 for(const [name,sha] of Object.entries(saved.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../tools/'+name,import.meta.url))).digest('hex'),sha);
 assert.equal(saved.inputSHA256,createHash('sha256').update(readFileSync(new URL('../docs/qa/campaign-100-day-mathematical-projection/projection.json',import.meta.url))).digest('hex'));
});
