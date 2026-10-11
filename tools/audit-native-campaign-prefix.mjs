// Read-only: compare a longer native observation with its retained short pilot.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const [shortDirectory,longDirectory,output]=process.argv.slice(2);
if(!shortDirectory||!longDirectory||!output||existsSync(output))throw Error('Short directory, long directory and fresh output required');
const read=(dir,name)=>JSON.parse(readFileSync(dir+'/'+name,'utf8'));
const short=read(shortDirectory,'report.json'),long=read(longDirectory,'report.json');
for(const dir of [shortDirectory,longDirectory])assert(['observed-horizon','observed-native-defeat'].includes(read(dir,'receipt.json').status),'Terminal native observation required');
assert.equal(short.result,null,'Short pilot must have survived its observed horizon');
assert(long.daily.length>=short.daily.length);
for(const key of ['strategy','labourPolicy','seed','biome','culture'])assert.deepEqual(short[key],long[key],key);
assert.deepEqual(short.policy,long.policy,'Identical player policy required');
assert.deepEqual(read(shortDirectory,'source.json').sourceHashes,read(longDirectory,'source.json').sourceHashes,'All frozen source hashes must match');
assert.deepEqual(short.daily,long.daily.slice(0,short.daily.length),'All complete daily rows must match exactly');
const result={status:'verified',shortDirectory,longDirectory,identicalCompleteDays:short.daily.length,allFrozenSourceHashesIdentical:true,
 scope:'Exact retained daily prefix and source equality; not proof of long-term balance, human activity or GPU performance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
