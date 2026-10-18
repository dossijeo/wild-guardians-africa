import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {performance} from 'node:perf_hooks';

// Frozen, reproducible probe for confirmed-graph isolation and the cost of
// the first and subsequent exact legacy wall hypotheses.
const {session,nav,start}=await createSpatialCampaignOpening({
  biome:'sabana',seed:123,slotId:'wall-preview-isolation-audit'});
try{
  const center=start.site.center;
  const offsets=[[15,15],[18,12],[-15,15],[15,-15]];
  const proposal=offsets.map(([dx,dz])=>({id:'preview-probe',kind:'wall',
    status:'intact',material:'zarzas',x:center.x+dx,z:center.z+dz,
    yaw:0,baseScaleX:1})).find(wall=>nav.wallPlacement(wall).valid);
  if(!proposal)throw Error('No legal resident wall probe was found');
  const snapshot=()=>({stamp:session.routeStamp(),
    sectors:session.core.wasm.lazy_sector_updates(),
    nativeRoute:session.core.wasm.lazy_route_revision()});
  const before=snapshot();
  const started=performance.now();
  nav.withWallPreview([proposal],[],draft=>
    draft.walkable(proposal.x,proposal.z,.28,null,true));
  const firstMs=performance.now()-started;
  const warmed=performance.now();
  for(let i=1;i<100;i++)nav.withWallPreview([proposal],[],draft=>
    draft.walkable(proposal.x,proposal.z,.28,null,true));
  const remainingMs=performance.now()-warmed;
  const after=snapshot();
  console.log(JSON.stringify({proposal:{x:proposal.x,z:proposal.z},before,after,
    sectorDelta:after.sectors-before.sectors,
    routeRevisionDelta:after.nativeRoute-before.nativeRoute,
    firstMs,remainingMs,previewCount:100}));
}finally{session.dispose();}
