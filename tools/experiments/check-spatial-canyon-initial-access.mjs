import {writeFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {canyonLandAccess} from '../../src/world/canyon-land-access.js';
import {ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';

const output=process.argv[2];
const opening=await createSpatialCampaignOpening({seed:712,biome:'gran-canon',
  culture:'mapungubwe',slotId:'native-canyon-access-diagnosis'});
try{
  const {nav,start,state}=opening,checks=[];
  for(let z=1;z<=7;z++)for(let x=-3;x<=3;x++){
    if(opening.session.core.selectChunk(x,z)<0)opening.session.core.addChunk(x,z);
    opening.session.core.selectChunk(x,z);
    opening.loaded.set(`${x},${z}`,opening.session.core.chunkPayload());
  }
  nav.setActiveBounds([-120,72,120,312]);
  for(const species of ['warthog','rhino'])
    for(const distance of [32,48,64,96,128,144]){
      const radius=ANIMAL_SPATIAL_PROFILES[species].radius;
      let witness=null,error=null;
      try{witness=canyonLandAccess(nav,start.farm,{radius,distance});}
      catch(caught){error={name:caught.name,message:caught.message,
        missing:caught.missing??null};}
      checks.push({species,radius,distance,witness,error});
    }
  const report={seed:712,biome:'gran-canon',site:start.site,
    acceptedLandAccess:start.landAccess,checks,
    loadedChunks:opening.session.core.metrics().loadedChunks,
    center:state.structures.find(s=>s.kind==='center')};
  if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({site:{x:start.site.x,z:start.site.z},checks:checks.map(c=>({
    species:c.species,distance:c.distance,entry:c.witness?.entry??null,error:c.error}))}));
}finally{opening.dispose();}
