import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

// Diagnostic for the remaining mutating wall-preview path. A clean preview
// would leave all confirmed revision counters unchanged.
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
  nav.withWallPreview([proposal],[],draft=>
    draft.walkable(proposal.x,proposal.z,.28,null,true));
  const after=snapshot();
  console.log(JSON.stringify({proposal:{x:proposal.x,z:proposal.z},before,after,
    sectorDelta:after.sectors-before.sectors,
    routeRevisionDelta:after.nativeRoute-before.nativeRoute}));
}finally{session.dispose();}
