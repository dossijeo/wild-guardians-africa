import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';import {deserialize,serialize} from '../src/persistence/snapshots.js';import {numberOf} from '../src/simulation/money.js';
const base=pathToFileURL(resolve('src/simulation/game.js')),hash=v=>createHash('sha256').update(v).digest('hex');
async function module(path){const source=path.endsWith('.gz')?gunzipSync(readFileSync(path)).toString():readFileSync(path,'utf8');return {source,game:await import('data:text/javascript;base64,'+Buffer.from(source.replace(/from (['"])(\.[^'"]+)\1/g,(_m,_q,path)=>'from '+JSON.stringify(new URL(path,base).href))).toString('base64'))};}
const reference=await module(process.argv[2]),candidate=await module(process.argv[3]);
const raw=gunzipSync(readFileSync('docs/qa/intensive-mangrove-shield-100/state.json.gz')),saved=deserialize(raw.toString()),profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[saved.biome]+'.json')).profile;
const live=saved.plants.filter(p=>p.alive).length,staff=Math.max(1,Math.min(Math.ceil(live/12),Math.floor(numberOf(saved.ledger.balance)/30))),worlds={};
for(const [key,value] of Object.entries({reference,candidate})){const s=deserialize(raw.toString()),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);value.game.continuePostgame(s);value.game.hire(s,'qa-center-check-hire',{olderFemale:staff});worlds[key]={s,nav,game:value.game,timing:[]};}
const result={scope:'Archived historical victory continued with paid workers, actual Navigation and unchanged gameplay; not a current-balance100-night result or rendered frametime. Frozen game.js sources; other imports shared.',referenceSha256:hash(reference.source),candidateSha256:hash(candidate.source),snapshotSha256:hash(raw),live,staff,comparisons:0};
for(let step=0;step<60;step++){
 for(const key of step%2?['candidate','reference']:['reference','candidate']){const w=worlds[key],t=performance.now();w.game.tick(w.s,.1,w.nav);if(step>=20)w.timing.push(performance.now()-t);}
 const a=serialize(worlds.reference.s),b=serialize(worlds.candidate.s);assert.equal(a,b);result.comparisons++;result.finalHash=hash(b);
}
for(const key of ['reference','candidate']){const timing=worlds[key].timing;result[key]={samples:timing.length,medianMs:[...timing].sort((a,b)=>a-b)[timing.length>>1],timing};}
writeFileSync(process.argv[4],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
