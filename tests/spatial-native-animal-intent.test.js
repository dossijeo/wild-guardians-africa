import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialIntentBridge} from '../src/world/hierarchical-wasm/spatial-intent-bridge.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const row=(op,kind,id,targetKind=0,x=0,z=0,active=0)=>
  [op,kind,id,targetKind,x,z,active,0,0,0];

test('native retreat owns one physical route until completion without an attack lease',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
  const game=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
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
    assert(end,'fixture needs a physically reachable exit');
    const bridge=createSpatialIntentBridge(session);
    bridge.resetFromState(game);
    const actor={id:'animal-900001',species:'hyena',...start,exit:end};
    const result=bridge.planRetreatRoute(actor);
    assert.equal(result.status,'found');
    assert(result.path.length>0);
    assert(Math.hypot(result.path.at(-1).x-end.x,
      result.path.at(-1).z-end.z)<.01);
    assert.deepEqual(bridge.routePoints(result.routeHandle),
      Float32Array.from(result.path.flatMap(point=>[point.x,point.z])));
    assert.equal(session.core.wasm.nav_intent_actor(900001),1);
    const record=new Float64Array(session.core.wasm.memory.buffer,
      session.core.wasm.nav_intent_actor_ptr(),10);
    assert.equal(record[3],0,'retreat has no target lease');
    assert(bridge.cancelAttackIntent(actor.id));
    assert.equal(bridge.routePoints(result.routeHandle),null);
    bridge.resetFromState(game);
    const pointer=session.core.wasm.nav_intent_attack_route_input_ptr(
      result.path.length);
    const saved=new Float32Array(session.core.wasm.memory.buffer,pointer,
      result.path.length*2);
    for(let index=0;index<result.path.length;index++){
      saved[index*2]=result.path[index].x;
      saved[index*2+1]=result.path[index].z;
    }
    assert.equal(session.core.wasm.nav_intent_restore_retreat(900001,
      start.x,start.z,end.x,end.z,result.path.length),1);
    assert.equal(bridge.routePoints(result.routeHandle),null,
      'a route handle from the previous session must stay invalid');
    assert.equal(session.core.wasm.nav_intent_actor(900001),1);
  }finally{session.dispose();}
});

test('a confirmed wall invalidates a pinned retreat route and its old handle',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
  const game=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    let origin,route;
    for(let z=-10;z<=10&&!route;z++)for(let x=-10;x<=10&&!route;x++){
      const from={x:x+.2,z:z+.2};
      for(const [dx,dz] of [[8,0],[-8,0],[0,8],[0,-8]]){
        const candidate=session.routeActor(from,
          {x:from.x+dx,z:from.z+dz},{worker:false,species:'hyena'});
        if(candidate.status==='found'&&candidate.points.length>3){
          origin=from;route=candidate;break;
        }
      }
    }
    assert(route,'fixture needs a retreat route with a nonterminal waypoint');
    const exit=route.points.at(-1),bridge=createSpatialIntentBridge(session);
    bridge.resetFromState(game);
    const actor={id:'animal-900002',species:'hyena',...origin,exit};
    const first=bridge.planRetreatRoute(actor);
    assert.equal(first.status,'found');
    const waypoint=first.path[Math.floor(first.path.length/2)];
    const wallId=session.core.addWall(waypoint.x,waypoint.z,.3,.3);
    assert(wallId>0);
    session.actorSectorRevision({worker:false,species:'hyena'});
    assert(session.core.wasm.nav_intent_reconcile_topology()>0);
    assert.equal(bridge.routePoints(first.routeHandle),null,
      'the pre-wall handle must not expose a stale route');
    assert.equal(session.core.wasm.nav_intent_actor(900002),1);
    const waiting=new Float64Array(session.core.wasm.memory.buffer,
      session.core.wasm.nav_intent_actor_ptr(),10);
    assert.equal(waiting[1],0,'the retreat needs a new physical route');
    assert.equal(waiting[3],0,'no attack target or lease is acquired');
    assert(session.core.removeWall(wallId)>0);
    const replacement=bridge.planRetreatRoute(actor);
    assert.equal(replacement.status,'found');
    assert.notDeepEqual(replacement.routeHandle,first.routeHandle);
  }finally{session.dispose();}
});

