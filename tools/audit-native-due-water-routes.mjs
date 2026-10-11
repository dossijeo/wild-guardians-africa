// Read-only checkpoint access diagnosis, not worker service or economic replay.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {centerServicePoint} from '../src/world/centers.js';
import {wateringRoute,canWaterFrom} from '../src/world/work-points.js';
const [directory,output]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Terminal campaign directory and fresh output required');
const read=name=>JSON.parse(readFileSync(join(directory,name),'utf8'));
assert(['observed-horizon','observed-native-defeat'].includes(read('receipt.json').status));
const source=read('source.json'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [path,expected] of Object.entries(source.sourceHashes))assert.equal(hash(readFileSync(resolve(path))),expected,'Frozen source changed: '+path);
const snapshot=readFileSync(join(directory,'state.json.gz')),s=deserialize(gunzipSync(snapshot).toString('utf8')),before=serialize(s);
const profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json','utf8')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const rows=[],began=performance.now();
for(const plant of s.plants.filter(p=>p.alive&&p.water.some(w=>w.status==='due'))){
 const center=s.structures.find(c=>c.id===plant.centerId);assert(center);
 const start=centerServicePoint(center,s,.8),route=wateringRoute({...start,radius:.28},plant,nav);
 if(route)assert(canWaterFrom({...route.destination,radius:.28},plant,nav));
 let length=0,previous=start;
 for(const point of route?.path??[]){length+=Math.hypot(point.x-previous.x,point.z-previous.z);previous=point;}
 rows.push({plantId:plant.id,centerId:center.id,dueCheckpoints:plant.water.flatMap((w,i)=>w.status==='due'?[i]:[]),
  growth:plant.growth,start,reachable:!!route,destination:route?.destination??null,pathPoints:route?.path.length??0,pathLengthMeters:route?length:null});
}
assert.equal(serialize(s),before);
const result={status:'verified',directory,snapshotSha256:hash(snapshot),toolSha256:hash(readFileSync(new URL(import.meta.url))),
 fullFrozenSourcesMatch:true,dueWaterPlants:rows.length,reachable:rows.filter(r=>r.reachable).length,unreachable:rows.filter(r=>!r.reachable).length,
 cpuMilliseconds:performance.now()-began,rows,
 scope:'All currently due native watering checkpoints, including later irrigation. Static routes from associated centre service points only. No movement, task changes, magic, water or income applied; not dynamic worker accessibility, service throughput, replayed survival or GPU performance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,dueWaterPlants:result.dueWaterPlants,reachable:result.reachable,unreachable:result.unreachable,cpuMilliseconds:result.cpuMilliseconds}));
