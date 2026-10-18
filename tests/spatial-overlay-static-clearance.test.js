import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialCampaignOpening} from
  '../tools/experiments/spatial-campaign-opening.mjs';
import {spatialStructureBarriers} from
  '../src/world/hierarchical-wasm/spatial-wall-bridge.js';
import {SMALLEST_ANIMAL_RADIUS} from
  '../src/world/hierarchical-wasm/spatial-topological-enclosure-prototype.js';

test('read-only wall clearance matches installed geometry without changing revisions',async()=>{
  const {session,nav,start}=await createSpatialCampaignOpening({
    seed:123,biome:'sabana',slotId:'static-clearance-overlay'});
  try{
    const center=start.site.center;
    const wall=[[15,15],[18,12],[-15,15],[15,-15]]
      .map(([dx,dz])=>({id:'clearance-probe',kind:'wall',
        status:'intact',material:'zarzas',x:center.x+dx,z:center.z+dz,
        yaw:0,baseScaleX:1}))
      .find(candidate=>nav.wallPlacement(candidate).valid);
    assert(wall);
    for(const species of ['warthog','hyena','buffalo','lion','rhino'])
      session.actorRegionsBatch([wall],{worker:false,species});
    const barriers=spatialStructureBarriers(wall);
    const samples=[[0,0],[0,1],[2,0],[3,0]]
      .map(([dx,dz])=>({x:wall.x+dx,z:wall.z+dz}));
    const before=session.core.wasm.lazy_route_revision();
    const overlay=samples.map(point=>session.core.overlayStaticClearance(
      point,4,[],barriers));
    const face=[Math.round(wall.x),Math.round(wall.z),
      Math.round(wall.x)+1,Math.round(wall.z)];
    const faceOverlay=session.core.overlayCutSolidFaces(face,
      SMALLEST_ANIMAL_RADIUS,[],barriers);
    assert(faceOverlay);
    assert.equal(session.core.wasm.lazy_route_revision(),before);
    const ids=session.core.applyBarrierChanges([],barriers);
    try{
      const confirmed=samples.map(point=>
        session.core.wasm.spatial_static_object_clearance(point.x,point.z,4));
      assert.deepEqual(overlay,confirmed);
      assert.equal(faceOverlay[0],session.core.wasm.lazy_cut_face_natural(...face)===1);
    }finally{session.core.applyBarrierChanges(ids,[]);}
  }finally{session.dispose();}
});
