// Native incremental player-policy functional test, not economic calibration.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {createNativeFundedDefensePolicy} from './native-funded-defense-policy.mjs';
import {nativeIntegratedPerimeterProof} from './native-integrated-perimeter-proof.mjs';
import {numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
const [input,output]=process.argv.slice(2),snapshotPath=output?.replace(/\.json$/,'-state.json.gz');
assert(input&&output?.endsWith('.json')&&!existsSync(output)&&!existsSync(snapshotPath));
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString());
const profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json',nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(profilePath)).profile);nav.setState(s);
assert.equal(s.time,0);assert.equal(s.day,1);assert.equal(s.pauses.length,0);assert.equal(s.plants.filter(p=>p.alive).length,8);assert.equal(s.structures.filter(p=>p.kind==='wall').length,0);
const opening=numberOf(s.ledger.balance),initialIds=new Set(Object.keys(s.ledger.entries));
const parameters={startDay:1,material:'zarzas',interval:5,chunkPieces:8,obstacleAware:true,shoreRouting:true,repairPolicy:'breach-first',funding:'contour'};
const policy=createNativeFundedDefensePolicy(parameters),decisions=[],began=performance.now();let sequence=0;
for(let i=0;i<16&&!s.result&&!s.pauses.length;i++){
 const time=s.time,cash=numberOf(s.ledger.balance),started=performance.now();
 const actions=policy.act(s,nav,{command:kind=>'small-funded-'+kind+'-'+sequence++,reserve:30});
 const report=policy.report();decisions.push({iteration:i,time,opening:cash,closing:numberOf(s.ledger.balance),actions,cpuMilliseconds:performance.now()-started,lastHistory:report.history.at(-1)??null});
 if(report.completed)break;
 Game.tick(s,5,nav);await new Promise(resolve=>setImmediate(resolve));
}
const policyReport=policy.report(),completed=policyReport.completed;
const candidate=completed??policyReport.planned;
const actualProof=candidate?nativeIntegratedPerimeterProof(s,nav,{pieces:[],updates:[],suppressed:[]},candidate.bounds,{outline:candidate.points,cache:false}):null;
const entries=Object.entries(s.ledger.entries).filter(([id])=>!initialIds.has(id)).map(([id,value])=>({id,coins:numberOf(value)})),closing=numberOf(s.ledger.balance);
assert.equal(opening+entries.reduce((n,e)=>n+e.coins,0),closing);
assert.equal(entries.filter(e=>e.id.startsWith('small-funded-wall-')).reduce((n,e)=>n-e.coins,0),policyReport.paidCost);
assert.equal(hash(readFileSync(input)),hash(bytes));const saved=serialize(s);assert.equal(serialize(deserialize(saved)),saved);
const paths=['tools/probe-native-funded-canyon-small.mjs','tools/native-funded-defense-policy.mjs','tools/native-integrated-perimeter-proof.mjs','tools/native-perimeter-reused-candidate-v2.mjs','tools/native-reused-service-component-proof-v2.mjs','tools/native-interior-attack-anchor.mjs','tools/native-worker-service-proof-v2.mjs','tools/terrain-lattice-tile-candidate.mjs','src/simulation/game.js','src/world/navigation.js',profilePath];
const result={status:actualProof?.valid?'observed-incremental-paid-native-contour':'no-certified-incremental-contour',input,inputSha256:hash(bytes),snapshotPath,parameters,opening,closing,entries,reconciliationDifference:0,decisions,policy:policyReport,actualProof,
 living:s.plants.filter(p=>p.alive).length,wallPieces:s.structures.filter(p=>p.kind==='wall').length,gates:s.structures.filter(p=>p.kind==='wall'&&p.gate).length,time:s.time,totalCpuObservationMilliseconds:performance.now()-began,
 sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),
 scope:'Actual native eight-crop opening snapshot, funded policy decisions and incremental purchases, five-second native worker advances, maximum 16 functional decisions. No money grants or geometry edits. Early fixture horizon is not a farming quota or balance campaign. No night attack, manual human activity or performance acceptance.'};
writeFileSync(snapshotPath,gzipSync(Buffer.from(saved)));writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,opening,closing,paidCost:policyReport.paidCost,wallPieces:result.wallPieces,gates:result.gates,time:s.time,decisions:decisions.length,totalCpuObservationMilliseconds:result.totalCpuObservationMilliseconds}));
