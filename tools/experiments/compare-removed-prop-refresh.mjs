import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from
  '../../src/world/hierarchical-wasm/spatial-movement-profiles.js';

const [controlPath,candidatePath,reportPath]=process.argv.slice(2);
if(!controlPath||!candidatePath||!reportPath)
  throw Error('Usage: node compare-removed-prop-refresh.mjs <control.wasm> <candidate.wasm> <report.json>');
const binaries=[controlPath,candidatePath].map(path=>readFileSync(path));
const modules=binaries.map(binary=>new WebAssembly.Module(binary));
const hashes=binaries.map(binary=>createHash('sha256').update(binary).digest('hex'));
const biomes=['sabana','desierto','gran-rio','volcanes','manglares','gran-canon'];
const chunks=[[0,0],[1,0],[0,1],[-1,0]];
const profiles=[WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES.hyena,
  ANIMAL_SPATIAL_PROFILES.rhino];
const routePairs=[
  [{x:-19,z:-17},{x:18,z:18}],
  [{x:0,z:0},{x:41,z:2}],
  [{x:20,z:8},{x:34,z:8}],
  [{x:-28,z:13},{x:24,z:13}],
  [{x:8,z:19},{x:28,z:42}],
];
const times=[[],[]];let comparisons=0,changedRecords=0;
for(const biome of biomes){
  const worlds=modules.map(module=>createSpatialWorld(module));
  for(const world of worlds){
    world.generate(712,0,0,biome);
    for(const [cx,cz] of chunks.slice(1))world.addChunk(cx,cz);
    for(const profile of profiles)
      assert(world.buildNavigationProfile(profile.index,profile.radius,profile.worker)>0);
  }
  const visible=world=>chunks.flatMap(([cx,cz])=>{
    world.selectChunk(cx,cz);
    return world.props().map(prop=>({...prop}));
  });
  const originals=visible(worlds[0]);
  assert.deepEqual(visible(worlds[1]),originals);
  const solid=originals.filter(prop=>prop.slot<=3||
    prop.slot>=10&&prop.slot<=12||prop.slot>=18);
  const edge=solid.find(prop=>Math.abs(prop.x-24)<13||Math.abs(prop.z-24)<13);
  const distant=solid.find(prop=>Math.abs(prop.x)>35||Math.abs(prop.z)>35);
  assert(edge&&distant,`${biome}: expected local and cross-chunk solid props`);
  const id=prop=>({group:prop.group,gx:prop.gx,gz:prop.gz});
  const edgeId=id(edge),distantId=id(distant);
  const stages=[[],[edgeId],[edgeId,distantId],[distantId],[],
    [distantId,edgeId],[]];
  changedRecords+=stages.reduce((n,stage)=>n+stage.length,0);
  for(let stage=0;stage<stages.length;stage++){
    // Alternate order so cold graph/JIT effects do not favor one variant.
    const order=stage%2?[1,0]:[0,1];
    for(const variant of order){
      const start=performance.now();
      worlds[variant].restoreRemovedProps(stages[stage]);
      times[variant].push({biome,stage,ms:performance.now()-start});
    }
    assert.deepEqual(visible(worlds[1]),visible(worlds[0]),
      `${biome} stage ${stage}: visual props`);
    assert.deepEqual(worlds[1].snapshot().removedProps,
      worlds[0].snapshot().removedProps,`${biome} stage ${stage}: suppression`);
    for(const profile of profiles){
      for(const world of worlds)world.selectNavigationProfile(profile.index);
      for(let z=-25;z<=70;z+=5)for(let x=-67;x<=70;x+=5){
        const values=worlds.map(world=>({walkable:world.walkable(x,z),
          blocked:world.propBlocked(x,z),edge:world.edge(x,z,x+1,z)}));
        assert.deepEqual(values[1],values[0],
          `${biome} stage ${stage} profile ${profile.index} cell ${x},${z}`);
        comparisons++;
      }
      for(const [start,end] of routePairs){
        const values=worlds.map(world=>({route:world.routeWorldNative(start,end),
          connectivity:world.connectedWorld(start,end)}));
        assert.deepEqual(values[1],values[0],
          `${biome} stage ${stage} profile ${profile.index} route`);
        comparisons++;
      }
    }
  }
}
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.floor(sorted.length/2)];};
const report={status:'exact-match',seed:712,biomes,chunks,profiles,
  controlSha256:hashes[0],candidateSha256:hashes[1],
  stagesPerBiome:7,changedRecords,comparisons,
  restoreMs:{control:times[0],candidate:times[1],
    controlTotal:times[0].reduce((n,row)=>n+row.ms,0),
    candidateTotal:times[1].reduce((n,row)=>n+row.ms,0),
    controlMedian:median(times[0].map(row=>row.ms)),
    candidateMedian:median(times[1].map(row=>row.ms))}};
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,comparisons,
  controlTotalMs:report.restoreMs.controlTotal,
  candidateTotalMs:report.restoreMs.candidateTotal}));
