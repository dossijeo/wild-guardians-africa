// Native wall removal creates a diagnostic control; no direct geometry edits.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
const [input,output]=process.argv.slice(2),snapshotPath=output?.replace(/\.json$/,'-state.json.gz');
assert(input&&output?.endsWith('.json')&&!existsSync(output)&&!existsSync(snapshotPath));
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString());
const profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json',nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(profilePath)).profile);nav.setState(s);
const protectedInputs=JSON.stringify({rng:s.rng,plants:s.plants,nightPlan:s.nightPlan,time:s.time,elapsed:s.elapsed,workers:s.workers,suppressed:s.suppressed});
const opening=numberOf(s.ledger.balance),removed=[];
for(const wall of s.structures.filter(w=>w.kind==='wall')){
 const id='control-remove-'+wall.id,before=numberOf(s.ledger.balance);
 assert(Game.removeWall(s,id,wall.id,nav));
 const refund=numberOf(s.ledger.entries[id]);assert.equal(numberOf(s.ledger.balance)-before,refund);
 removed.push({id:wall.id,hp:wall.hp,maxHp:wall.maxHp,refund,commandId:id});
}
assert.equal(s.structures.filter(w=>w.kind==='wall').length,0);
assert.equal(JSON.stringify({rng:s.rng,plants:s.plants,nightPlan:s.nightPlan,time:s.time,elapsed:s.elapsed,workers:s.workers,suppressed:s.suppressed}),protectedInputs);
const closing=numberOf(s.ledger.balance),refunds=removed.reduce((n,w)=>n+w.refund,0);assert.equal(closing,opening+refunds);
assert.equal(hash(readFileSync(input)),hash(bytes));const saved=serialize(s);assert.equal(serialize(deserialize(saved)),saved);
const paths=['tools/prepare-native-canyon-no-wall-control.mjs','src/simulation/game.js','src/simulation/rules.js','src/simulation/money.js','src/world/navigation.js','src/persistence/snapshots.js',profilePath];
const result={status:'native-wall-removal-control-prepared',input,inputSha256:hash(bytes),snapshotPath,opening,closing,refunds,removed,protectedInputsUnchanged:true,
 sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),
 scope:'All 34 walls removed through normal commands with actual refunds. Crops, RNG, planned night, workers, suppression and simulated time unchanged. Cash differs by genuine refunds; no shield, magic, spending or hiring is performed during the compared night. This isolates immediate physical protection, not cumulative strategy profitability.'};
writeFileSync(snapshotPath,gzipSync(Buffer.from(saved)));writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,opening,closing,refunds,wallsRemoved:removed.length}));
