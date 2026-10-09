// Audit original terminal failures without advancing the simulation or rerunning.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {auditIntensiveFarm} from './check_intensive_farm.mjs';
const [directory,key]=process.argv.slice(2);
assert.ok(directory&&key,'Usage: node tools/audit_failed_intensive_artifact.mjs DIRECTORY BIOME-CULTURE');
const dir=resolve(directory),read=name=>JSON.parse(readFileSync(join(dir,name),'utf8'));
const status=read(key+'-status.json'),job=read('job.json'),provenance=status.provenance;
assert.equal(status.status,'failed');assert.equal(status.failureSnapshot,'validated');assert.match(job.sha,/^[a-f0-9]{40}$/);
assert.equal(provenance.gitHead,job.sha);assert.equal(provenance.sourceRootIsGitRoot,true);assert.deepEqual(provenance.trackedChanges,[]);
const hashes=provenance.sourceHashes;assert.ok(Object.keys(hashes).length>0);
const archived=JSON.parse(execFileSync('python',['-c',[
 'import sys,json,subprocess,tarfile,io,hashlib',
 'r=json.load(sys.stdin)',
 'b=subprocess.run(["git","archive","--format=tar",r["sha"],"--",*r["files"]],check=True,stdout=subprocess.PIPE).stdout',
 't=tarfile.open(fileobj=io.BytesIO(b),mode="r:")',
 'print(json.dumps({m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers() if m.isfile()}))'
].join('\n')],{input:JSON.stringify({sha:job.sha,files:Object.keys(hashes)}),encoding:'utf8',maxBuffer:16*1024*1024}));
assert.deepEqual(archived,hashes,'Every recorded source must match the immutable commit');
const raw=readFileSync(join(dir,key+'-failure-state.json')),state=deserialize(raw.toString('utf8'));
// There is no completed report/summary in these failure artifacts. Derive counts
// for intrinsic state checks only; this is not independent event-count evidence.
const derivedCounts={CrateDelivered:state.crates.filter(c=>c.delivered).length,CropPicked:state.crates.length};
auditIntensiveFarm({state,counts:derivedCounts});assert.equal(serialize(deserialize(serialize(state))),serialize(state));
assert.equal(state.biome,job.biome);assert.equal(state.culture,job.culture);
// Heartbeats are wall-clock throttled and can precede the terminal snapshot by
// many simulated minutes. Preserve that lag rather than treating them as final.
assert.ok(status.live.day<=state.day);assert.ok(status.live.elapsed<=state.elapsed);
assert.ok(status.live.completedNights<=state.completedNights);
assert.equal(state.result,null);assert.ok(state.raid);assert.match(status.error.message,new RegExp(`^Unfinished real incursion on day ${state.day}:`));
const active=state.raid.animals.filter(a=>a.status!=='gone');assert.ok(active.length);
const workerStatuses={};for(const worker of state.workers)workerStatuses[worker.status]=(workerStatuses[worker.status]??0)+1;
const out={status:'failure-evidence-verified',recordedHead:job.sha,frozenSourcesVerified:Object.keys(hashes).length,
 currentSourceDifferences:Object.entries(hashes).filter(([file,hash])=>!existsSync(file)||createHash('sha256').update(readFileSync(file)).digest('hex')!==hash).map(([file])=>file),
 biome:state.biome,culture:state.culture,day:state.day,completedNights:state.completedNights,time:state.time,elapsed:state.elapsed,result:state.result,money:state.ledger.balance.n,
 failure:'native incursion did not finish before the runner\'s 2400 simulated-second daily limit',
 activeAnimals:active.map(a=>({id:a.id,species:a.species,status:a.status,x:a.x,z:a.z,hitsRemaining:a.hitsRemaining,targetId:a.targetId,spawn:a.spawn,exit:a.exit,pathPoints:a.path?.length??null,firstWaypoints:a.path?.slice(0,3)??null})),
 workerStatuses,heartbeat:{day:status.live.day,time:status.live.time,elapsed:status.live.elapsed,lagSimulatedSeconds:state.elapsed-status.live.elapsed,workerStatuses:status.live.workers.statuses},
 derivedCounts,snapshotSha256:createHash('sha256').update(raw).digest('hex'),
 completedReportAvailable:existsSync(join(dir,key+'-report.json')),completedSummaryAvailable:existsSync(join(dir,key+'-summary.json')),
 scope:'Original full failure snapshot, frozen Git source hashes, native persistence/crop/crate and integer ledger invariants. Counts are derived from the snapshot because no final report exists. This is not a replay, victory/activity acceptance or a causal diagnosis of the physical blockage.'};
writeFileSync(join(dir,'root-verification.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
