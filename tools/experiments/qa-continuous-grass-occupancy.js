import {applyMaterialStudy as base} from '/tools/experiments/qa-continuous-grass.js';
import {observeGameEvents} from '/src/simulation/game.js';
import {markGroundDetailEvent} from '/src/rendering/blender-ground-details.js';
export async function applyMaterialStudy(world,variant='C'){
 await base(world,variant);const q=world.qaContinuousGrass;
 if(!q.filteredOccupancyEvents){q.releaseEvents?.();q.releaseEvents=observeGameEvents(world.state,event=>markGroundDetailEvent(q,world.state,event,id=>world.objects.get(id)?.position));q.filteredOccupancyEvents=true;}
 return q.audit();
}
