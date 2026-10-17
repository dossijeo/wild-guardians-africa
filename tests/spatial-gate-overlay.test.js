import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {ANIMAL_SPATIAL_PROFILES} from '../src/world/hierarchical-wasm/spatial-movement-profiles.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';

for(const biome of ['sabana','gran-rio','manglares','volcanes','desierto','gran-canon'])
  test(`${biome} read-only gate overlay matches a provisional native wall`,async()=>{
    const {state,nav,session,start}=await createSpatialCampaignOpening({biome});
    try{
      const center=start.site.center;
      const x0=center.x-10,x1=center.x+22,
        z0=Math.min(...start.farm.map(point=>point.z))-10,z1=center.z+10;
      const quote=Game.quoteWallChain(state,'zarzas',
        [[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],nav,
        {smooth:false,snap:false});
      assert(quote.pieces.length>0,'fixture must contain legal wall modules');
      const solid=quote.pieces.map(piece=>({...piece,gate:false,autoGate:false}));
      let compared=0;
      nav.withWallPreview(solid,quote.suppressed,()=>{
        for(const piece of solid){
          const gate={...piece,gate:true},ports=gatePortalPoints(gate);
          if(ports.length!==2)continue;
          const before=session.core.wasm.lazy_sector_updates();
          const overlay=nav.gateOverlayClear(gate,ports);
          assert.equal(session.core.wasm.lazy_sector_updates(),before,
            'the overlay must leave the confirmed graph unchanged');
          if(overlay===null)continue;
          const proposed=solid.map(item=>item.id===piece.id?gate:item);
          const physical=nav.withWallPreview(proposed,quote.suppressed,draft=>
            ports.every(port=>draft.walkable(port.x,port.z,.28,null,true))&&
            draft.segmentClear(ports[0],ports[1],.28,null,true));
          assert.equal(overlay,physical,`candidate ${piece.id}`);
          if(++compared===4)break;
        }
      });
      assert(compared>0,'fixture must compare at least one gate candidate');
      const local=session.wallLocalOverlay(solid,quote.suppressed);
      if(quote.suppressed.every(id=>nav.suppressed.has(id))){
        assert(local,'resident wall hypothesis should support a local overlay');
        const probes=solid.slice(0,4).flatMap(piece=>[
          {x:piece.x,z:piece.z},{x:piece.x+1.5,z:piece.z+1.5}]);
        const beforeProbes=session.core.wasm.lazy_sector_updates();
        const localProbes=probes.map(point=>local.walkable(point.x,point.z));
        assert.equal(local.walkable(10000,10000),null,
          'nonresident space must remain unknown');
        assert.equal(session.core.wasm.lazy_sector_updates(),beforeProbes);
        const physicalProbes=nav.withWallPreview(solid,quote.suppressed,draft=>
          probes.map(point=>draft.walkable(point.x,point.z,.28,null,true)));
        for(let i=0;i<probes.length;i++)if(localProbes[i]!==null)
          assert.equal(localProbes[i],physicalProbes[i],`room probe ${i}`);
        let readOnlyCompared=0;
        for(const piece of solid){
          const gate={...piece,gate:true},ports=gatePortalPoints(gate);
          if(ports.length!==2)continue;
          const before=session.core.wasm.lazy_sector_updates();
          const readOnly=local.gateClear(gate,ports);
          assert.equal(session.core.wasm.lazy_sector_updates(),before);
          if(readOnly===null)continue;
          const proposed=solid.map(item=>item.id===piece.id?gate:item);
          const physical=nav.withWallPreview(proposed,quote.suppressed,draft=>
            ports.every(port=>draft.walkable(port.x,port.z,.28,null,true))&&
            draft.segmentClear(ports[0],ports[1],.28,null,true));
          assert.equal(readOnly,physical,`whole-stroke candidate ${piece.id}`);
          if(++readOnlyCompared===4)break;
        }
        assert(readOnlyCompared>0,'fixture must compare the whole-stroke overlay');
      }else assert.equal(local,null,'prop removal must use the full preview');
    }finally{session.dispose();}
  });

test('a 20-prop hypothetical removal restores every mobility profile',async()=>{
  const {nav,session,loaded}=await createSpatialCampaignOpening({biome:'sabana'});
  try{
    const props=[...loaded.values()].flatMap(chunk=>chunk.instances.flat())
      .filter(item=>/^spatial:[0-5]:/.test(item.id)&&
        (item.slot<4||item.slot>=10&&item.slot<=12||item.slot>=18))
      .slice(0,20);
    assert.equal(props.length,20,'fixture needs 20 solid resident props');
    const profiles=[true,...Object.keys(ANIMAL_SPATIAL_PROFILES)];
    const occupancy=()=>profiles.map(profile=>props.map(prop=>
      session.actorCanStand({x:prop.x,z:prop.z},profile===true?
        {worker:true}:{worker:false,species:profile})));
    const before=occupancy();
    nav.withWallPreview([],props.map(prop=>prop.id),()=>{
      assert.equal(session.core.wasm.spatial_removed_prop_count(),props.length);
      assert.notDeepEqual(occupancy(),before,
        'at least one profile must see the removed obstruction');
    });
    assert.equal(session.core.wasm.spatial_removed_prop_count(),0);
    assert.deepEqual(occupancy(),before,
      'restoration must not leave a stale raster or sector graph');
  }finally{session.dispose();}
});
