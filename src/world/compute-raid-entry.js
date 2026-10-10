import {raidExteriorPayload,raidExteriorInputKey,adoptRaidExteriorPayload} from './raid-exterior.js';
import {completeRaidEntryResult,raidRequestProof} from './raid-entry-result.js';
import {TerrainField} from './terrain.js';
import {Navigation} from './navigation.js';
import {chooseRaidEntry,warmRaidApproaches} from '../simulation/raids.js';
import {animalSpec,randomInt} from '../simulation/rules.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {raidNavigationWarmth,navigationPathKey} from './raid-navigation-warmth.js';

export function computeRaidEntry(request,{preparedGeometry=null}={}){
  const {state,profile,group,bounds,view,key,token}=request;
  const nav=new Navigation(state.seed,state.biome,profile);
  if(request.config&&JSON.stringify(nav.config)!==JSON.stringify(request.config)){nav.config=structuredClone(request.config);nav.field=new TerrainField(nav.config);}
  nav.setState(state);nav.setActiveBounds(bounds);nav.setRaidView(view.eye,view.target);
  const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  if(request.geometryKey&&request.geometryKey!==raidExteriorInputKey(state,nav))throw Error('Raid geometry request does not match reconstructed navigation');
  if(preparedGeometry&&!adoptRaidExteriorPayload(state,nav,preparedGeometry,preparedGeometry.regions.map(p=>p[0])))throw Error('Invalid internally prepared raid geometry');
  const proof=raidRequestProof(request);
  // Only the isolated request copy advances. The real spawn still consumes
  // its original RNG draw, even when this prepared result is accepted.
  const entry=chooseRaidEntry(state,specs,bounds,randomInt(state,0,3),nav);
  const path=nav.path.bind(nav);let points=0;nav.warmPaths=new Map();
  nav.path=(start,end,radius=.3,ignore=null,worker=true,margin=16)=>{
    const route=path(start,end,radius,ignore,worker,margin);
    if(route&&nav.warmPaths.size<128&&points+route.length<=20000){
      const key=navigationPathKey(start,end,radius,ignore,worker,margin);
      if(!nav.warmPaths.has(key)){nav.warmPaths.set(key,route.map(p=>({...p})));points+=route.length;}
    }
    return route;
  };
  warmRaidApproaches(state,specs,entry,nav);
  return completeRaidEntryResult({key,token,owner:request.owner,proof,entry,geometry:raidExteriorPayload(state,nav,specs.map(p=>p.radius)),warmth:raidNavigationWarmth(nav)});
}
