// Audit input contracts, not a synthetic economic campaign.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

function audit(report,options={}){
 const dir=mkdtempSync(join(tmpdir(),'wild-guardians-disabled-defense-')),output=join(dir,'audit.json');
 writeFileSync(join(dir,'receipt.json'),JSON.stringify({status:'observed-horizon',options}));
 writeFileSync(join(dir,'report.json'),JSON.stringify(report));
 const child=spawnSync(process.execPath,['tools/audit-native-defense-allocation.mjs',dir,output],{encoding:'utf8',timeout:30000});
 return {child,output};
}
const fixture=()=>({policy:{defend:false,defenseFunding:'rolling'},defense:null,labourHistory:[],daily:[{day:1,money:0,finance:{opening:0,closing:0,walls:0,entries:[]}}]});
test('disabled native defense verifies no active policy and no actual wall spending',()=>{
 const {child,output}=audit(fixture());assert.equal(child.status,0,child.stderr);
 const result=JSON.parse(readFileSync(output));assert.equal(result.defenseActive,false);assert.equal(result.mode,'rolling');assert.equal(result.purchases,0);
});
test('disabled defense cannot hide wall payments or carry an active policy',()=>{
 for(const mutate of [r=>{r.daily[0].finance.walls=10;},r=>{r.daily[0].finance.entries.push({id:'wall',coins:-10,category:'walls'});},r=>{r.defense={funding:'rolling',history:[]};}]){
  const report=fixture();mutate(report);const {child,output}=audit(report);assert.notEqual(child.status,0);assert.equal(existsSync(output),false);
 }
});
test('active native defense still rejects a mismatched funding mode',()=>{
 const report=fixture();report.policy.defend=true;report.defense={funding:'contour',history:[]};
 const {child,output}=audit(report);assert.notEqual(child.status,0);assert.equal(existsSync(output),false);
});


test('next-piece earmark must agree across launch, report protocol and active defense',()=>{
 const report=fixture();report.policy.defend=true;report.policy.defensePieceReserve=1;
 report.protocol={defensePieceReserve:1};report.defense={funding:'rolling',pieceReserve:1,history:[]};
 // The helper intentionally uses historical launch options: this mismatch cannot pass.
 const {child,output}=audit(report);assert.notEqual(child.status,0);assert.equal(existsSync(output),false);
});

test('unknown or contour-only next-piece earmarks cannot be certified',()=>{
 for(const mutate of [r=>{r.policy.defensePieceReserve=2;},r=>{r.policy.defensePieceReserve=1;r.policy.defenseFunding='contour';}]){
  const report=fixture();mutate(report);const {child,output}=audit(report);assert.notEqual(child.status,0);assert.equal(existsSync(output),false);
 }
});


test('declared rolling next-piece earmark is accepted when all authoritative records agree',()=>{
 const report=fixture();report.policy.defend=true;report.policy.defensePieceReserve=1;
 report.protocol={defensePieceReserve:1};report.defense={funding:'rolling',pieceReserve:1,history:[]};
 const {child,output}=audit(report,{defensePieceReserve:1});assert.equal(child.status,0,child.stderr);
 assert.equal(JSON.parse(readFileSync(output)).pieceReserve,1);
 for(const mutate of [r=>{r.protocol.defensePieceReserve=0;},r=>{r.defense.pieceReserve=0;}]){
  const changed=structuredClone(report);mutate(changed);const rejected=audit(changed,{defensePieceReserve:1});
  assert.notEqual(rejected.child.status,0);assert.equal(existsSync(rejected.output),false);
 }
});
