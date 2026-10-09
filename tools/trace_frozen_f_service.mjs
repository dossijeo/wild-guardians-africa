// Optional F10 diagnostic runner. Imports frozen producer; never patches it.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createServiceObservation} from './service-observation.mjs';
const [frozenPath,outputPath]=process.argv.slice(2);assert.ok(frozenPath&&outputPath);
const frozen=resolve(frozenPath),out=resolve(outputPath),source='83b1c1eaa0235f9a9b34966f88b496f42eeb161b',sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:frozen,encoding:'utf8'}).trim(),source);
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:frozen,encoding:'utf8'}).trim(),'');
const reference=JSON.parse(readFileSync(resolve(frozen,'.cache/f100/gran-canon-saheliana-report.json')));
for(const [path,expected] of Object.entries(reference.provenance.sourceHashes))assert.equal(sha(readFileSync(resolve(frozen,path))),expected,path);
const moduleURL=path=>pathToFileURL(resolve(frozen,path)).href;
const {simulateIntensiveFarm,auditIntensiveFarm}=await import(moduleURL('tools/check_intensive_farm.mjs'));
const {serialize}=await import(moduleURL('src/persistence/snapshots.js'));
const observation=createServiceObservation(),started=Date.now();mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,'status.json'),JSON.stringify({source,status:'running',pid:process.pid,startedAt:new Date().toISOString(),days:10})+'\n');
try {
const result=simulateIntensiveFarm({biome:'gran-canon',culture:'saheliana',seed:712,days:10,...reference.policy,
 onTick:state=>observation.observe(state),onDecision:row=>observation.decision(row),
 onDay:day=>writeFileSync(resolve(out,'status.json'),JSON.stringify({source,status:'running',pid:process.pid,day:day.day,wallMs:Date.now()-started})+'\n')});
auditIntensiveFarm(result,{victory:false});
assert.deepEqual(result.daily,reference.daily.slice(0,10));assert.deepEqual(result.policy,reference.policy);
assert.equal(result.completedNights,10);assert.equal(result.result,null);
const state=serialize(result.state);assert.equal(sha(state),'5fa1a0bebd54299c4abf45f425bc361c46fba12fc5f8c0864145b7528206920f');
const data=observation.result(),frames=data.frames,decisions=data.decisions;delete data.frames;delete data.decisions;
const payloads={'frames.jsonl.gz':gzipSync(Buffer.from(frames.map(x=>JSON.stringify(x)).join('\n')+'\n')),
 'decisions.jsonl.gz':gzipSync(Buffer.from(decisions.map(x=>JSON.stringify(x)).join('\n')+'\n')),
 'lifecycle.json.gz':gzipSync(Buffer.from(JSON.stringify(data)+'\n'))};
for(const [name,bytes] of Object.entries(payloads))writeFileSync(resolve(out,name),bytes);
const receipt={source,observerFiles:{'service-observation.mjs':sha(readFileSync(new URL('./service-observation.mjs',import.meta.url))),'trace_frozen_f_service.mjs':sha(readFileSync(new URL(import.meta.url)))},
 sourceHashes:reference.provenance.sourceHashes,trackedClean:true,days:10,policy:result.policy,first10NativePrefixExact:true,fullFinalStateParity:true,stateSha256:sha(state),
 rows:{frames:frames.length,decisions:decisions.length,tasks:data.tasks.length},files:Object.fromEntries(Object.entries(payloads).map(([name,bytes])=>[name,sha(bytes)])),
 gates:{noDefeatAnd10Nights:true,physicalLedgerHydration:true,everyDayPaidStaffDelivery:result.daily.every(x=>x.staff>0&&x.delivered>0),idleBelow25:result.activity.unoccupiedFraction<.25},
 activity:result.activity,wallMs:Date.now()-started,scope:'One F10 read-only detailed diagnostic, unchanged policy and entire final snapshot/prefix. Preserves failed early activity; no100/matrix/promotion or performance improvement claim.'};
writeFileSync(resolve(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
writeFileSync(resolve(out,'status.json'),JSON.stringify({source,status:'terminal',pid:process.pid,wallMs:Date.now()-started})+'\n');
console.log(JSON.stringify({source,stateParity:true,first10PrefixExact:true,rows:receipt.rows,gates:receipt.gates,wallMs:receipt.wallMs}));
} catch(error){
 const partial=observation.result();
 writeFileSync(resolve(out,'failure-observation.json.gz'),gzipSync(Buffer.from(JSON.stringify(partial)+'\n')));
 const failure={source,status:'failed',pid:process.pid,wallMs:Date.now()-started,error:{name:error.name,message:error.message},
  partialRows:{frames:partial.frames.length,decisions:partial.decisions.length,tasks:partial.tasks.length},scope:'Failed detailed observer attempt; not accepted, never replaces original F10/F100.'};
 writeFileSync(resolve(out,'status.json'),JSON.stringify(failure,null,2)+'\n');console.error(JSON.stringify(failure));process.exitCode=1;
}
