import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createOpeningWorld} from './check_opening.mjs';import * as Game from '../src/simulation/game.js';
import {centerServicePoint} from '../src/world/centers.js';import {serialize} from '../src/persistence/snapshots.js';import {skyNight} from '../src/rendering/sky.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function createLoadingVisualFixtures(){
 const {s,nav}=createOpeningWorld({seed:712,biome:'gran-canon',culture:'mapungubwe',slotId:'qa-loading-visual-712'});
 const commands=[{operation:'createOpeningWorld/placeStructure',seed:712,biome:s.biome,culture:s.culture}],center=s.structures[0],origin=centerServicePoint(center,s,.8);
 let planted=null;
 for(let dz=-6;dz<=6&&!planted;dz+=1.5)for(let dx=5;dx<=12&&!planted;dx+=1.5){
  const x=Math.round((center.x+dx)/1.5)*1.5,z=Math.round((center.z+dz)/1.5)*1.5;
  if(nav.placement(x,z,.4).valid&&nav.path(origin,{x,z},.28,null,true)&&nav.path({x,z},origin,.28,null,true)){
   Game.plant(s,'loading-visual-paid-yuca','yuca',x,z,nav);planted=s.plants.at(-1);commands.push({operation:'Game.plant',id:'loading-visual-paid-yuca',species:'yuca',x,z});
  }
 }
 if(!planted)throw Error('No reachable paid crop for visual fixture');
 Game.openInitialHiring(s);Game.hire(s,'loading-visual-paid-hire',{youngFemale:1});commands.push({operation:'Game.openInitialHiring/Game.hire',id:'loading-visual-paid-hire',selection:{youngFemale:1}});
 // Match existing directed visibility fixture's tutorial presentation bypass,
 // not a clock, resource or simulation outcome override.
 s.tutorial.step='done';commands.push({operation:'directed tutorial presentation skipped',scope:'same as original visibility fixture'});
 const record=label=>{
  Game.pause(s,'menu');commands.push({operation:'Game.pause',reason:'menu',time:s.time});
  const snapshot=serialize(s),alive=s.plants.filter(p=>p.alive);
  if(!alive.some(p=>p.id===planted.id&&p.species==='yuca'))throw Error('Paid crop did not survive legal fixture progression');
  return {fixture:{slotId:s.slotId,snapshot,scope:'Paid cassava and worker, normal commands/ticks; no injected maize, money, growth, RNG or clock. Menu paused for native Continue.'},provenance:{label,seed:s.seed,biome:s.biome,culture:s.culture,terrainVersion:s.terrainVersion,day:s.day,time:s.time,elapsed:s.elapsed,skyNight:skyNight(s),snapshotBytes:Buffer.byteLength(snapshot),snapshotSha256:hash(snapshot),commands:structuredClone(commands),plants:s.plants.map(p=>({id:p.id,species:p.species,alive:p.alive,growth:p.growth,x:p.x,z:p.z})),balance:s.ledger.balance,tutorialPresentationBypass:true}};
 };
 if(skyNight(s)!==0)throw Error('Day record not genuinely daytime');const day=record('day');
 Game.resume(s,'menu');commands.push({operation:'Game.resume',reason:'menu'});let ticks=0;
 while(skyNight(s)<.99){if(s.result||s.day!==1||ticks>=4000)throw Error('Legal night progression unavailable');Game.tick(s,.1,nav);ticks++;}
 commands.push({operation:'Game.tick',seconds:.1,count:ticks,scope:'normal simulation progression, no time assignment'});
 const night=record('night');return {day,night};
}
export function writeLoadingVisualFixtures(directory){
 mkdirSync(directory,{recursive:true});const records=createLoadingVisualFixtures();
 for(const [label,record] of Object.entries(records)){for(const [suffix,value] of [['fixture',record.fixture],['provenance',record.provenance]])writeFileSync(join(directory,label+'-'+suffix+'.json'),JSON.stringify(value,null,2)+'\n');}
 return records;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const directory=resolve(process.argv[2]??'.cache/loading-visual-fixtures');const result=writeLoadingVisualFixtures(directory);
 console.log(JSON.stringify(Object.fromEntries(Object.entries(result).map(([label,row])=>[label,{time:row.provenance.time,skyNight:row.provenance.skyNight,sha256:row.provenance.snapshotSha256,plants:row.provenance.plants.length}]))));
}
