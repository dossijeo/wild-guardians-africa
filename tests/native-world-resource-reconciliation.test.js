import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileNativeWorldResources} from '../src/world/native-world-boundary.js';

const previous={version:1,authorityEpoch:'native/1',nativeSession:1,ticket:3,effectiveTime:10};
function fixture(){return {previous:{...previous},publication:{sequence:20,elapsed:12,nativeWorldResources:[{version:1,kind:6,worldBoundary:{...previous,ticket:4,effectiveTime:11},chunks:[{cx:0,cz:0}],removed:[]}]},
 admitted:{version:1,sequence:20,epoch:'terrain/1',canonicalPropsUnmasked:true,changes:[{cx:0,cz:0,revision:2,removed:false,capturedAt:11}]}};}

test('native resource reconciliation copies the committed identity only for matching applied resources',()=>{
 const f=fixture(),boundary=reconcileNativeWorldResources(f);assert.deepEqual(boundary,f.publication.nativeWorldResources[0].worldBoundary);assert(Object.isFrozen(boundary));
 f.publication.nativeWorldResources[0].worldBoundary.ticket=99;assert.equal(boundary.ticket,4);assert.equal(f.previous.ticket,3);
});

for(const kind of [6,7,8,9,10,11])test(`canonical native resource family ${kind} requires its actual graphical operation`,()=>{
 const f=fixture(),r=f.publication.nativeWorldResources[0];r.kind=kind;if(kind===7){r.removed=r.chunks;r.chunks=[];f.admitted.changes[0].removed=true;}
 assert.equal(reconcileNativeWorldResources(f).ticket,4);f.admitted.changes[0].removed=!f.admitted.changes[0].removed;assert.throws(()=>reconcileNativeWorldResources(f),/do not match/);
});

test('multiple physical commits in one publication retain order and match the final operation on each chunk',()=>{
 const f=fixture(),first=f.publication.nativeWorldResources[0];first.kind=10;first.chunks.push({cx:1,cz:0});
 f.publication.nativeWorldResources.push({version:1,kind:7,worldBoundary:{...first.worldBoundary,ticket:5,effectiveTime:11.5},chunks:[],removed:[{cx:0,cz:0}]});
 f.admitted.changes=[{cx:0,cz:0,revision:3,removed:true,capturedAt:12},{cx:1,cz:0,revision:1,removed:false,capturedAt:11}];assert.equal(reconcileNativeWorldResources(f).ticket,5);
 f.admitted.changes[0].capturedAt=11;assert.throws(()=>reconcileNativeWorldResources(f),/do not match/);
});

test('empty confirmed preparation can identify a canonical commit with no visible changes',()=>{
 const f=fixture();f.publication.nativeWorldResources[0].chunks=[];f.admitted={...f.admitted,changes:[],empty:true};assert.equal(reconcileNativeWorldResources(f).ticket,4);
 delete f.admitted.empty;assert.throws(()=>reconcileNativeWorldResources(f),/lack/);f.admitted=null;assert.throws(()=>reconcileNativeWorldResources(f),/lack/);
});

test('legacy publications keep their contract while unstamped terrain changes after a native commit fail closed',()=>{
 assert.equal(reconcileNativeWorldResources({publication:{sequence:1},admitted:{changes:[{}]}}),null);
 assert.deepEqual(reconcileNativeWorldResources({previous,publication:{sequence:2},admitted:{changes:[]}}),previous);
 assert.throws(()=>reconcileNativeWorldResources({previous,publication:{sequence:2},admitted:{changes:[{}]}}),/without a native/);
});

for(const change of [{ticket:3},{authorityEpoch:'other'},{nativeSession:2},{effectiveTime:9},{effectiveTime:13}])test(`stale, foreign or future native boundary is rejected: ${JSON.stringify(change)}`,()=>{
 const f=fixture();Object.assign(f.publication.nativeWorldResources[0].worldBoundary,change);assert.throws(()=>reconcileNativeWorldResources(f),/stale or incompatible/);
});

