import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import * as Game from '../../src/simulation/game.js';
import {spawnRaid,updateRaid} from '../../src/simulation/raids.js';
import {findSpatialStart} from '../../src/world/wild-engine/spatial-initial-site.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const pack=JSON.parse(readFileSync('public/content/villages.json'))[0];
const s=Game.newGame({seed:37,biome:'manglares',culture:'mapungubwe',slotId:'estuary-raid-qa'});s.mangroveNetwork=true;
const start=await findSpatialStart(module,s,pack);if(!start.valid)throw Error('No initial site');
Object.assign(s.villages[0],start.site);s.suppressed.push(...start.site.suppress);
const installed=new Map(),session=createSpatialGameSession(module,s,{loaded:()=>installed,onData:d=>installed.set(`${d.cx},${d.cz}`,d)});
try{
 const nav=createSpatialNavigationMovement(session,s),cx=Math.floor((start.site.x+24)/48),cz=Math.floor((start.site.z+24)/48),wanted=new Map();
 for(let z=cz-3;z<=cz+3;z++)for(let x=cx-3;x<=cx+3;x++)wanted.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-cx)+Math.abs(z-cz)});
 session.stream.plan(wanted);await session.stream.whenIdle();
 Game.resume(s,'intro');s.tutorial.step='center';Game.placeStructure(s,'center',start.site.center,nav);
 const spawned=spawnRaid(s,{group:['warthog','hyena','buffalo','lion','rhino']},nav),waterActors=new Set(),positions=[];
 let steps=0;
 while(s.raid&&!s.events.some(e=>e.type==='StructureHit')&&steps++<1800){s.elapsed+=.1;updateRaid(s,.1,nav);for(const a of s.raid?.animals??[]){if(nav.field.fluidInside(a.x,a.z))waterActors.add(a.id);}if(steps%50===0)positions.push({time:s.elapsed,animals:s.raid?.animals.map(a=>({id:a.id,x:a.x,z:a.z,status:a.status,wait:a.raidWait}))});}
 const report={spawned,steps,waterActors:[...waterActors],hit:s.events.some(e=>e.type==='StructureHit'),site:start.site,positions};
 mkdirSync('docs/qa/mangrove-magic-20261026',{recursive:true});writeFileSync('docs/qa/mangrove-magic-20261026/native-estuary-raid.json',JSON.stringify(report,null,2));console.log(JSON.stringify({spawned,steps,waterActors:waterActors.size,hit:report.hit}));
}finally{session.dispose();}
