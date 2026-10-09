import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const dir=dirname(fileURLToPath(import.meta.url));
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
 const r=JSON.parse(readFileSync(join(dir,biome+'-report.json'))),closed=JSON.parse(readFileSync(join(dir,biome+'-cleanup.json'))),logs=JSON.parse(readFileSync(join(dir,biome+'-console.json')));
 assert.equal(r.productionFrontSide,true);assert.equal(r.visualArm,'FrontSide');assert.deepEqual(r.errors,[]);assert.equal(r.context.originalSides.length,20);assert(r.context.originalSides.every(s=>s.side===0&&s.shadowSide===0));
 for(const pass of ['color','shadow']){const rows=r.visualWitness.filter(w=>w.pass===pass);assert(rows.length);assert(rows.every(w=>w.side===0&&w.cull&&w.cullMode===1029&&w.frontFace===2305));}
 assert.equal(closed.disposed,true);assert.equal(closed.contextLost,true);assert(logs.every(l=>l.level!=='error'));console.log(biome,'PASS',r.visualWitness.length,'native Front/BACK/CCW draws');
}
