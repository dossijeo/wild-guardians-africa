import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';

const wasmPath=process.argv[2]??'src/world/hierarchical-wasm/spatial-savanna.wasm';
const output=process.argv[3];
const bytes=readFileSync(wasmPath);
const module=new WebAssembly.Module(bytes);
const saved=gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/desierto983-d15-partial-state.json.gz',import.meta.url)));
const game=deserialize(saved.toString());
const loaded=new Map();
const session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
});
const measurements=[];
try{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  let start,end;
  for(let z=-10;z<=10&&!end;z++)for(let x=-10;x<=10;x++){
    const from={x:x+.2,z:z+.2},to={x:x+1.2,z:z+.2};
    if(session.routeActor(from,to,{worker:false,species:'hyena'}).status==='found'){
      start=from;end=to;break;
    }
  }
  if(!end)throw Error('Fixture needs a physically valid retreat segment');
  session.actorSectorRevision({worker:false,species:'hyena'});
  const wasm=session.core.wasm;
  for(const count of [10,50,150,300,600]){
    wasm.nav_intent_reset();
    for(let wave=0;wave<4;wave++){
      const pointer=wasm.nav_intent_attack_route_input_ptr(1);
      const route=new Float32Array(wasm.memory.buffer,pointer,2);
      route[0]=end.x;route[1]=end.z;
      const started=performance.now();
      for(let i=0;i<count;i++){
        const result=wasm.nav_intent_restore_retreat(900000+i,
          start.x,start.z,end.x,end.z,1);
        if(result!==1)throw Error(`Restore failed for actor ${i}: ${result}`);
      }
      const acquireMs=performance.now()-started;
      const releaseStarted=performance.now();
      for(let i=0;i<count;i++)if(wasm.nav_intent_attack_cancel(900000+i)!==1)
        throw Error(`Cancel failed for actor ${i}`);
      const releaseMs=performance.now()-releaseStarted;
      wasm.nav_intent_clear_changes();
      measurements.push({count,wave,acquireMs,releaseMs,
        committedBytes:wasm.memory.buffer.byteLength});
    }
  }
  const report={source:{commit:execFileSync('git',['rev-parse','HEAD'],
    {encoding:'utf8'}).trim(),wasmSha256:createHash('sha256').update(bytes).digest('hex'),
    runnerSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
    fixtureSha256:createHash('sha256').update(saved).digest('hex')},
    start,end,measurements,note:'Legal saved route segments; synthetic actors isolate slot churn. Times include native intent bookkeeping and JS-WASM calls, not campaign navigation.'};
  if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({start,end,measurements}));
}finally{session.dispose();}
