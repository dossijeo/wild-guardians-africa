// Native saved-farm regression against the previous failure-capacity policy.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';

const sourceUrl=new URL('../src/world/navigation.js',import.meta.url),source=readFileSync(sourceUrl,'utf8');
const needle='if(!result){if(this.failedPaths.size>=50000)evictOldest(this.failedPaths);this.failedPaths.add(key);}';
assert.equal(source.split(needle).length,2);
const reference=source.replace(needle,needle.replace('evictOldest(this.failedPaths)','this.failedPaths.clear()'))
  .replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${new URL(specifier,sourceUrl).href}'`:match);
const referencePath=resolve('.cache/failure-cache-canyon/reference-navigation.mjs');
mkdirSync(dirname(referencePath),{recursive:true});writeFileSync(referencePath,reference);
const {Navigation:Previous}=await import(pathToFileURL(referencePath).href);
const input='docs/qa/intensive-canyon-10/state.json',raw=readFileSync(input,'utf8'),worlds=[];
for(const [name,Class] of [['previous',Previous],['retained',Navigation]]){
  const state=deserialize(raw);assert.equal(state.biome,'gran-canon');assert.equal(state.day,11);
  assert.equal(state.result,null);assert.deepEqual(state.pauses,['hiring']);
  const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`,'utf8')).profile;
  const nav=new Class(state.seed,state.biome,profile);nav.setState(state);
  const living=state.plants.filter(p=>p.alive).length,staff=Math.max(1,Math.min(Math.ceil(living/12),Math.floor(numberOf(state.ledger.balance)/30)));
  Game.hire(state,'qa-failure-cache-hire',{olderFemale:staff});
  const stats={pathQueries:0,searches:0,maxFailureKeys:0},find=nav.findPath,path=nav.path;
  nav.findPath=function(...args){stats.searches++;return find.apply(this,args);};
  nav.path=function(...args){stats.pathQueries++;const result=path.apply(this,args);stats.maxFailureKeys=Math.max(stats.maxFailureKeys,this.failedPaths.size);return result;};
  worlds.push({name,state,nav,stats,staff});
}
const trajectory=createHash('sha256');
assert.equal(serialize(worlds[0].state),serialize(worlds[1].state));
for(let tick=0;tick<100;tick++){
  for(const world of worlds){Game.tick(world.state,.1,world.nav);assert.equal(world.state.result,null);assert.equal(world.state.pauses.length,0);}
  const a=serialize(worlds[0].state),b=serialize(worlds[1].state);
  assert.equal(a,b,`Complete state changed at tick ${tick}`);trajectory.update(a+'\n');
}
const sha=s=>createHash('sha256').update(s).digest('hex');
const report={scope:'100 native Gran Cañón ticks from a historical day-11 hiring checkpoint, paid ordinary hiring, same complete state at every tick. Reference changes only capacity eviction back to the previous full-clear policy. No placement, water, speed, route, money or state overrides. Not current 100-night replay, runtime overflow attribution, rendering, RAM or a performance benchmark.',input,inputSha256:sha(raw),ticks:100,stepSeconds:.1,trajectorySha256:trajectory.digest('hex'),sourceHashes:{navigation:sha(source),reference:sha(reference),game:sha(readFileSync(new URL('../src/simulation/game.js',import.meta.url)))},worlds:worlds.map(({name,state,stats,staff})=>({name,staff,...stats,finalStateSha256:sha(serialize(state)),alive:state.plants.filter(p=>p.alive).length,money:numberOf(state.ledger.balance)}))};
const output=resolve(process.argv[2]??'.cache/failure-cache-canyon/report.json');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
