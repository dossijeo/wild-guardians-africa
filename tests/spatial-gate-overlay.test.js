import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
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
    }finally{session.dispose();}
  });
