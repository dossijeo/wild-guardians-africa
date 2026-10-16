import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from
  '../../src/world/hierarchical-wasm/spatial-movement-profiles.js';

const [baselinePath,candidatePath,reportPath]=process.argv.slice(2);
if(!baselinePath||!candidatePath||!reportPath)
  throw Error('Usage: node compare-sector-refresh.mjs <baseline.wasm> <candidate.wasm> <report.json>');
const paths=[baselinePath,candidatePath];
const bytes=paths.map(path=>readFileSync(path));
const modules=bytes.map(binary=>new WebAssembly.Module(binary));
const hashes=bytes.map(binary=>createHash('sha256').update(binary).digest('hex'));
const profiles=[WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES.hyena,
  ANIMAL_SPATIAL_PROFILES.rhino];
const pairs=[
  [{x:-18,z:-18},{x:18,z:18}],
  [{x:-16,z:9},{x:33,z:9}],
  [{x:0,z:0},{x:41,z:2}],
  [{x:12,z:-13},{x:-12,z:17}],
  [{x:37,z:16},{x:-8,z:-9}],
  [{x:7,z:19},{x:30,z:-18}],
];
const barriers=[
  {x:5,z:0,halfX:.8,halfZ:7,yaw:0,passMask:0},
  {x:12,z:7,halfX:7,halfZ:.8,yaw:0,passMask:0},
  {x:22,z:-7,halfX:.8,halfZ:6,yaw:.24,passMask:1},
];
const biomes=['sabana','desierto','gran-rio','volcanes','manglares','gran-canon'];
let queries=0;
for(const biome of biomes){
  const worlds=modules.map(module=>createSpatialWorld(module));
  for(const world of worlds){
    world.generate(712,0,0,biome);
    world.addChunk(1,0);
    for(const profile of profiles)
      assert(world.buildNavigationProfile(profile.index,profile.radius,profile.worker)>0);
  }
  let ids=null;
  for(const stage of ['open','walled','restored']){
    if(stage==='walled')ids=worlds.map(world=>world.applyBarrierChanges([],barriers));
    if(stage==='restored')worlds.forEach((world,index)=>
      world.applyBarrierChanges(ids[index],[]));
    for(const profile of profiles){
      worlds.forEach(world=>world.selectNavigationProfile(profile.index));
      for(const [start,end] of pairs){
        const answers=worlds.map(world=>({
          grid:world.route(start,end),
          physical:world.routeWorldNative(start,end),
          connectivity:world.connectedWorld(start,end),
        }));
        assert.deepEqual(answers[1],answers[0],
          `${biome} ${stage} ${profile.index} (${start.x},${start.z}) to (${end.x},${end.z})`);
        queries++;
      }
    }
  }
}
const report={baselineSha256:hashes[0],candidateSha256:hashes[1],
  biomes,seed:712,profiles:profiles.map(({index,radius,worker})=>({index,radius,worker})),
  stages:['open','walled','restored'],queries,status:'exact-match'};
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report)+'\n');
