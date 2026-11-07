import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {numberOf} from '../src/simulation/money.js';
const base='9124b118',folder='docs/qa/native-closed-defense-policy',receiptFile=folder+'/receipt.json';
const sha=b=>createHash('sha256').update(b).digest('hex'),walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
const runtime=execFileSync('git',['ls-files','src','content/balance','public/content'],{encoding:'utf8'}).trim().split(/\r?\n/);
const additions=['tools/native-closed-defense-policy.mjs','tools/probe-native-closed-defense.mjs','tools/audit_native_closed_defense.mjs','tests/native-closed-defense-policy.test.js'];
if(process.argv.includes('--record')){
 const files=[...runtime,...additions,'tools/native-expanding-defense-policy.mjs','tests/native-expanding-defense-policy.test.js',...walk(folder).filter(p=>p!==receiptFile)];
 const hashes=Object.fromEntries(files.sort().map(p=>{const b=readFileSync(p);return [p,{bytes:b.length,sha256:sha(b)}];}));
 const protectedPaths=[...runtime,'tools/native-expanding-defense-policy.mjs','tests/native-expanding-defense-policy.test.js'];
 const batch=execFileSync('git',['cat-file','--batch'],{input:protectedPaths.map(p=>base+':'+p+'\n').join(''),maxBuffer:50000000});let cursor=0;
 const protectedFiles=Object.fromEntries(protectedPaths.map(p=>{const newline=batch.indexOf(10,cursor),header=batch.subarray(cursor,newline).toString(),size=Number(header.split(' ')[2]);assert.match(header,/^[a-f0-9]+ blob [0-9]+$/);cursor=newline+1;const bytes=batch.subarray(cursor,cursor+size);cursor+=size+1;assert.equal(sha(bytes),hashes[p].sha256,p);return [p,sha(bytes)];}));assert.equal(cursor,batch.length);
 writeFileSync(receiptFile,JSON.stringify({base,scope:'Opt-in QA policy with native legal purchase, fixed-path/contact evidence; not campaign/GPU/production acceptance',files:hashes,protectedFiles},null,2)+'\n');
}
const receipt=JSON.parse(readFileSync(receiptFile));for(const[p,r]of Object.entries(receipt.files)){const b=readFileSync(p);assert.equal(b.length,r.bytes,p);assert.equal(sha(b),r.sha256,p);}for(const[p,hash]of Object.entries(receipt.protectedFiles))assert.equal(sha(readFileSync(p)),hash,p);
const raw=readFileSync(folder+'/policy-tests-final.tap'),tap=raw[0]===255&&raw[1]===254?raw.subarray(2).toString('utf16le'):raw.toString();assert.match(tap,/# pass 9\r?\n/);assert.match(tap,/# fail 0\r?\n/);
const r=JSON.parse(readFileSync(folder+'/physical-final/physical.json')),p=r.physical;
for(const[name,value]of[['initialState','initialSHA'],['paidState','paidSHA'],['finalState','finalSHA']])assert.equal(sha(JSON.stringify(p[name])),p[value]);
assert.deepEqual(p.money,{initial:1500,centre:800,seed:5,wages:30,defense:300,afterDefense:365,final:365});
assert.deepEqual(p.gateChecks,{worker:true,animal:false});assert.equal(p.speciesRoutes.length,5);assert.ok(p.speciesRoutes.every(r=>r.bothEndpointsWalkable&&r.path===null));assert.equal(p.hit.type,'StructureHit');assert.equal(p.finalState.structures.find(w=>w.id===p.hit.targetId).kind,'wall');assert.equal(p.finalState.events.filter(e=>e.type==='CropHit').length,0);
const row=p.receipt.history[0];assert.equal(numberOf(p.paidState.ledger.entries[row.paymentId]),-300);assert.ok(row.ids.every(id=>p.paidState.structures.some(w=>w.id===id&&w.kind==='wall')));assert.equal(p.trace.length,128);assert.ok(p.trace.some(t=>Math.hypot(t.from.x-t.to.x,t.from.z-t.to.z)>0));
assert.equal(r.limit.stateUnchanged,true);assert.equal(r.limit.attempts.length,9);assert.ok(r.limit.attempts.every(a=>a.reason==='native-omissions'));
assert.equal(sha(JSON.stringify(r.expansion.before)),r.expansion.beforeSHA);assert.equal(sha(JSON.stringify(r.expansion.after)),r.expansion.afterSHA);assert.deepEqual(r.expansion.receipt.history[0].attempts.map(a=>a.reason),['native-prop-suppression','native-omissions','complete-legal-slots']);assert.deepEqual(r.expansion.before.plants,r.expansion.after.plants);assert.deepEqual(r.expansion.before.suppressed,r.expansion.after.suppressed);
console.log(JSON.stringify({status:'verified',base:receipt.base,hashedFiles:Object.keys(receipt.files).length,protectedFiles:Object.keys(receipt.protectedFiles).length,tests:9,paths:5,actualWallHits:1,canyonClosed:false,scope:receipt.scope}));
