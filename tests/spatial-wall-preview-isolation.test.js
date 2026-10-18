import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize} from '../src/persistence/snapshots.js';
import {createSpatialCampaignOpening} from
  '../tools/experiments/spatial-campaign-opening.mjs';

test('one hundred provisional walls never update the confirmed Wild Engine graph',async()=>{
  const {state,session,nav,start}=await createSpatialCampaignOpening({
    biome:'sabana',seed:123,slotId:'isolated-wall-preview'});
  try{
    const center=start.site.center;
    const proposals=[[15,15],[18,12],[-15,15],[15,-15]]
      .map(([dx,dz],i)=>({id:`wall-preview-${i}`,kind:'wall',
        status:'intact',material:'zarzas',x:center.x+dx,z:center.z+dz,
        yaw:0,baseScaleX:1}))
      .filter(wall=>nav.wallPlacement(wall).valid);
    assert(proposals.length>0);
    const confirmed=session.core;
    for(const species of ['warthog','hyena','buffalo','lion','rhino'])
      session.actorRegionsBatch([proposals[0]],{worker:false,species});
    session.actorRegionsBatch([proposals[0]],{worker:true});
    const endpoint=proposals[0];
    const from={x:endpoint.x-4,z:endpoint.z};
    const to={x:endpoint.x+4,z:endpoint.z};
    const firstRoute=session.routeActor(from,to,{worker:true});
    const beforeState=serialize(state),beforeSpatial=confirmed.snapshot();
    const revisions=()=>{
      const routes=[];
      for(let i=0;i<6;i++){
        confirmed.selectNavigationProfile(i);
        routes.push(confirmed.wasm.lazy_route_revision());
      }
      return {stamp:session.routeStamp(),routes,
        updates:confirmed.wasm.lazy_sector_updates(),
        intentChanges:confirmed.wasm.nav_intent_change_count(),
        intentInvalidations:confirmed.wasm.nav_intent_invalidation_count()};
    };
    const before=revisions();
    for(let i=0;i<100;i++){
      const wall=proposals[i%proposals.length];
      const physical=nav.withWallPreview([wall],[],draft=>
        draft.walkable(wall.x,wall.z,.28,null,true),i%2===0);
      assert.equal(physical,false);
      assert.equal(session.core,confirmed,'the live core must be restored');
    }
    assert.throws(()=>nav.withWallPreview([proposals[0]],[],()=>{
      throw Error('probe aborted');
    }),/probe aborted/);
    assert.equal(session.core,confirmed);
    assert.deepEqual(revisions(),before);
    assert.deepEqual(confirmed.snapshot(),beforeSpatial);
    assert.equal(serialize(state),beforeState);
    assert.deepEqual(session.routeActor(from,to,{worker:true}),firstRoute);
  }finally{session.dispose();}
});
