import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {nativeIntegratedPerimeterProof} from './native-integrated-perimeter-proof.mjs';
import {nativeWorkerServiceProofV3} from './native-worker-service-proof-v3.mjs';
import {containsPoint,edgeDistance} from '../src/world/footprints.js';
const [directory,output,mode='bounds']=process.argv.slice(2);assert(directory&&output);assert(['bounds','interior'].includes(mode));
assert.equal(JSON.parse(readFileSync(join(directory,'receipt.json'))).status,'stopped-early-calibration');
const bytes=readFileSync(join(directory,'partial-state.json.gz')),state=deserialize(gunzipSync(bytes).toString());
const defense=JSON.parse(readFileSync(join(directory,'partial.json'))).receipts.defense,contour=defense.completed;assert(contour);
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile;
const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
const initialCash=numberOf(state.ledger.balance),initialPlants=state.plants.length,initialElapsed=state.elapsed,rows=[];
function prove(label){
 const plan=Game.quoteWallChain(state,defense.material,contour.points,nav,{smooth:false,snap:false}),before=serialize(state),start=performance.now();
 const proof=nativeIntegratedPerimeterProof(state,nav,plan,contour.bounds,{outline:contour.points,workerServiceProof:nativeWorkerServiceProofV3});
 assert.equal(serialize(state),before,'Read-only certificate must not mutate native state');
 const row={label,milliseconds:performance.now()-start,living:state.plants.filter(p=>p.alive).length,navVersion:nav.version,cash:numberOf(state.ledger.balance),proof};rows.push(row);
 console.log(JSON.stringify({label,milliseconds:row.milliseconds,valid:proof.valid,reason:proof.reason,navVersion:nav.version}));
}
prove('initial-cold');prove('initial-warm');
const placed=[];let attempts=0;
const polygon=contour.points.map(([x,z])=>({x,z}));
outer:for(let z=Math.ceil(contour.bounds[1])+1;z<contour.bounds[3]-1;z+=1.2)for(let x=Math.ceil(contour.bounds[0])+1;x<contour.bounds[2]-1;x+=1.2){
 if(mode==='interior'&&(!containsPoint(polygon,x,z)||polygon.some((p,i)=>edgeDistance(p,polygon[(i+1)%polygon.length],x,z)<4)))continue;
 if(state.plants.some(p=>p.alive&&Math.hypot(p.x-x,p.z-z)<1.1))continue;
 const check=nav.placement(x,z,.4);if(!check.valid)continue;
 attempts++;assert(Game.plant(state,'qa-certificate-seed-'+attempts,'mijo',x,z,nav));
 placed.push({...state.plants.at(-1),suppressed:check.suppress??[]});
 if(placed.length===1||placed.length===5){prove('after-'+placed.length+'-native-plants');prove('repeat-'+placed.length);}
 if(placed.length===5)break outer;
}
assert.equal(placed.length,5,'Five legal native placements required');
assert.equal(state.elapsed,initialElapsed);assert.equal(state.plants.length,initialPlants+5);assert.equal(numberOf(state.ledger.balance),initialCash-25,'Five mijo purchases must debit exactly 25');
const sourceHashes=Object.fromEntries(['src/simulation/game.js','src/world/navigation.js','tools/static-animal-certificate-cache.mjs','tools/native-worker-service-proof-v3.mjs','tools/native-integrated-perimeter-proof.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output,JSON.stringify({scope:'Five real paid native planting commands on a disposable stopped snapshot copy; no ticks, campaign restart, income or worker-throughput claim',mode,toolSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),snapshotSha256:createHash('sha256').update(bytes).digest('hex'),sourceHashes,placed,initialCash,finalCash:numberOf(state.ledger.balance),rows},null,2)+'\n',{flag:'wx'});