test('native animal leases preserve committed strikes and reject duplicate targets',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
  const game=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    let origin,route;
    for(let z=-10;z<=10&&!route;z++)for(let x=-10;x<=10;x++){
      const start={x:x+.2,z:z+.2},end={x:x+1.2,z:z+.2};
      const candidate=session.routeActor(start,end,{worker:false,species:'hyena'});
      if(candidate.status==='found'&&candidate.points.length){origin=start;route=candidate;break;}
    }
    assert(route,'the fixture contains a physical hyena route');
    let longRoute;
    session.actorSectorRevision({worker:false,species:'hyena'});
    const clearLongSegment=end=>{
      const distance=Math.hypot(end.x-origin.x,end.z-origin.z);
      if(distance<=1.5)return false;
      const steps=Math.ceil(distance/1.25);
      for(let index=0;index<steps;index++){
        const from=index/steps,to=(index+1)/steps;
        if(!session.core.wasm.spatial_local_clear(
          origin.x+(end.x-origin.x)*from,origin.z+(end.z-origin.z)*from,
          origin.x+(end.x-origin.x)*to,origin.z+(end.z-origin.z)*to))
          return false;
      }
      return true;
    };
    for(let radius=3;radius<=15&&!longRoute;radius++)
      for(const [dx,dz] of [[radius,0],[-radius,0],[0,radius],[0,-radius]]){
        const candidate=session.routeActor(origin,
          {x:origin.x+dx,z:origin.z+dz},{worker:false,species:'hyena'});
        const end=candidate.points?.at(-1);
        if(candidate.status==='found'&&end&&clearLongSegment(end)){
          longRoute={points:[origin,end]};break;
        }
      }
    assert(longRoute,'the fixture contains a validated long route segment');
    let detourRoute;
    for(let radius=7;radius<=12&&!detourRoute;radius++)
      for(const [dx,dz] of [[radius,0],[-radius,0],[0,radius],[0,-radius]]){
        const candidate=session.routeActor(origin,
          {x:origin.x+dx,z:origin.z+dz},{worker:false,species:'hyena'});
        if(candidate.status==='found'&&candidate.points.length>3){
          detourRoute=candidate;break;
        }
      }
    assert(detourRoute,'the fixture contains a longer route for event rerouting');
    const wasm=session.core.wasm,end=route.points.at(-1),
      longEnd=longRoute.points.at(-1);
    const detourEnd=detourRoute.points.at(-1);
    const write=(sequence,rows)=>{
      const ptr=wasm.nav_intent_changes_ptr(rows.length);
      new Float64Array(wasm.memory.buffer,ptr,rows.length*10).set(rows.flat());
      return wasm.nav_intent_apply_changes(sequence,rows.length);
    };
    const register=(actor,target,path=route.points)=>{
      if(path.length){
        const ptr=wasm.nav_intent_attack_route_input_ptr(path.length);
        assert(ptr);
        new Float32Array(wasm.memory.buffer,ptr,path.length*2)
          .set(path.flatMap(point=>[point.x,point.z]));
      }
      return wasm.nav_intent_register_attack(actor,target,
        origin.x,origin.z,path.length);
    };
    wasm.nav_intent_reset();
    assert.equal(write(1,[row(1,2,11,1,end.x,end.z,1),
      row(1,2,12,3,end.x+2,end.z,1),
      row(1,2,13,4,end.x+3,end.z,1),
      row(1,2,14,1,detourEnd.x,detourEnd.z,1),
      row(1,2,15,1,longEnd.x,longEnd.z,1)]),1);
    session.actorSectorRevision({worker:false,species:'hyena'});
    assert.equal(register(101,11),1);
    assert.equal(wasm.nav_intent_restore_attack_site(101,end.x,end.z,.28),1);
    assert.equal(wasm.nav_intent_register_attack_site(108,14,
      origin.x,origin.z,route.points.length,end.x+.2,end.z,.28),-6,
    'different crops cannot reserve overlapping attack approaches');
    assert.equal(wasm.nav_intent_actor(108),0,
      'rejected site leaves no native intention or target reservation');
    assert.equal(register(102,11),-3,
      'a second animal cannot lease the same crop');
    assert.equal(wasm.nav_intent_actor(101),1);
    const active=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
    const oldHandle=Array.from(active.slice(4,7));
    assert.equal(active[1],1);
    assert(wasm.nav_intent_route_points(...oldHandle)>0);
    assert.equal(register(107,15,longRoute.points),1);
    const longHandle=Array.from(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_actor_ptr(),10).slice(4,7));
    assert(session.core.addWall(end.x+18,end.z+18,.3,.3)>0);
    session.actorSectorRevision({worker:true});
    assert.equal(wasm.nav_intent_reconcile_topology(),0,
      'a remote wall does not invalidate a physically clear animal route');
    assert(wasm.nav_intent_route_points(...oldHandle)>0);
    assert(wasm.nav_intent_route_points(...longHandle)>0,
      'an unrelated topology revision must keep a validated long shortcut');
    assert.equal(register(105,14,detourRoute.points),1);
    assert.equal(wasm.nav_intent_actor(105),1);
    const detourHandle=Array.from(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_actor_ptr(),10).slice(4,7));
    const blockedPoint=detourRoute.points[Math.floor(detourRoute.points.length/2)];
    assert(session.core.addWall(blockedPoint.x,blockedPoint.z,.3,.3)>0);
    session.actorSectorRevision({worker:false,species:'hyena'});
    assert(wasm.nav_intent_reconcile_topology()>0,
      'a wall on the active route triggers one event-boundary invalidation');
    assert.equal(wasm.nav_intent_actor(105),1);
    const invalidated=new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_actor_ptr(),10);
    assert.equal(invalidated[1],0,'the same attack intention needs a route');
    assert.equal(invalidated[3],14,'the target and lease survive route loss');
    assert.equal(wasm.nav_intent_route_points(...detourHandle),-1);
    assert.equal(register(106,14),-3,
      'an invalidated route does not release the exclusive crop lease');
    assert.equal(wasm.nav_intent_replan_attack_route(105,origin.x,origin.z,
      detourEnd.x,detourEnd.z),1,'the native engine finds another route');
    assert.equal(wasm.nav_intent_actor(105),1);
    const replanned=new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_actor_ptr(),10);
    assert.equal(replanned[1],1);
    assert.equal(replanned[3],14);
    assert(wasm.nav_intent_route_points(...Array.from(replanned.slice(4,7)))>0);
    assert.equal(wasm.nav_intent_attack_cancel(105),1);
    assert.equal(register(102,13),1);
    assert.equal(register(103,13),1,
      'a center permits separate animal approaches');
    assert.equal(wasm.nav_intent_attack_action_active(101),1);
    assert.equal(wasm.nav_intent_route_points(...oldHandle),-1,
      'the committed attack no longer retains its travel route');
    assert.equal(write(2,[row(0,2,11)]),1);
    assert.equal(wasm.nav_intent_actor(101),1,
      'target destruction does not erase a committed strike');
    assert.equal(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_actor_ptr(),10)[1],2);
    assert.equal(wasm.nav_intent_attack_finished(101),1,
      'tactical reconsideration is deferred until the hit frame');
    assert.equal(wasm.nav_intent_attack_finished(101),-1,
      'the same strike cannot finish twice');
    assert.equal(wasm.nav_intent_actor(101),0);
    assert.equal(register(104,11),-2,
      'a destroyed crop cannot receive another lease');
    assert.equal(register(104,12),1);
    assert.equal(write(3,[row(0,2,12)]),1);
    assert.equal(wasm.nav_intent_actor(104),0,
      'an uncommitted route is cancelled when its target vanishes');
    assert.equal(wasm.nav_intent_attack_cancel(102),1);
    assert.equal(wasm.nav_intent_attack_cancel(103),1);
    wasm.nav_intent_reset();
    assert.equal(write(1,[row(1,2,12,1,end.x+3,end.z,1)]),1);
    session.actorSectorRevision({worker:false,species:'hyena'});
    assert.equal(wasm.nav_intent_restore_attack_action(102,12,0),1,
      'a saved committed strike is restored without replaying travel');
    assert.equal(wasm.nav_intent_actor(102),1);
    assert.equal(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_actor_ptr(),10)[1],2);
    assert.equal(register(103,12),1,
      'a committed strike whose JS lease was released does not block a new one');
    assert.equal(wasm.nav_intent_attack_finished(102),0);
    assert.equal(wasm.nav_intent_attack_finished(102),-1);
    assert.equal(wasm.nav_intent_attack_cancel(103),1);
    wasm.nav_intent_reset();
    assert.equal(write(1,[row(1,2,12,1,end.x,end.z,1)]),1);
    session.actorSectorRevision({worker:false,species:'hyena'});
    assert.equal(wasm.nav_intent_restore_attack_pending(106,12,1),1);
    assert.equal(register(107,12),-3,
      'a restored pending route retains the saved exclusive lease');
    assert.equal(wasm.nav_intent_replan_attack_route(106,origin.x,origin.z,
      end.x,end.z),1);
    assert.equal(wasm.nav_intent_actor(106),1);
    const restoredRoute=new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_actor_ptr(),10);
    assert.equal(restoredRoute[1],1);
    assert.equal(restoredRoute[3],12);
    const wrongProgress=wasm.nav_intent_route_progress_input_ptr(1);
    new Float32Array(wasm.memory.buffer,wrongProgress,2)
      .set([end.x+100,end.z+100]);
    assert.equal(wasm.nav_intent_route_progress(106,origin.x,origin.z,1),0);
    assert(session.core.addWall(end.x+30,end.z+30,.3,.3)>0);
    session.actorSectorRevision({worker:false,species:'hyena'});
    assert.equal(wasm.nav_intent_reconcile_topology(),1,
      'a JS path that is not a native suffix forces safe invalidation');
  }finally{session.dispose();}
});

