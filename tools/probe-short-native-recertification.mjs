import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativeIntegratedPerimeterProof} from './native-integrated-perimeter-proof.mjs';

const [directory,output,mode='candidate']=process.argv.slice(2);
if(!directory||!output)throw Error('Stopped campaign and fresh JSONL output required');
assert(['candidate','baseline'].includes(mode));
let certify=nativeIntegratedPerimeterProof,referenceSourceHashes;
if(mode==='baseline'){
 const data=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
 const frozen=path=>execFileSync('git',['show',`3161e728:${path}`],{encoding:'utf8'});
 const cache=frozen('tools/static-animal-certificate-cache.mjs'),proof=frozen('tools/native-perimeter-reused-candidate-v2.mjs'),integration=frozen('tools/native-integrated-perimeter-proof.mjs');
 const importSource=(code,url,replacements)=>code.replace(/from '([^']+)'/g,(_match,path)=>`from ${JSON.stringify(replacements[path]??new URL(path,url).href)}`);
 const proofUrl=data(importSource(proof,new URL('./native-perimeter-reused-candidate-v2.mjs',import.meta.url),{'./static-animal-certificate-cache.mjs':data(cache)}));
 const integrated=data(importSource(integration,new URL('./native-integrated-perimeter-proof.mjs',import.meta.url),{'./native-perimeter-reused-candidate-v2.mjs':proofUrl}));
 certify=(await import(integrated)).nativeIntegratedPerimeterProof;
 referenceSourceHashes={commit:'3161e728',cache:createHash('sha256').update(cache).digest('hex'),proof:createHash('sha256').update(proof).digest('hex'),integration:createHash('sha256').update(integration).digest('hex')};
}
assert.equal(JSON.parse(readFileSync(join(directory,'receipt.json'))).status,'stopped-early-calibration');
const bytes=readFileSync(join(directory,'partial-state.json.gz')),state=deserialize(gunzipSync(bytes).toString());
const defense=JSON.parse(readFileSync(join(directory,'partial.json'))).receipts.defense,contour=defense.completed;
assert(contour,'A paid completed contour is required');
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile;
const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
const sourceHashes=Object.fromEntries(['src/simulation/game.js','src/world/navigation.js','src/world/building-route-shortcut.js','tools/native-perimeter-reused-candidate-v2.mjs','tools/static-animal-certificate-cache.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output,JSON.stringify({scope:'Five simulated seconds from stopped snapshot, no player commands; not campaign or strategy acceptance',mode,referenceSourceHashes,snapshotSha256:createHash('sha256').update(bytes).digest('hex'),sourceHashes})+'\n',{flag:'wx'});
const started=performance.now(),initialElapsed=state.elapsed;let tickMs=0;
for(let step=0;step<=20;step++){
 if(step){const begin=performance.now();Game.tick(state,.25,nav);tickMs+=performance.now()-begin;}
 if(step%10===0){
  const plan=Game.quoteWallChain(state,defense.material,contour.points,nav,{smooth:false,snap:false}),before=serialize(state),begin=performance.now();
  const proof=certify(state,nav,plan,contour.bounds,{outline:contour.points}),proofMs=performance.now()-begin;
  assert.equal(serialize(state),before,'Certification must not change the advancing native state');
  const row={step,simulatedSeconds:state.elapsed-initialElapsed,day:state.day,time:state.time,living:state.plants.filter(p=>p.alive).length,ledgerEntries:Object.keys(state.ledger.entries).length,version:nav.version,tickMs,proofMs,valid:proof.valid,reason:proof.reason,terrainRequests:proof.terrainTileDiagnostics.requests,retainedCoverage:proof.animalCertificateCoverage??null,stateSha256:createHash('sha256').update(serialize(state)).digest('hex')};
  appendFileSync(output,JSON.stringify(row)+'\n');console.log(JSON.stringify(row));
 }
}
const total={status:'completed-short-native-probe',simulatedSeconds:state.elapsed-initialElapsed,totalWallMs:performance.now()-started,tickMs,result:state.result,scope:'Real native workers/ticks and read-only certification; not restarted 100-night campaign'};
appendFileSync(output,JSON.stringify(total)+'\n');console.log(JSON.stringify(total));
