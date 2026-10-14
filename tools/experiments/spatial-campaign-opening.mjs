import {readFileSync} from 'node:fs';
import * as Game from '../../src/simulation/game.js';
import {findSpatialStart} from '../../src/world/hierarchical-wasm/spatial-initial-site.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {nativeCameraPose} from '../../src/rendering/terrain-camera.js';

const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const villages=JSON.parse(readFileSync(new URL(
  '../../public/content/villages.json',import.meta.url),'utf8'));
const chunkAt=value=>Math.floor((value+24)/48);

// Isolated campaign entry. Every terrain, prop and route query uses the same
// C++ world as the chunk payloads; this never constructs Navigation/TerrainField.
export async function createSpatialCampaignOpening({seed=712,biome='sabana',
  culture='mapungubwe',slotId='spatial-campaign'}={}){
  const pack=villages.find(item=>item.id===(culture==='saheliana'?'saheliano':culture));
  if(!pack)throw RangeError('Unknown village culture');
  const state=Game.newGame({seed,biome,culture,slotId});
  const start=await findSpatialStart(wasm,state,pack);
  Object.assign(state.villages[0],start.site);
  state.suppressed.push(...start.site.suppress);
  const loaded=new Map();
  const session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const cx=chunkAt(start.site.center.x),cz=chunkAt(start.site.center.z);
    const jobs=new Map();
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=cx+dx,z=cz+dz;
      jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.hypot(dx,dz)});
    }
    session.stream.plan(jobs);
    await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([(cx-1)*48-24,(cz-1)*48-24,
      (cx+1)*48+24,(cz+1)*48+24]);
    const pose=nativeCameraPose(nav.field,
      [start.site.center.x,0,start.site.center.z],
      nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,
      nav.field.canyon?34:38);
    nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},start.site.center);
    Game.resume(state,'intro');
    state.tutorial.step='center';
    if(!Game.placeStructure(state,'spatial-opening-center',start.site.center,nav))
      throw Error('Native starting site rejected its work center');
    return {state,nav,session,start,loaded};
  }catch(error){session.dispose();throw error;}
}
