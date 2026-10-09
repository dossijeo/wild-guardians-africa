import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {retainHordeCase} from '../tools/horde-defense-comparison.mjs';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';

const root=mkdtempSync(join(tmpdir(),'wg-horde-evidence-'));
const provenance={sourceHashes:{fixture:'original'},scenario:'controlled evidence boundary, no campaign'};
const readSources=()=>({fixture:'original'});
const read=(dir,name)=>JSON.parse(gunzipSync(readFileSync(join(dir,name))));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function native(){const {s,nav}=createOpeningWorld();return {state:s,nav,raids:[],raidFacts:[],commands:[],counts:{},scope:'Actual paid native opening, no campaign'};}
function verifyHashes(dir,receipt){for(const [file,expected] of Object.entries(receipt.payloadHashes))assert.equal(sha(readFileSync(join(dir,file))),expected);}

test('Post-simulation audit throw retains real paid state and pre-audit report',async()=>{
 const dir=join(root,'audit-throw'),result=native(),before=serialize(result.state);
 const receipt=await retainHordeCase(dir,'responsible',provenance,{simulate:async()=>result,readSources,audit:()=>{
  assert.equal(gunzipSync(readFileSync(join(dir,'native-state.json.gz'))).toString(),before);
  assert.equal(read(dir,'native-report.json.gz').scope,result.scope);
  throw Error('controlled strict audit failure');
 }});
 assert.equal(receipt.status,'incomplete');assert.equal(receipt.error.message,'controlled strict audit failure');
 assert.equal(gunzipSync(readFileSync(join(dir,'state.json.gz'))).toString(),before);
 assert.equal(read(dir,'report.json.gz').scope,result.scope);assert.deepEqual(read(dir,'report.json.gz').raids,[]);
 assert.equal(read(dir,'native-report.json.gz').error,undefined);assert.equal(receipt.sourceUnchanged,true);verifyHashes(dir,receipt);
});
test('Simulation error retains original partial state and error without running auditor',async()=>{
 const dir=join(root,'partial'),partial=native(),before=serialize(partial.state),failure=Error('original transport failure');failure.partialReport=partial;
 const receipt=await retainHordeCase(dir,'responsible',provenance,{simulate:async()=>{throw failure;},readSources,audit:()=>assert.fail('Auditor cannot run after simulation failure')});
 assert.equal(receipt.status,'incomplete');assert.equal(receipt.error.message,failure.message);
 assert.equal(gunzipSync(readFileSync(join(dir,'native-state.json.gz'))).toString(),before);assert.equal(read(dir,'report.json.gz').scope,partial.scope);verifyHashes(dir,receipt);
});
test('Pre-state exception remains incomplete without inventing a native state',async()=>{
 const dir=join(root,'before-state');const receipt=await retainHordeCase(dir,'responsible',provenance,{simulate:async()=>{throw TypeError('original opening failure');},readSources});
 assert.equal(receipt.status,'incomplete');assert.equal(receipt.error.name,'TypeError');assert.equal(receipt.error.message,'original opening failure');
 assert.equal(existsSync(join(dir,'state.json.gz')),false);assert.equal(existsSync(join(dir,'native-state.json.gz')),false);verifyHashes(dir,receipt);
});
test('Source change preserves audit error and marks both report and receipt incomplete',async()=>{
 const dir=join(root,'changed');const receipt=await retainHordeCase(dir,'responsible',provenance,{simulate:async()=>native(),readSources:()=>({fixture:'changed'}),audit:()=>{throw Error('strict audit failure');}});
 assert.equal(receipt.sourceUnchanged,false);assert.equal(receipt.status,'incomplete');assert.equal(receipt.error.precedingError.message,'strict audit failure');
 assert.deepEqual(receipt.error.files,['fixture']);assert.deepEqual(read(dir,'report.json.gz').error,receipt.error);verifyHashes(dir,receipt);
});
test('False gates remain false after successful auditing and raw report precedes annotations',async()=>{
 const dir=join(root,'false-gates');const receipt=await retainHordeCase(dir,'responsible',provenance,{simulate:async()=>native(),readSources,audit:()=>({responsible100Accepted:false,strictGlobalActivityBelow25:false}),summarize:()=>({scope:'controlled summary'})});
 assert.equal(receipt.status,'native-terminal-audited');assert.equal(receipt.gates.responsible100Accepted,false);assert.equal(receipt.gates.strictGlobalActivityBelow25,false);
 assert.equal(read(dir,'native-report.json.gz').gates,undefined);assert.equal(read(dir,'report.json.gz').gates.strictGlobalActivityBelow25,false);verifyHashes(dir,receipt);
});
