// Legal first-day commands on the original terrain; no money, growth or time overrides.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {findInitialLocation} from '../src/world/villages.js';
import * as Game from '../src/simulation/game.js';
import {isMature} from '../src/simulation/crops.js';
import {numberOf} from '../src/simulation/money.js';
import {permission} from '../src/simulation/rules.js';
const read=name=>JSON.parse(readFileSync(new URL(`../public/content/${name}.json`,import.meta.url),'utf8'));
const villages=read('villages');
export function createOpeningWorld({seed=712,biome='sabana',culture='mapungubwe',slotId='opening'}={}){
  const payload=villages.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));
  if(!payload)throw new Error('Unknown culture');
  const nav=new Navigation(seed,biome,read('biome-'+BIOME_IDS[biome]).profile);
  const location=findInitialLocation(nav,payload),s=Game.newGame({seed,biome,culture,slotId});
  Object.assign(s.villages[0],location);s.suppressed.push(...location.suppress);nav.setState(s);
  Game.resume(s,'intro');s.tutorial.step='center';
  Game.placeStructure(s,'center',{x:location.center.x,z:location.center.z},nav);
  return {s,nav};
}
export function simulateOpening(profile,requestedCount=8,worldOptions={}) {
  if(!['olderMale','olderFemale','youngMale','youngFemale'].includes(profile))throw new Error('Unknown worker profile');
  if(!Number.isSafeInteger(requestedCount)||requestedCount<1)throw new Error('Crop count must be a positive integer');
  const {s,nav}=createOpeningWorld(worldOptions);
  const center=s.structures[0],departure={x:center.x+3.4,z:center.z};
  const plots=[];
  for(let dz=-9;dz<=9;dz+=1.5)for(let dx=4.5;dx<=15;dx+=1.5){
    const point={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
    const route=nav.path(departure,point,.28,null,true);
    if(nav.placement(point.x,point.z,.4).valid&&route&&nav.path(point,departure,.28,null,true))
      plots.push({...point,distance:Math.hypot(point.x-departure.x,point.z-departure.z)});
  }
  plots.sort((a,b)=>a.distance-b.distance||a.z-b.z||a.x-b.x);
  const count=Math.min(requestedCount,profile.startsWith('young')?16:20);
  for(const [i,p] of plots.slice(0,count).entries())Game.plant(s,'plant-'+i,'mijo',p.x,p.z,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{[profile]:1});
  const initialBalance=numberOf(s.ledger.balance);
  let maximumTime=0;
  while(s.day===1&&!s.result&&!s.pauses.length) {
    if(permission(s,'harvest'))for(const p of s.plants.filter(p=>isMature(p)&&!p.harvestRequested))Game.harvest(s,'harvest-'+p.id,p.id);
    Game.tick(s,.5,nav);
    maximumTime=Math.max(maximumTime,s.time);
  }
  return {profile,plots:s.plants.length,initialBalance,delivered:s.crates.filter(c=>c.delivered).length,
    mature:s.plants.filter(isMature).length,living:s.plants.filter(p=>p.alive).length,money:numberOf(s.ledger.balance),result:s.result,day:s.day,
    maximumTime,pauses:s.pauses,ledger:s.ledger,plants:s.plants,crates:s.crates,state:s,nav};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  for(const profile of ['olderMale','olderFemale','youngMale','youngFemale']){
    const {ledger,plants,crates,state,nav,...report}=simulateOpening(profile,Number(process.argv[2]??8));
    console.log(JSON.stringify(report));
  }
}
