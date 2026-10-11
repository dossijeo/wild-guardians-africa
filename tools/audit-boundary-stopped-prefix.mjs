// Explicit boundary-only regression comparison against completed stopped rows.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [oldDirectory,newDirectory,output]=process.argv.slice(2);
if(!oldDirectory||!newDirectory||!output||existsSync(output))throw Error('Stopped old campaign, terminal new campaign and fresh output required');
const read=(d,n)=>JSON.parse(readFileSync(d+'/'+n,'utf8'));
assert.equal(read(oldDirectory,'receipt.json').status,'stopped-early-calibration');
assert(['observed-horizon','observed-native-defeat'].includes(read(newDirectory,'receipt.json').status));
const old=read(oldDirectory,'source.json'),current=read(newDirectory,'source.json');
const argumentsOf=s=>Object.fromEntries(Object.entries(s.arguments).filter(([k])=>!['days','out','stop-file'].includes(k)));
assert.deepEqual(argumentsOf(old),argumentsOf(current),'Only observation horizon and output paths may differ');
assert.deepEqual(Object.keys(old.sourceHashes).sort(),Object.keys(current.sourceHashes).sort());
const changed=Object.keys(old.sourceHashes).filter(k=>old.sourceHashes[k]!==current.sourceHashes[k]);
assert.deepEqual(changed,['src/world/boundary-faces.js']);
const hash=p=>createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex');
assert.equal(old.sourceHashes[changed[0]],hash('tests/fixtures/boundary-faces-reference.js'));
assert.equal(current.sourceHashes[changed[0]],hash(changed[0]));
const rows=read(oldDirectory,'partial.json').receipts.daily,report=read(newDirectory,'report.json');
assert(rows.length>0&&report.daily.length>=rows.length);
assert.deepEqual(rows,report.daily.slice(0,rows.length));
const result={status:'verified-stopped-complete-prefix',oldDirectory,newDirectory,identicalCompleteDays:rows.length,
 sourceDifferences:changed.map(path=>({path,before:old.sourceHashes[path],after:current.sourceHashes[path]})),
 scope:'Completed retained rows only, excluding the stopped in-progress day. One verified boundary graph optimization is allowed. Not campaign completion, identical-source balance, human activity or performance acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
