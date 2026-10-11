// Instrumented CPU prefix, never a full-farm proof or economic campaign.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {centerServicePoint,centerDeliveryPoint} from '../src/world/centers.js';
import {wateringRoute,canWaterFrom} from '../src/world/work-points.js';
import {installTerrainLatticeTiles} from './terrain-lattice-tile-candidate.mjs';
const [input,output,countText='64',variant='native']=process.argv.slice(2),count=Number(countText);
assert(input&&output&&!existsSync(output)&&Number.isSafeInteger(count)&&count>=1&&count<=128&&['native','tiled'].includes(variant));
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString('utf8')),before=serialize(s);
const profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json',nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(profilePath)).profile);nav.setState(s);
const tiles=variant==='tiled'?installTerrainLatticeTiles(nav.field):null;
const centers=new Map(s.structures.filter(c=>c.kind==='center'&&c.status==='intact').map(c=>[c.id,c]));
const living=s.plants.filter(p=>p.alive),rows=[];let pathCalls=0,pathMilliseconds=0;
const path=nav.path.bind(nav);nav.path=(...args)=>{const began=performance.now();try{return path(...args);}finally{pathCalls++;pathMilliseconds+=performance.now()-began;}};
for(const crop of living.slice(0,count)){
 const center=centers.get(crop.centerId);assert(center);
 const start=centerServicePoint(center,s,.8),began=performance.now(),water=wateringRoute({...start,radius:.28},crop,nav),wateringMilliseconds=performance.now()-began;
 if(water)assert(canWaterFrom({...water.destination,radius:.28},crop,nav));
 const returnBegan=performance.now(),delivery=centerDeliveryPoint(center,crop,s,.8),back=water?nav.path(water.destination,delivery,.28,null,true,32):null;
 rows.push({targetId:crop.id,centerId:center.id,wateringRouteFound:!!water,returnRouteFound:!!back,wateringMilliseconds,returnMilliseconds:performance.now()-returnBegan,
  wateringPathPoints:water?.path.length??0,returnPathPoints:back?.length??0,wateringRouteHash:hash(JSON.stringify(water??null)),returnRouteHash:hash(JSON.stringify(back??null))});
}
assert.equal(serialize(s),before);assert.equal(hash(readFileSync(input)),hash(bytes));
const sourceFiles=['tools/profile-native-crop-service-prefix.mjs','tools/terrain-lattice-tile-candidate.mjs','src/world/terrain.js','src/world/navigation.js','src/world/work-points.js','src/world/centers.js',profilePath];
const result={input,inputSha256:hash(bytes),variant,tileCache:tiles?.stats()??null,livingCrops:living.length,requestedPrefix:count,visitedPrefix:rows.length,stateUnchanged:true,pathCalls,pathMilliseconds,
 wateringMilliseconds:rows.reduce((n,r)=>n+r.wateringMilliseconds,0),returnMilliseconds:rows.reduce((n,r)=>n+r.returnMilliseconds,0),rows,
 sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,hash(readFileSync(p))])),
 scope:'Instrumented cold CPU prefix of real retained crops in native array order. State unchanged. No synthetic plants, full-farm proof, economic simulation, task execution or GPU/frame-time claim. Timer/profiler overhead is present and observations are concurrent.'};
tiles?.restore();
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({variant,visitedPrefix:rows.length,pathCalls,wateringMilliseconds:result.wateringMilliseconds,returnMilliseconds:result.returnMilliseconds}));
