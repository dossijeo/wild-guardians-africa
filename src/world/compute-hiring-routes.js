import {deserialize} from '../persistence/snapshots.js';
import * as Game from '../simulation/game.js';
import {Navigation} from './navigation.js';
import {raidNavigationWarmth} from './raid-navigation-warmth.js';
export function computeHiringRoutes(request){
 const state=deserialize(request.snapshot),nav=new Navigation(state.seed,state.biome,request.profile);nav.setState(state);
 if(request.bounds)nav.setActiveBounds(request.bounds);if(request.view)nav.setRaidView(request.view.eye,request.view.target);
 let id=`hiring-route-preview:${request.token}`;while(state.commandIds.includes(id)||Object.hasOwn(state.ledger.entries,id))id+=':';
 if(request.centerId===null)Game.hire(state,id,request.selection);else Game.hireAdditional(state,id,request.selection,request.centerId);
 Game.resume(state,'menu');Game.resume(state,'tutorial-action');
 Game.tick(state,.02,nav);
 return {token:request.token,warmth:raidNavigationWarmth(nav)};
}
