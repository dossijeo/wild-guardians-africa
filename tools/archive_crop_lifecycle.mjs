// Archive a terminal recording without rerunning or relaxing its player policy.
import {createReadStream,createWriteStream,existsSync,mkdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {createGzip,createGunzip} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';

const [sourceArgument,outputArgument]=process.argv.slice(2);
assert.ok(sourceArgument&&outputArgument&&process.argv.length===4,'Usage: node tools/archive_crop_lifecycle.mjs SOURCE OUTPUT');
const source=resolve(sourceArgument),output=resolve(outputArgument);
assert.ok(!existsSync(output),'Refusing to overwrite an existing archive');
const status=JSON.parse(readFileSync(resolve(source,'status.json'))),report=JSON.parse(readFileSync(resolve(source,'report.json'))),raw=readFileSync(resolve(source,'state.json')),state=deserialize(raw.toString());
assert.ok(['passed','failed'].includes(status.status),'Recording is not terminal');
assert.equal(serialize(state),raw.toString());
assert.equal(report.provenance.gitHead,status.provenance.gitHead);
assert.equal(report.result,state.result);assert.equal(report.completedNights,state.completedNights);
if(status.status==='passed')assert.equal(report.completedNights,status.days);
else {assert.ok(status.error);assert.deepEqual(readFileSync(resolve(source,'failure-state.json')),raw);}
const summary=summarizeIntensiveFarm({...report,state}); // Ledger, watering and physical-delivery audit.
const recordedSummary=JSON.parse(readFileSync(resolve(source,'summary.json')));
// The older undefended recording predates the optional defense report field.
assert.deepEqual(summary,{...recordedSummary,defense:recordedSummary.defense??null},'Recorded summary changed during independent analysis');
mkdirSync(output,{recursive:true});
for(const name of ['status.json','report.json','summary.json'])copyFileSync(resolve(source,name),resolve(output,name));
async function archive(name){
 const sha=createHash('sha256');let bytes=0;
 const count=new Transform({transform(chunk,encoding,callback){sha.update(chunk);bytes+=chunk.length;callback(null,chunk);}});
 const archive=name+'.gz';await pipeline(createReadStream(resolve(source,name)),count,createGzip({level:9}),createWriteStream(resolve(output,archive)));
 const expected=sha.digest('hex'),check=createHash('sha256');let recovered=0;
 for await(const chunk of createReadStream(resolve(output,archive)).pipe(createGunzip())){check.update(chunk);recovered+=chunk.length;}
 assert.equal(recovered,bytes);assert.equal(check.digest('hex'),expected);
 return {archive,uncompressedBytes:bytes,sha256:expected,losslessRoundTrip:true};
}
const snapshots={state:await archive('state.json'),lifecycle:await archive('lifecycle.json')};
const manifest={source:sourceArgument,loadedHead:report.provenance.gitHead,trackedChanges:report.provenance.trackedChanges,status:status.status,error:status.error??null,result:report.result,completedNights:report.completedNights,requestedNights:status.days,money:report.money,maximumLiving:report.maximumLiving,delivered:report.counts.CrateDelivered,bySpecies:summary.bySpecies,activity:summary.activity,snapshots,scope:'Original terminal campaign, independently audited with current ledger/watering/delivery checks. Lossless streamed archives preserve full lifecycle observations; this does not claim current-head campaign or mobile/render acceptance.'};
writeFileSync(resolve(output,'snapshot.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output:outputArgument,status:manifest.status,completedNights:manifest.completedNights,snapshots}));
