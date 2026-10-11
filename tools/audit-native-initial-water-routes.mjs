// Static, read-only connectivity diagnosis; does not simulate worker service.
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
const receipt=JSON.parse(readFileSync(join(directory,'receipt.json'),'utf8'));
assert(['observed-horizon','observed-native-defeat'].includes(receipt.status));
const source=JSON.parse(readFileSync(join(directory,'source.json'),'utf8'));
for(const [path,expected] of Object.entries(source.sourceHashes)){
 assert.equal(createHash('sha256').update(readFileSync(resolve(path))).digest('hex'),expected,'Frozen source changed: '+path);
}
const snapshot=readFileSync(join(directory,'state.json.gz'));
const s=deserialize(gunzipSync(snapshot).toString('utf8')),before=serialize(s);
const profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json','utf8')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const pending=s.plants.filter(p=>p.alive&&p.water[0].status==='due'),rows=[];
const began=performance.now();
for(const plant of pending){
 const center=s.structures.find(c=>c.id===plant.centerId);assert(center,'Missing associated center');
 const start=centerServicePoint(center,s,.8),route=wateringRoute({...start,radius:.28},plant,nav);
 if(route)assert(canWaterFrom({...route.destination,radius:.28},plant,nav),'Route ends outside actual watering reach');
 let length=0,previous=start;
 for(const point of route?.path??[]){length+=Math.hypot(point.x-previous.x,point.z-previous.z);previous=point;}
 rows.push({plantId:plant.id,centerId:center.id,start,reachable:!!route,destination:route?.destination??null,pathPoints:route?.path.length??0,pathLengthMeters:route?length:null});
}
assert.equal(serialize(s),before,'Navigation audit must not change simulation state');
const result={status:'verified',directory,snapshotSha256:createHash('sha256').update(snapshot).digest('hex'),
 toolSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
 fullFrozenSourcesMatch:true,firstWaterPending:pending.length,reachable:rows.filter(r=>r.reachable).length,
 unreachable:rows.filter(r=>!r.reachable).length,cpuMilliseconds:performance.now()-began,rows,
 scope:'Static native watering routes from each associated center service point. No hires, movement, task changes, water or income applied. Does not prove dynamic accessibility from all worker positions, throughput, simulation outcome, GPU performance or human activity.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,pending:result.firstWaterPending,reachable:result.reachable,unreachable:result.unreachable,cpuMilliseconds:result.cpuMilliseconds}));
