// Verify archived campaigns against their frozen Git sources; never rerun them.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {deserialize} from '../src/persistence/snapshots.js';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';

const [directory,key]=process.argv.slice(2);
assert.ok(directory&&key,'Usage: node tools/audit_intensive_artifact.mjs DIRECTORY BIOME-CULTURE');
const dir=resolve(directory),read=name=>JSON.parse(readFileSync(join(dir,name),'utf8'));
const report=read(key+'-report.json'),summary=read(key+'-summary.json'),status=read(key+'-status.json'),job=read('job.json');
assert.match(job.sha,/^[a-f0-9]{40}$/);
assert.equal(report.provenance.gitHead,job.sha);
assert.equal(report.provenance.sourceRootIsGitRoot,true);
assert.deepEqual(report.provenance.trackedChanges,[]);
assert.equal(status.status,'passed');assert.equal(status.result,'victory');
const hashes=report.provenance.sourceHashes;
assert.ok(Object.keys(hashes).length>0);
// Read the immutable commit without modifying or extracting any checkout.
const archived=JSON.parse(execFileSync('python',['-c',[
 'import sys,json,subprocess,tarfile,io,hashlib',
 'r=json.load(sys.stdin)',
 'b=subprocess.run(["git","archive","--format=tar",r["sha"],"--",*r["files"]],check=True,stdout=subprocess.PIPE).stdout',
 't=tarfile.open(fileobj=io.BytesIO(b),mode="r:")',
 'print(json.dumps({m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers() if m.isfile()}))'
].join('\n')],{input:JSON.stringify({sha:job.sha,files:Object.keys(hashes)}),encoding:'utf8',maxBuffer:16*1024*1024}));
assert.deepEqual(archived,hashes,'Every recorded source must match the recorded Git commit');
const currentDifferences=Object.entries(hashes).filter(([file,hash])=>!existsSync(file)||createHash('sha256').update(readFileSync(file)).digest('hex')!==hash).map(([file])=>file);
const raw=readFileSync(join(dir,key+'-state.json')),state=deserialize(raw.toString('utf8'));
const computed=summarizeIntensiveFarm({...report,state});
assert.deepEqual(computed,summary,'The complete archived summary must reproduce from the native state');
assert.equal(report.daily.length,100);assert.ok(report.daily.every(d=>d.staff>0&&d.delivered>0));
assert.equal(report.counts.RaidSpawned,report.counts.RaidEnded);
assert.equal(report.counts.CampaignWon,1);assert.equal(report.counts.GameOver??0,0);assert.equal(state.raid,null);
const out={status:'verified',recordedHead:job.sha,frozenSourcesVerified:Object.keys(hashes).length,currentSourceDifferences:currentDifferences,
 result:state.result,completedNights:state.completedNights,day:state.day,money:computed.money,maximumLiving:computed.maximumLiving,speciesObserved:computed.speciesObserved,
 delivered:report.counts.CrateDelivered,raidsEnded:report.counts.RaidEnded,unoccupiedFraction:computed.activity.unoccupiedFraction,activityAcceptance:computed.activity.acceptance,
 cashflow:computed.cashflow,snapshotSha256:createHash('sha256').update(raw).digest('hex'),
 scope:'Complete archived native snapshot, frozen Git source hashes, persistence invariants, physical crop/crate delivery, exact integer ledger and full summary. This is not a replay on current main, rendering QA or physical mobile acceptance. Activity rejection remains visible independently of campaign verification.'};
writeFileSync(join(dir,'root-verification.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
