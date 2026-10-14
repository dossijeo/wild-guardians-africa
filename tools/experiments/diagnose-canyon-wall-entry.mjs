import * as Game from '../../src/simulation/game.js';
import {chooseRaidEntry} from '../../src/simulation/raids.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {rational} from '../../src/simulation/money.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const seed=Number(process.argv[2]??712);
const {state,nav,session,start}=await createSpatialCampaignOpening({
  seed,biome:'gran-canon',slotId:`diagnose-canyon-wall-entry-${seed}`});
try{
  state.tutorial.step='done';state.initialPreparation=false;
  state.ledger.balance=rational(1000000);
  const {x:cx,z:cz}=start.site.center,
    x0=cx-10,x1=cx+22,z0=Math.min(...start.farm.map(point=>point.z))-10,z1=cz+10;
  if(!Game.buildWallChain(state,'diagnose-ring','zarzas',
    [[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],nav,
    {smooth:false,snap:false}))throw Error('Ring construction failed');
  let placed=0;
  for(let dz=-54;dz<=54&&placed<40;dz+=2)
    for(let dx=-54;dx<=54&&placed<40;dx+=2){
      const x=cx+dx,z=cz+dz;
      if(x<=x0+2||x>=x1-2||z<=z0+2||z>=z1-2||
        !nav.placement(x,z,.4).valid)continue;
      if(Game.plant(state,`diagnose-${placed}`,'mijo',x,z,nav))placed++;
    }
  const late=[...Array(3).fill('warthog'),...Array(4).fill('hyena'),
    ...Array(4).fill('buffalo'),...Array(3).fill('lion'),
    ...Array(2).fill('rhino')];
  const variants=[late,late.slice(0,-1),late.slice(0,-2),
    late.filter(id=>id!=='rhino'&&id!=='lion'),
    [...Array(16).fill('warthog')],['rhino'],['rhino','rhino'],
    ['lion','rhino'],['buffalo','rhino']];
  const rows=variants.map(group=>{
    const specs=group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
    const entry=chooseRaidEntry(state,specs,nav.activeBounds,0,nav);
    return {group:group.join(','),count:group.length,entry:!!entry,
      first:entry?.entries?.[0],bounds:entry?.selectionBounds??nav.activeBounds};
  });
  process.stdout.write(JSON.stringify({seed,placed,walls:state.structures.filter(s=>s.kind==='wall').length,
    gates:state.structures.filter(s=>s.kind==='wall'&&s.gate).length,rows},null,2)+'\n');
}finally{session.dispose();}