test('topology validation retains a verified remaining attack route when a wall closes behind it',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
  const game=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  const session=createSpatialGameSession(module,game,{
    loaded:()=>new Map(),onData:()=>{}});
  try{
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    const wasm=session.core.wasm;
    session.actorSectorRevision({worker:false,species:'hyena'});
    let origin,end;
    for(let z=-10;z<=10&&!end;z++)for(let x=-10;x<=10&&!end;x++)
      for(const dx of [6,-6,8,-8]){
        const from={x:x+.2,z:z+.2},to={x:from.x+dx,z:from.z};
        const route=session.routeActor(from,to,{worker:false,species:'hyena'});
        if(route.status!=='found')continue;
        const steps=Math.ceil(Math.abs(dx)/1.25);
        let clear=true;
        for(let i=0;i<steps;i++)if(!wasm.spatial_local_clear(
          from.x+dx*i/steps,from.z,from.x+dx*(i+1)/steps,from.z)){
          clear=false;break;
        }
        if(clear){origin=from;end=to;break;}
      }
    assert(origin&&end,'the fixture contains a straight physical route');
    wasm.nav_intent_reset();
    const changes=wasm.nav_intent_changes_ptr(1);
    new Float64Array(wasm.memory.buffer,changes,10)
      .set([1,2,11,1,end.x,end.z,1,0,0,0]);
    assert.equal(wasm.nav_intent_apply_changes(1,1),1);
    session.actorSectorRevision({worker:false,species:'hyena'});
    const input=wasm.nav_intent_attack_route_input_ptr(2);
    new Float32Array(wasm.memory.buffer,input,4)
      .set([origin.x,origin.z,end.x,end.z]);
    assert.equal(wasm.nav_intent_register_attack(101,11,origin.x,origin.z,2),1);
    assert.equal(wasm.nav_intent_actor(101),1);
    const handle=Array.from(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_actor_ptr(),10).slice(4,7));
    const current={x:origin.x+(end.x-origin.x)*.8,z:origin.z};
    const progress=wasm.nav_intent_route_progress_input_ptr(1);
    new Float32Array(wasm.memory.buffer,progress,2).set([end.x,end.z]);
    assert.equal(wasm.nav_intent_route_progress(101,current.x,current.z,1),1);
    assert(session.core.addWall((origin.x+end.x)/2,origin.z,.3,.3)>0);
    session.actorSectorRevision({worker:false,species:'hyena'});
    assert.equal(session.routeActor(current,end,
      {worker:false,species:'hyena'}).status,'found');
    assert.equal(wasm.nav_intent_reconcile_topology(),0,
      'a wall behind the actor does not invalidate its verified route suffix');
    assert(wasm.nav_intent_route_points(...handle)>0);
    const ahead={x:current.x+(end.x-current.x)*.6,z:current.z};
    assert(session.core.addWall(ahead.x,ahead.z,.3,.3)>0);
    session.actorSectorRevision({worker:false,species:'hyena'});
    assert.equal(wasm.nav_intent_reconcile_topology(),1,
      'an obstacle on the remaining route still invalidates it');
    assert.equal(wasm.nav_intent_route_points(...handle),-1);
  }finally{session.dispose();}
});
