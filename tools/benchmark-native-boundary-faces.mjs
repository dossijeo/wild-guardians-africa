// AB/BA CPU-only graph comparison on geometry derived from retained snapshots.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {boundaryFaces} from '../src/world/boundary-faces.js';
import {boundaryFaces as original} from '../tests/fixtures/boundary-faces-reference.js';
import {boundaryEdges} from '../src/world/boundary-gates.js';
import {wallLayout,WALL_UNIT} from '../src/world/wall-layout.js';
import {BALANCE} from '../src/simulation/balance.js';
import * as Game from '../src/simulation/game.js';

const [directory,output]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Stopped snapshot and fresh output required');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=JSON.parse(readFileSync(join(directory,'source.json'),'utf8')),differences=[];
for(const [path,expected] of Object.entries(source.sourceHashes)){
 const actual=hash(readFileSync(resolve(path)));if(actual!==expected){assert.equal(path,'src/world/boundary-faces.js');differences.push({path,expected,actual});}
}
assert.equal(hash(readFileSync('tests/fixtures/boundary-faces-reference.js')),source.sourceHashes['src/world/boundary-faces.js'],'Baseline must match retained implementation bytes');
const bytes=readFileSync(join(directory,'partial-state.json.gz')),s=deserialize(gunzipSync(bytes).toString('utf8')),before=serialize(s);
const partial=JSON.parse(readFileSync(join(directory,'partial.json'),'utf8'));
const profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json','utf8')).profile,nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const plan=Game.quoteWallChain(s,partial.receipts.defense.material,partial.receipts.defense.planned.points,nav,{smooth:false,snap:false});
const layout=wallLayout([...s.structures,...plan.pieces],Object.fromEntries(BALANCE.walls.map(w=>[w.id,w.hp])));
const edges=boundaryEdges(layout,nav),virtual=edges.map(([a,b],i)=>({id:-i-1,kind:'boundary',material:'',hp:1,maxHp:1,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/WALL_UNIT}));
const pieces=[...layout.pieces,...virtual],input=JSON.stringify(pieces),expected=original(pieces);
assert.deepEqual(boundaryFaces(pieces),expected);assert.equal(serialize(s),before);
const samples=[];
// Warm both functions, then alternate AB and BA without changing inputs.
for(let i=0;i<3;i++){original(pieces);boundaryFaces(pieces);}
for(let i=0;i<12;i++){
 const row={order:i%2?'BA':'AB'};
 for(const variant of i%2?['candidate','baseline']:['baseline','candidate']){
  const start=performance.now(),faces=(variant==='baseline'?original:boundaryFaces)(pieces);row[variant]=performance.now()-start;
  assert.deepEqual(faces,expected);
 }
 samples.push(row);
}
assert.equal(JSON.stringify(pieces),input);assert.equal(serialize(s),before);
const median=key=>{const a=samples.map(x=>x[key]).sort((a,b)=>a-b);return (a[5]+a[6])/2;};
const result={status:'verified-graph-equivalence',directory,snapshotSha256:hash(bytes),toolSha256:hash(readFileSync(new URL(import.meta.url))),sourceDifferences:differences,
 pieces:pieces.length,physicalWalls:layout.pieces.length,virtualEdges:virtual.length,faces:expected.length,inputSha256:hash(input),samples,
 medianMilliseconds:{baseline:median('baseline'),candidate:median('candidate')},
 scope:'Exact face outputs/order on fixed augmented geometry derived from a native quote; twelve warmed AB/BA CPU pairs. Does not measure complete quotes, simulation throughput, rendering/GPU or total campaign improvement. No campaign state changed.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,samples:undefined}));
