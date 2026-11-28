import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {copyRestoredWallRepairClock,copyRestoredWallRepairDeclaration,restoredWallRepairReference,captureRestoredWallRepairs} from '../src/world/restored-wall-repair-reference.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
const entity={id:'structure-749',kind:'wall',material:'zarzas',gate:false,hp:100,maxHp:100,status:'intact',wallPresentation:{from:0,to:1,at:10}},reference=restoredWallRepairReference(entity),declaration={version:1,authorityEpoch:'epoch-a',restoredAt:10.1,reference};
function control(declarations=[declaration]){const c=createNativeRouteControl({authorityEpoch:'epoch-a',initialTime:10.1,restoredWallRepairs:declarations});c.acceptClock({protocolVersion:2,clockVersion:1,authorityEpoch:'epoch-a',nativeSession:1,clockSequence:1,intentSequence:0,committedThrough:10.1,rate:1,paused:true,reanchor:true,anchorAbsoluteMs:0,anchorLogicalTime:10.1},{baseline:true});return c;}

test('only the authority cold declaration admits its exact visual owner and retirement revokes it',()=>{
 const c=control(),lease=c.admitRestoredWallRepair(reference);assert.equal(lease.end,10.48);assert(lease.isCurrent());
 for(const changed of [{entityId:'structure-750'},{at:9.99},{from:.1},{maxHp:101},{material:'piedra'}])assert.throws(()=>c.admitRestoredWallRepair({...reference,...changed}),/declaration/);
 const absent=control([]);assert.throws(()=>absent.admitRestoredWallRepair(reference),/declaration/);absent.dispose();
 c.dispose();assert.equal(lease.isCurrent(),false);assert.throws(()=>c.admitRestoredWallRepair(reference),/declaration/);
});

test('a baseline rejects borrowed epochs, duplicate owners and unbounded restored curves',()=>{
 for(const changed of [{authorityEpoch:'epoch-b'},{restoredAt:10.5},{restoredAt:9.99}])assert.throws(()=>control([{...declaration,...changed}]),/Repair/);
 assert.throws(()=>control([declaration,declaration]),/owner/);
 assert.throws(()=>control([declaration,{...declaration,reference:{...reference,from:.1}}]),/owner/);
 const before=structuredClone(entity);assert.equal(captureRestoredWallRepairs({structures:[entity],elapsed:10.1},'epoch-a').length,1);assert.deepEqual(entity,before);
 for(const value of [{...entity,gate:true},{...entity,hp:0},{...entity,status:'ruined'}])assert.equal(captureRestoredWallRepairs({structures:[value],elapsed:10.1},'epoch-a').length,0);
 assert.equal(captureRestoredWallRepairs({structures:[entity],elapsed:10.48},'epoch-a').length,0);
});

test('a draw producer cannot forge a declaration, origin, second permission or arbitrary coverage',()=>{
 const clock={semantic:'relative',epoch:10,nativeRestoredWallRepair:reference};assert.deepEqual(copyRestoredWallRepairClock(clock),clock);
 for(const changed of [{declaration},{restoredRepairRecord:{}},{resourceEnd:999},{nativeAction:{}},{executionEpoch:9},{period:1},{semantic:'absolute'},{epoch:9}])assert.throws(()=>copyRestoredWallRepairClock({...clock,...changed}),/clock/);
});

test('picking requires the actually submitted finite age in the current authority epoch',()=>{
 const age=floorFloat32(.2),binding={nativeRestoredWallRepair:reference,declaration,semantic:'relative',epoch:10,relativeTime:age,elapsed:10+age};
 const frame={sequence:1,authorityEpoch:'epoch-a',clockElapsed:10.2,presentationElapsed:floorFloat32(10.1),worldBoundary:null,bindings:[binding]};
 // Compute from the same double subtraction as the Host.
 binding.relativeTime=floorFloat32(frame.clockElapsed-reference.at);binding.elapsed=reference.at+binding.relativeTime;
 assert.equal(captureNativeRoutePickFrame({nativeRouteFrame:frame}).getRestoredWallRepairElapsed(reference),binding.relativeTime);
 for(const changed of [{relativeTime:.49},{epoch:11},{declaration:{...declaration,authorityEpoch:'epoch-b'}},{nativeBarrierAddition:{}},{elapsed:10}])assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:{...frame,bindings:[{...binding,...changed}]}}),/Repair/);
 assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:{...frame,bindings:[]}}).getRestoredWallRepairElapsed(reference),/submitted age/);
});
