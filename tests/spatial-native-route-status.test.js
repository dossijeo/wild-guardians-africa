import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const fixtures=[
  ['gran-canon','../docs/qa/hierarchical-navigation/spatial-gran-canon-seed123-day6-capture-capture-state.json'],
  ['sabana','../docs/qa/hierarchical-navigation/spatial-virtual-sabana-14-state.json'],
  ['manglares','./fixtures/manglares-123-d10-raid-state.json.gz'],
  ['desierto','./fixtures/desierto983-d15-partial-state.json.gz'],
];

for(const [biome,path] of fixtures)test(`${biome}: access-only native result matches full physical route`,
  {skip:!module&&'Build and select the experimental WASM first'},()=>{
    const bytes=readFileSync(new URL(path,import.meta.url));
    const game=deserialize((path.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
    const loaded=new Map(),session=createSpatialGameSession(module,game,{
      loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    try{
      assert.equal(typeof session.core.wasm.spatial_world_route_status,'function');
      const points=[...game.villages,...game.workers,...(game.raid?.animals??[]),
        ...game.plants.filter(plant=>plant.alive),
        ...game.structures.filter(piece=>piece.status!=='ruined')]
        .filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.z));
      const chunk=value=>Math.floor((value+24)/48);
      const xs=points.map(point=>chunk(point.x)),zs=points.map(point=>chunk(point.z));
      const x0=Math.min(...xs)-1,x1=Math.max(...xs)+1;
      const z0=Math.min(...zs)-1,z1=Math.max(...zs)+1;
      assert((x1-x0+1)*(z1-z0+1)<=144);
      for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
        if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
        loaded.set(`${x},${z}`,session.core.chunkPayload());
      }
      const origins=[...game.workers.filter(worker=>worker.status!=='home'),
        ...(game.raid?.animals??[]),...game.villages];
      const targets=[...game.plants.filter(plant=>plant.alive),
        ...game.structures.filter(piece=>piece.status!=='ruined')];
      assert(origins.length>0&&targets.length>0);
      let compared=0;
      for(const options of [{worker:true},{worker:false,species:'warthog'}]){
        for(let index=0;index<12;index++){
          const start=origins[index%origins.length];
          const end=targets[(index*37+Math.floor(index/origins.length))%targets.length];
          const full=session.routeActorNative(start,end,options);
          const status=session.routeActorNativeStatus(start,end,options);
          assert.equal(status.status,full.status,
            JSON.stringify({biome,index,options,start:{x:start.x,z:start.z},
              end:{x:end.x,z:end.z}}));
          if(status.status==='unknown')assert.equal(status.reason,full.reason);
          compared++;
        }
      }
      assert.equal(compared,24);
    }finally{session.dispose();}
  });
