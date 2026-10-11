// Read-only comparison of retained complete days across one declared entry fix.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const [oldDirectory,newDirectory,output]=process.argv.slice(2);
if(!oldDirectory||!newDirectory||!output||existsSync(output))throw Error('Interrupted old campaign, terminal new campaign and fresh output required');
const read=(d,n)=>JSON.parse(readFileSync(d+'/'+n,'utf8'));
const oldReceipt=read(oldDirectory,'receipt.json'),newReceipt=read(newDirectory,'receipt.json');
assert(['stopped-early-calibration','incomplete-harness-error'].includes(oldReceipt.status));
assert(['observed-horizon','observed-native-defeat'].includes(newReceipt.status));
const old=read(oldDirectory,'source.json'),current=read(newDirectory,'source.json');
const inputs=s=>Object.fromEntries(Object.entries(s.arguments).filter(([k])=>!['days','out','stop-file'].includes(k)));
assert.deepEqual(inputs(old),inputs(current),'Only observation horizon and evidence paths may differ');
assert.deepEqual(Object.keys(old.sourceHashes).sort(),Object.keys(current.sourceHashes).sort());
const changed=Object.keys(old.sourceHashes).filter(k=>old.sourceHashes[k]!==current.sourceHashes[k]);
assert.deepEqual(changed,['src/simulation/raids.js']);
const path=changed[0],cwd=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitBytes=revision=>execFileSync('git',['show',revision+':'+path],{cwd,maxBuffer:4*1024*1024});
assert.equal(old.sourceHashes[path],hash(gitBytes('45016ead^')),'Old source must be the exact pre-retry implementation');
assert.equal(current.sourceHashes[path],hash(gitBytes('45016ead')),'New source must be the exact bounded-retry implementation');
const partial=read(oldDirectory,'partial.json'),rows=partial.receipts.daily,report=read(newDirectory,'report.json');
assert(rows.length>0&&report.daily.length>=rows.length);
assert.equal(rows.length,oldReceipt.completedDailyRows);
assert.deepEqual(rows,report.daily.slice(0,rows.length),'All completed historical daily rows must remain exact');
assert.equal(report.completedNights,newReceipt.completedNights);
assert.equal(report.result,newReceipt.result);
assert.equal(report.nativeEvidence.status,'verified');assert.equal(report.raidEvidence.status,'verified');
assert.deepEqual(report.raidEvidence.issues,[]);
const result={status:'verified-interrupted-complete-prefix',oldDirectory,newDirectory,oldStatus:oldReceipt.status,
 identicalCompleteDays:rows.length,newCompletedNights:report.completedNights,
 sourceDifferences:[{path,before:old.sourceHashes[path],after:current.sourceHashes[path],verifiedCommit:'45016ead'}],
 scope:'Only retained completed days are compared. The sole source delta is the exact bounded Canyon entry retry. Excludes the interrupted day, identical-source balance, long-term survival, human activity and performance acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
