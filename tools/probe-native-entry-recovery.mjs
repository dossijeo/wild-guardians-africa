// Replays only the retained native incursion, without strategy or funding changes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {NativeCampaignEntryDriver} from './native-campaign-entry-driver.mjs';
import {createNativeRaidCampaignEvidence} from './native-raid-campaign-evidence.mjs';
const [inputFile,output]=process.argv.slice(2);
if(!inputFile||!output||existsSync(output))throw Error('Requires retained entry diagnostic and fresh output');
const input=JSON.parse(readFileSync(inputFile)),raw=readFileSync(input.input);
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(raw),input.inputSha256);
const sourceFiles=['src/simulation/raid-exterior-entry.js','src/simulation/raid-exterior-detour.js','src/simulation/raid-exterior-connectivity.js','src/simulation/raids.js','src/simulation/game.js','src/world/navigation.js','src/world/compute-raid-entry.js','tools/probe-native-entry-recovery.mjs'];
const sourceHashes=Object.fromEntries(sourceFiles.map(p=>[p,sha(readFileSync(p))]));
const sourceHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const s=deserialize(gunzipSync(raw).toString()),before={day:s.day,time:s.time,elapsed:s.elapsed,rng:s.rng,plants:s.plants.filter(p=>p.alive).length};
const nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[s.biome]}.json`)).profile);
nav.setState(s);nav.setActiveBounds(input.bounds);nav.setRaidView(input.view.eye,input.view.target);
const observer=createNativeRaidCampaignEvidence(s),driver=new NativeCampaignEntryDriver(nav),began=performance.now();
let spawned=null,completed=false;
try{
 await driver.waitForEntry(s);const readyMilliseconds=performance.now()-began;
 Game.tick(s,.1,nav);observer.observe(s);assert(s.raid,'Native tick must spawn prepared raid');
 assert.deepEqual(s.raid.animals.map(a=>a.species),s.nightPlan.group);
 spawned=s.raid.animals.map(a=>({id:a.id,species:a.species,spawn:{...a.spawn},exit:{...a.exit},hitsRemaining:a.hitsRemaining}));
 console.log(JSON.stringify({stage:'whole-group-spawn',actors:spawned.length,readyMilliseconds}));
 for(let i=0;i<18000&&s.raid&&!s.result;i++){
  Game.tick(s,.1,nav);observer.observe(s);
  if(Game.nightEntryPending(s))await driver.waitForEntry(s);
  if(i%100===0)await driver.advancePresentation(s);
 }
 completed=!s.raid;const evidence=observer.report(s);
 assert.equal(sha(readFileSync(input.input)),input.inputSha256);
 for(const p of sourceFiles)assert.equal(sha(readFileSync(p)),sourceHashes[p],'Source changed during replay');
 writeFileSync(output,JSON.stringify({input:input.input,inputSha256:input.inputSha256,sourceHead,sourceHashes,before,readyMilliseconds,totalMilliseconds:performance.now()-began,
  completed,nativeResult:s.result,after:{day:s.day,time:s.time,elapsed:s.elapsed,plants:s.plants.filter(p=>p.alive).length},spawned,evidence,entryTransport:driver.report(),
  scope:'Retained night replay through real preparation worker and native ticks only. No policy, magic, money, crop or attack overrides. A 1800 simulated-second observation limit is not a defeat.'},null,2)+'\n');
 assert(completed,'Native incursion did not finish within retained replay observation');assert.equal(evidence.status,'verified');
 console.log(JSON.stringify({stage:'raid-ended',completed,afterDay:s.day,cropsDestroyed:evidence.raids[0]?.cropsDestroyed,wallHits:evidence.raids[0]?.wallHits}));
}finally{await driver.dispose();}
