// One fresh-process full proof; isolate the integer-lattice cache only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativePerimeterReusedCandidateV2} from './native-perimeter-reused-candidate-v2.mjs';
import {installTerrainLatticeTiles} from './terrain-lattice-tile-candidate.mjs';
import * as Game from '../src/simulation/game.js';
const [input,contourPath,output,variant='native']=process.argv.slice(2);assert(input&&contourPath&&output&&!existsSync(output)&&['native','tiled'].includes(variant));
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(input),contourBytes=readFileSync(contourPath),report=JSON.parse(contourBytes);
const s=deserialize(gunzipSync(bytes).toString()),before=serialize(s),profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json';
const nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(profilePath)).profile);nav.setState(s);assert.equal(serialize(s),before);
const contour=report.paid?report.attempts[0]:report.rows[5].candidate;
const plan=report.paid?{pieces:[],updates:[],suppressed:[]}:Game.quoteWallChain(s,'zarzas',contour.points,nav,{smooth:false,snap:false});
const tiles=variant==='tiled'?installTerrainLatticeTiles(nav.field):null;
const start=performance.now(),proof=nativePerimeterReusedCandidateV2(s,nav,plan,contour.bounds,{outline:contour.points,cache:false}),milliseconds=performance.now()-start;
const tileStats=tiles?.stats()??null;tiles?.restore();
assert.equal(serialize(s),before);assert.equal(hash(readFileSync(input)),hash(bytes));assert.equal(hash(readFileSync(contourPath)),hash(contourBytes));
const sources=['tools/benchmark-native-reused-perimeter-v2.mjs','tools/native-perimeter-reused-candidate-v2.mjs','tools/native-interior-attack-anchor.mjs','tools/native-worker-service-proof-v2.mjs','tools/native-reused-service-component-proof-v2.mjs','tools/terrain-lattice-tile-candidate.mjs','src/world/terrain.js','src/world/navigation.js','src/world/work-points.js','src/world/centers.js',profilePath];
const result={input,inputSha256:hash(bytes),contourPath,contourSha256:hash(contourBytes),variant,milliseconds,proof,proofSha256:hash(JSON.stringify(proof)),tileStats,stateUnchanged:true,
 living:s.plants.filter(p=>p.alive).length,workers:s.workers.filter(w=>!w.incapacitated&&w.status!=='home').length,
 sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),
 scope:'One fresh-process complete isolated perimeter/worker proof over retained geometry. Integer terrain tile cache only; no state changes or production integration. Concurrent instrumented CPU observations, not controlled hardware, interactive frame time, GPU, total RAM or economic acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({variant,milliseconds,valid:proof.valid,reason:proof.reason,proofSha256:result.proofSha256,living:result.living,tileStats}));
