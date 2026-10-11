import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativePerimeterProof} from './native-perimeter-proof.mjs';
import {nativeIntegratedPerimeterProof} from './native-integrated-perimeter-proof.mjs';
import {installTerrainLatticeTiles} from './terrain-lattice-tile-candidate.mjs';

const [mode,directory,output]=process.argv.slice(2);
if(!['baseline','candidate','candidate-terrain-memo','baseline-tiled'].includes(mode)||!directory||!output)throw Error('baseline|candidate|candidate-terrain-memo|baseline-tiled STOPPED_DIR FRESH_OUTPUT required');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(JSON.parse(readFileSync(join(directory,'receipt.json'))).status,'stopped-early-calibration');
const source=JSON.parse(readFileSync(join(directory,'source.json'))),sourceDifferences=[];
for(const [path,expected] of Object.entries(source.sourceHashes)){const actual=sha(readFileSync(resolve(path)));if(actual!==expected)sourceDifferences.push({path,expected,actual});}
const bytes=readFileSync(join(directory,'partial-state.json.gz')),state=deserialize(gunzipSync(bytes).toString());
const partial=JSON.parse(readFileSync(join(directory,'partial.json'))),defense=partial.receipts.defense,contour=defense.completed??defense.planned;
assert(contour,'Missing retained contour');
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile;
const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);const before=serialize(state);
const plan=Game.quoteWallChain(state,defense.material,contour.points,nav,{smooth:false,snap:false});
assert.equal(plan.pieces.length,0);assert.equal(plan.updates.length,0);
const run=mode.startsWith('candidate')?nativeIntegratedPerimeterProof:nativePerimeterProof,runs=[];
for(const temperature of ['cold','warm']){
 console.log(JSON.stringify({status:'query-started',mode,temperature,day:state.day,time:state.time,plants:state.plants.filter(p=>p.alive).length}));
 const start=performance.now(),tiles=mode==='baseline-tiled'?installTerrainLatticeTiles(nav.field):null;let proof,tileDiagnostics;
 try{proof=run(state,nav,plan,contour.bounds,{outline:contour.points,terrainMemo:mode==='candidate-terrain-memo'});tileDiagnostics=tiles?.stats();}finally{tiles?.restore();}
 const milliseconds=performance.now()-start;
 assert.equal(serialize(state),before,'Read-only certificate must not mutate snapshot');
 runs.push({temperature,milliseconds,proof,...(tileDiagnostics?{tileDiagnostics}:{})});console.log(JSON.stringify({status:'query-finished',mode,temperature,milliseconds,valid:proof.valid,reason:proof.reason}));
}
const probeSourceHashes=Object.fromEntries(['tools/native-perimeter-proof.mjs','tools/native-integrated-perimeter-proof.mjs','tools/native-perimeter-reused-candidate-v2.mjs','tools/static-animal-certificate-cache.mjs','tools/native-reused-service-component-proof-v2.mjs','tools/native-worker-service-proof-v2.mjs','tools/terrain-lattice-tile-candidate.mjs','tools/terrain-validity-memo-candidate.mjs','src/world/building-route-shortcut.js'].map(path=>[path,sha(readFileSync(path))]));
const report={scope:'Two read-only contour certifications on one stopped native snapshot; not campaign completion, GPU, or statistical ABBA',mode,snapshotSha256:sha(bytes),sourceDifferences,probeSourceHashes,day:state.day,time:state.time,plants:state.plants.filter(p=>p.alive).length,stateUnchanged:true,runs,toolSha256:sha(readFileSync(new URL(import.meta.url)))};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
