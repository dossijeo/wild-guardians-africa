// CPU diagnosis on retained copies; never rewrites a campaign or claims GPU cost.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';

const [directory,output]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Retained stopped campaign and fresh output required');
const receipt=JSON.parse(readFileSync(join(directory,'receipt.json'),'utf8'));
assert.equal(receipt.status,'stopped-early-calibration');
const source=JSON.parse(readFileSync(join(directory,'source.json'),'utf8'));
for(const [path,hash] of Object.entries(source.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(resolve(path))).digest('hex'),hash,'Frozen source changed: '+path);
const bytes=readFileSync(join(directory,'partial-state.json.gz')),text=gunzipSync(bytes).toString('utf8');
const partial=JSON.parse(readFileSync(join(directory,'partial.json'),'utf8'));
const make=()=>{
 const s=deserialize(text);assert(!s.result&&!s.raid,'Live daylight snapshot required');
 const profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json','utf8')).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const calls={path:0,segmentClear:0,walkable:0,placement:0};
 for(const key of Object.keys(calls)){const method=nav[key].bind(nav);nav[key]=(...args)=>{calls[key]++;return method(...args);};}
 return {s,nav,calls};
};
const tick=make(),startTick=performance.now();Game.tick(tick.s,.2,tick.nav);const tickMs=performance.now()-startTick;
const quote=make(),beforeQuote=serialize(quote.s),candidate=partial.receipts.defense.planned;
assert(candidate,'Retained partial contour required');
const startQuote=performance.now(),plan=Game.quoteWallChain(quote.s,partial.receipts.defense.material,candidate.points,quote.nav,{smooth:false,snap:false}),quoteMs=performance.now()-startQuote;
assert.equal(serialize(quote.s),beforeQuote,'Quote changed native state');
assert.equal(createHash('sha256').update(readFileSync(join(directory,'partial-state.json.gz'))).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
const result={directory,status:'observed-cpu-diagnostic',snapshotSha256:createHash('sha256').update(bytes).digest('hex'),toolSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),fullFrozenSourcesMatch:true,
 start:{day:partial.day,time:partial.time},tick:{milliseconds:tickMs,calls:tick.calls,elapsedAdvanced:tick.s.elapsed-deserialize(text).elapsed},
 quote:{milliseconds:quoteMs,calls:quote.calls,pieces:plan.pieces.length,updates:plan.updates.length},
 scope:'One cold-navigation native 0.2-second tick and one native quote on separate restored copies. No campaign result or frame/GPU/performance acceptance; source profile and JIT/caches differ from a running world. Original snapshot and quote state unchanged.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