test('ACK-like, old, incomplete or masked resource proofs cannot grant a native frame identity',()=>{
 for(const change of [null,{version:2},{sequence:19},{epoch:''},{canonicalPropsUnmasked:false},{canonicalPropsUnmasked:undefined},{changes:[]},{empty:true}]){
  const f=fixture();f.admitted=change===null?null:{...f.admitted,...change};assert.throws(()=>reconcileNativeWorldResources(f),/lack/);
 }
 for(const change of [{cx:1},{revision:0},{removed:true},{capturedAt:10.9},{capturedAt:13},{capturedAt:undefined}]){
  const f=fixture();Object.assign(f.admitted.changes[0],change);assert.throws(()=>reconcileNativeWorldResources(f),/do not match/);
 }
});

test('unsupported native visuals and conflicting or future metadata are explicit failures',()=>{
 for(const kind of [3,4,5,...Array.from({length:11},(_,i)=>13+i)]){const f=fixture();f.publication.nativeWorldResources[0].kind=kind;assert.throws(()=>reconcileNativeWorldResources(f),/family/);}
 for(const change of [{version:2},{future:true},{chunks:null},{removed:[{cx:0,cz:0}]}]){const f=fixture();Object.assign(f.publication.nativeWorldResources[0],change);assert.throws(()=>reconcileNativeWorldResources(f));}
 const f=fixture();f.publication.nativeWorldResources[0].chunks.push({cx:0,cz:0});assert.throws(()=>reconcileNativeWorldResources(f),/Conflicting/);
});

test('solid addition history requires the exact committed attestation and an empty terrain batch',()=>{
 const f=fixture(),record=f.publication.nativeWorldResources[0];
 record.kind=2;record.chunks=[];f.admitted={...f.admitted,changes:[],empty:true};
 const reference={kind:'native-barrier-addition-reference',version:1,worldBoundary:record.worldBoundary,sourceControlSequence:1,additions:[{entityId:'wall-1',x:30,z:40,halfX:1,halfZ:.5,yaw:0,passMask:0}]};
 assert.throws(()=>reconcileNativeWorldResources(f),/attestation/);
 record.nativeBarrierAdditionBinding={kind:'native-barrier-addition-attestation',version:1,reference,preparedReference:reference,nativeIds:[7]};
 assert.deepEqual(reconcileNativeWorldResources(f),record.worldBoundary);
 record.chunks=[{cx:0,cz:0}];assert.throws(()=>reconcileNativeWorldResources(f),/solid addition/);record.chunks=[];
 record.worldBoundary={...record.worldBoundary,ticket:9};assert.throws(()=>reconcileNativeWorldResources(f),/committed boundary/);
});


for(const kind of [12,24,25])test(`body-only native stop${kind} requires an applied empty prepared boundary and rejects invented geometry`,()=>{
 const f=fixture(),record=f.publication.nativeWorldResources[0];record.kind=kind;record.chunks=[];f.admitted={...f.admitted,changes:[],empty:true,nativeWorldBoundary:record.worldBoundary};assert.deepEqual(reconcileNativeWorldResources(f),record.worldBoundary);
 delete f.admitted.empty;assert.throws(()=>reconcileNativeWorldResources(f),/lack/);f.admitted.empty=true;
 for(const side of ['chunks','removed']){record[side]=[{cx:0,cz:0}];assert.throws(()=>reconcileNativeWorldResources(f),/body-only/);record[side]=[];}
});

test('Farm24 reconciliation requires the applied batch and an ordered acquired world identity',()=>{
 const f=fixture(),record=f.publication.nativeWorldResources[0];record.kind=24;record.chunks=[];f.admitted={...f.admitted,changes:[],empty:true,nativeWorldBoundary:record.worldBoundary};
 for(const change of [{sequence:19},{canonicalPropsUnmasked:false},{empty:undefined},{changes:[{cx:0,cz:0}]}])assert.throws(()=>reconcileNativeWorldResources({...f,admitted:{...f.admitted,...change}}),/lack/);
 for(const change of [{ticket:3},{authorityEpoch:'foreign'},{nativeSession:2},{effectiveTime:9},{effectiveTime:13}])assert.throws(()=>reconcileNativeWorldResources({...f,publication:{...f.publication,nativeWorldResources:[{...record,worldBoundary:{...record.worldBoundary,...change}}]}}),/stale or incompatible/);
 assert.deepEqual(reconcileNativeWorldResources(f),record.worldBoundary);assert.equal(f.previous.ticket,3);
});
