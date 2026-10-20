import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {actorSegmentClear} from '../src/simulation/actor-motion.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';

const binary=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const frozen=gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString();

test('a native mobile detour avoids a body without changing confirmed navigation',()=>{
  const state=deserialize(frozen),loaded=new Map();
  const session=createSpatialGameSession(binary,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    let selected=null;
    for(let z=-16;z<=16&&!selected;z++)for(let x=-16;x<=12&&!selected;x++){
      const start={x,z},end={x:x+4,z},body={x:x+2,z,radius:.28};
      if(!nav.segmentClear(start,end,.28,null,true))continue;
      for(const side of [-1,1]){
        const a={x,z:z+side*2},b={x:x+4,z:z+side*2};
        if(!nav.segmentClear(start,a,.28,null,true)||
           !nav.segmentClear(a,b,.28,null,true)||
           !nav.segmentClear(b,end,.28,null,true))continue;
        selected={start,end,body};break;
      }
    }
    assert(selected,'the frozen desert has a wide, physically clear worker lane');
    const {start,end,body}=selected,revision=session.core.wasm.lazy_route_revision();
    const stamp=session.routeStamp(),ordinary=session.routeActorNative(start,end,{worker:true});
    assert.equal(ordinary.status,'found');
    let result;
    for(let i=0;i<3;i++)result=nav.mobileDetour(start,end,.28,[body],true);
    assert.equal(result.status,'found');
    assert(result.points.length>1,'the route bends around the occupied center');
    let previous=start;
    for(const point of result.points){
      assert(nav.segmentClear(previous,point,.28,null,true));
      assert(actorSegmentClear(previous,point,{...start,radius:.28},[body]));
      previous=point;
    }
    assert.deepEqual(result.points.at(-1),end);
    assert.equal(session.core.wasm.lazy_route_revision(),revision);
    assert.deepEqual(session.routeStamp(),stamp);
    assert.deepEqual(session.routeActorNative(start,end,{worker:true}),ordinary);
  }finally{session.dispose();}
});
