// Read retained snapshot into a separate native diagnostic world; never overwrite
// a campaign or treat this paid-next-day preflight as a campaign continuation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from './check_opening.mjs';
import {createNativeFundedDefensePolicy} from './native-funded-defense-policy.mjs';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
const [input,out]=process.argv.slice(2);assert(input&&out&&!existsSync(out),'Retained input and new output required');
const bytes=readFileSync(input),sha=b=>createHash('sha256').update(b).digest('hex'),s=deserialize(gunzipSync(bytes).toString());
const {nav}=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture});nav.setState(s);
const cash=numberOf(s.ledger.balance);assert.equal(s.day,8);assert.equal(s.time,0);
Game.hire(s,'diagnostic-day8-paid-hire',{olderFemale:11});assert.equal(cash-numberOf(s.ledger.balance),330);
const policy=createNativeFundedDefensePolicy({startDay:6}),before=serialize(s);
const paidCommands=policy.act(s,nav,{command:k=>'diagnostic-'+k,reserve:330});
assert.equal(paidCommands,0);assert.equal(serialize(s),before);assert.equal(sha(readFileSync(input)),sha(bytes));
const paths=['src/simulation/game.js','src/world/navigation.js','tools/native-funded-defense-policy.mjs','tools/probe-funded-defense-snapshot.mjs'];
mkdirSync(out,{recursive:true});const report={scope:'Cloned day8 after actual paid11-worker native contract. Geometric feasibility diagnostic only; not a continued campaign, physical interception or accepted balance.',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),input,inputSHA256:sha(bytes),nativeHirePaid:330,cashAfterHire:numberOf(s.ledger.balance),decision:policy.report().history[0],sourceHashes:Object.fromEntries(paths.map(p=>[p,sha(readFileSync(p))]))};
writeFileSync(out+'/diagnosis.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.decision));
