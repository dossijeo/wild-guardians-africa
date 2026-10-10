import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const directory='docs/qa/raid-exterior-entry-candidate',receipt=JSON.parse(readFileSync(`${directory}/adoption-v3-receipt.json`));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(readFileSync(new URL(import.meta.url))),receipt.auditor.sha256,'auditor source');
for(const [file,hash] of Object.entries(receipt.sourceHashes))assert.equal(sha(readFileSync(file)),hash,`source ${file}`);
for(const [file,fact] of Object.entries(receipt.files)){const bytes=readFileSync(file);assert.equal(bytes.length,fact.bytes,file);assert.equal(sha(bytes),fact.sha256,file);}
const payload=`${directory}/adoption-v3-original`,data=name=>gunzipSync(readFileSync(`${payload}/${name}-state.json.gz`)),initialBytes=data('initial'),finalBytes=data('final'),initial=JSON.parse(initialBytes),final=JSON.parse(finalBytes);
const rows=name=>readFileSync(`${payload}/${name}.tap`,'utf8').split(/\r?\n/).filter(line=>line.startsWith('# {')).map(line=>JSON.parse(line.slice(2)));
const physical=rows('physical')[0];assert.equal(sha(initialBytes),physical.initialStateSHA256);assert.equal(sha(finalBytes),physical.finalStateSHA256);
assert.equal(initial.raid.animals.length,12);assert.equal(final.raid,null);assert.deepEqual(final.ledger,initial.ledger);assert.equal(physical.terminalExits.length,12);assert.equal(new Set(physical.terminalExits.map(a=>a.id)).size,12);
for(const actor of physical.terminalExits){assert.equal(actor.status,'gone');assert.equal(Math.hypot(actor.x-actor.exit.x,actor.z-actor.exit.z),0);const original=initial.raid.animals.find(a=>a.id===actor.id);assert.ok(original);assert.deepEqual(actor.exit,original.exit);}
const count=types=>final.events.filter(e=>types.includes(e.type)).length-initial.events.filter(e=>types.includes(e.type)).length;
assert.equal(initial.raid.animals.reduce((n,a)=>n+a.hitsRemaining,0)-physical.unusedHits,count(['AnimalLogicalHit','AnimalLogicalMiss','WorkerHit','WorkerIncapacitated']));assert.equal(count(['StructureHit']),4);assert.equal(count(['RaidEnded']),1);
const advanced=rows('advanced');assert.equal(advanced[0].mainGraph.builds,0);assert.equal(advanced[0].mainGraph.adoptions,1);assert.equal(advanced[1].mainGraph.builds,1);assert.equal(advanced[1].mainGraph.adoptions,0);assert.equal(receipt.gates.productionReady,false);assert.equal(receipt.gates.coldFallbackResolved,false);
for(const cmd of receipt.commands){const text=readFileSync(`${payload}/${cmd.log}`,'utf8');assert.match(text,new RegExp(`# pass ${cmd.pass}(?:\\r?\\n|$)`));if(cmd.fail)assert.match(text,new RegExp(`# fail ${cmd.fail}(?:\\r?\\n|$)`));}
console.log(JSON.stringify({status:'verified-isolated-candidate',sources:Object.keys(receipt.sourceHashes).length,payloads:Object.keys(receipt.files).length,physicalExits:12,physicalHits:4,unusedHits:physical.unusedHits,preparedGraphBuildsMain:0,coldFallbackGraphBuildsMain:1,productionReady:false}));
