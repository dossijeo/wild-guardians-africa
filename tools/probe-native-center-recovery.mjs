// Branch diagnostic on a copy of a retained native state; not a campaign win.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';

const [input,output]=process.argv.slice(2);
if(!input||!output||existsSync(output))throw Error('Requires retained state.json.gz and fresh output');
const bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString());
const sourceHash=createHash('sha256').update(bytes).digest('hex');
assert.equal(s.result,null);assert.equal(s.raid,null);assert(s.pauses.includes('hiring'));
const center=s.structures.find(c=>c.kind==='center'&&c.status==='intact'&&c.hp<c.maxHp);
assert(center,'No surviving damaged center');
const before={day:s.day,time:s.time,cash:numberOf(s.ledger.balance),hp:center.hp,live:s.plants.filter(p=>p.alive).length,
 deliveredCrates:s.crates.filter(c=>c.delivered).length,undeliveredCrates:s.crates.filter(c=>!c.delivered).length};
const file=`public/content/biome-${BIOME_IDS[s.biome]}.json`;
const nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(file)).profile);nav.setState(s);
const price=Game.repairCost(center),expectedCost=Number((BigInt(price.n)+BigInt(price.d)-1n)/BigInt(price.d));
assert(Number.isSafeInteger(expectedCost));
Game.hire(s,'recovery-probe-hire',{olderFemale:1});
Game.requestRepair(s,'recovery-probe-repair',center.id);
assert.equal(numberOf(s.ledger.balance),before.cash-30,'Request must not prepay repair');
const start=s.elapsed;
let event;
while(s.elapsed-start<120&&!event&&!s.result&&!s.pauses.length){
 const prior=s.workers.map(w=>({x:w.x,z:w.z}));Game.tick(s,.1,nav);
 for(const [i,w] of s.workers.entries())assert(nav.segmentClear(prior[i],w,.28,null,true),'Worker clipped during physical recovery');
 event=s.events.find(e=>e.type==='RepairApplied'&&e.targetId===center.id);
}
assert(event,'Bounded native repair did not finish');assert.equal(event.repair.paidCoins,expectedCost);
assert.equal(center.hp,center.maxHp);assert.equal(numberOf(s.ledger.balance),before.cash-30-expectedCost);
assert.equal(Object.keys(s.ledger.entries).filter(id=>id===event.repair.paymentId).length,1);
assert.equal(createHash('sha256').update(readFileSync(input)).digest('hex'),sourceHash,'Original snapshot changed');
assert.doesNotThrow(()=>serialize(s));
const paths=['tools/probe-native-center-recovery.mjs','src/simulation/game.js','src/world/navigation.js',file];
const hashes=Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const result={input,inputSha256:sourceHash,sourceHashes:hashes,before,elapsed:s.elapsed-start,repair:event.repair,
 after:{cash:numberOf(s.ledger.balance),hp:center.hp,live:s.plants.filter(p=>p.alive).length,result:s.result},
 scope:'Single real hiring and physical paid center repair on a copied retained state. No funding override, fabricated movement, campaign continuation or survival acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
