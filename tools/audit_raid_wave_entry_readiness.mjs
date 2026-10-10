import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const directory='docs/qa/raid-wave-entry-readiness',receiptPath=directory+'/receipt.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const walk=path=>readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path+'/'+e.name):[path+'/'+e.name]);
const sourceFiles=[...['src','content','public/content','tools'].flatMap(walk),'package.json','tests/raid-wave-entry-readiness.test.js','tests/raid-entry-preparer.test.js','tests/raid-entry-residency.test.js'];
const protectedFiles=['src/simulation/raids.js','src/simulation/game.js','src/persistence/snapshots.js'];
function record(){
 const files=[...sourceFiles,...walk(directory).filter(p=>p!==receiptPath),'docs/qa/paid-enclosure-entry-risk/native-original/paid-enclosure-entry-04.json'];
 const manifest=Object.fromEntries([...new Set(files)].sort().map(p=>{const bytes=readFileSync(p);return [p,{bytes:bytes.length,sha256:sha(bytes)}];}));
 const protectedHashes=Object.fromEntries(protectedFiles.map(p=>{const base=execFileSync('git',['show','0f4cccfb:'+p]);assert.equal(sha(readFileSync(p)),sha(base),p);return [p,sha(base)];}));
 const receipt={base:'0f4cccfb',sourceCount:sourceFiles.length,files:manifest,protectedHashes,tests:[{file:directory+'/wave-tests-final-18.tap',pass:18},{file:directory+'/preparer-tests.tap',pass:15},{file:directory+'/residency-tests.tap',pass:5}],scope:'Read-only wave readiness and real compute, no spawning, lifecycle integration, clock, campaign or renderer acceptance'};
 writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
}
if(process.argv.includes('--record'))record();
const receipt=JSON.parse(readFileSync(receiptPath));
for(const [p,r] of Object.entries(receipt.files)){const bytes=readFileSync(p);assert.equal(bytes.length,r.bytes,p);assert.equal(sha(bytes),r.sha256,p);}
for(const [p,hash] of Object.entries(receipt.protectedHashes)){assert.equal(sha(execFileSync('git',['show',receipt.base+':'+p])),hash,p);assert.equal(sha(readFileSync(p)),hash,p);}
for(const t of receipt.tests){const bytes=readFileSync(t.file);const tap=bytes[0]===0xff&&bytes[1]===0xfe?bytes.subarray(2).toString('utf16le'):bytes.toString('utf8');assert.match(tap,new RegExp('# pass '+t.pass+'(?:\\r?\\n|$)'));assert.match(tap,/# fail 0(?:\r?\n|$)/);}
console.log(JSON.stringify({status:'verified',base:receipt.base,sourceCount:receipt.sourceCount,hashedFiles:Object.keys(receipt.files).length,tests:receipt.tests.map(t=>t.pass),protectedFiles:protectedFiles.length,scope:receipt.scope}));
