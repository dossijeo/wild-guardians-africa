// Read-only replay check for the exact unfunded QA budget gate only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [beforeDirectory,afterDirectory,output]=process.argv.slice(2);
if(!beforeDirectory||!afterDirectory||!output||existsSync(output))throw Error('Two terminal campaigns and fresh output required');
const read=(dir,name)=>JSON.parse(readFileSync(dir+'/'+name,'utf8'));
const oldHashes=read(beforeDirectory,'source.json').sourceHashes,newHashes=read(afterDirectory,'source.json').sourceHashes;
assert.deepEqual(Object.keys(oldHashes).sort(),Object.keys(newHashes).sort());
const differences=Object.keys(oldHashes).filter(k=>oldHashes[k]!==newHashes[k]);
assert.deepEqual(differences,['tools/native-funded-defense-policy.mjs'],'Only the unfunded QA gate may differ');
const sha=path=>createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex');
assert.equal(oldHashes[differences[0]],sha('tools/native-funded-defense-policy-before-budget-gate.mjs'));
assert.equal(newHashes[differences[0]],sha(differences[0]));
for(const dir of [beforeDirectory,afterDirectory])assert(['observed-horizon','observed-native-defeat'].includes(read(dir,'receipt.json').status));
const before=read(beforeDirectory,'report.json'),after=read(afterDirectory,'report.json');
for(const key of ['strategy','labourPolicy','seed','biome','culture','policy'])assert.deepEqual(before[key],after[key],key);
assert(after.daily.length>=before.daily.length);
assert.deepEqual(before.daily,after.daily.slice(0,before.daily.length),'Every retained complete daily row must match');
const result={status:'verified-budget-gate-only-replay',beforeDirectory,afterDirectory,identicalCompleteDays:before.daily.length,
 sourceDifferences:differences.map(path=>({path,before:oldHashes[path],after:newHashes[path]})),
 scope:'Exact daily replay across one explicitly verified QA budget-check optimization. Not identical-source campaign comparison, long-term balance, human activity or performance acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
