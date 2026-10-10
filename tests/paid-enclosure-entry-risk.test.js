import test from 'node:test';
import assert from 'node:assert/strict';
import {paidEnclosureEntryDiagnostic} from '../tools/diagnose_paid_enclosure_entry.mjs';
test('Paid native closed enclosure permits internal camera/nearFarm/prepared candidates and close legal external alternative',()=>{
 const r=paidEnclosureEntryDiagnostic();assert.equal(r.sourceCount,394);assert.equal(r.snapshotUnchangedByEntry,true);assert.equal(r.closedFaces,1);assert.equal(r.nominalAndPaidPieces,17);assert.equal(r.gates,1);assert.deepEqual(r.paid,{centre:800,crop:5,walls:170,hire:30,balance:495});assert.equal(r.radius,1.1);assert.equal(r.snapshot.time,0);assert.equal(r.snapshot.elapsed,0);
 const center=r.results.find(q=>q.id==='inside-camera'),crop=r.results.find(q=>q.id==='inside-crop-target'),outside=r.results.find(q=>q.id==='outside-camera');
 // Retain the first control's negative result instead of changing its claim.
 assert.equal(center.descriptions.camera.entries[0].inside,false);assert.equal(center.descriptions.prepared.entries[0].inside,false);assert.equal(center.descriptions.nearFarm.entries[0].inside,true);assert.equal(center.descriptions.nearFarm.routes[0].cropAttack,true);
 for(const mode of ['camera','prepared']){const d=crop.descriptions[mode];assert.equal(d.entries[0].inside,true);assert.equal(d.exits[0].inside,true);assert.ok(d.entries[0].distanceToCamera<20);assert.deepEqual(d.routes[0],{entryWalkable:true,exitWalkable:true,escapeForward:true,escapeReverse:true,cropAttack:true,wallAttackIds:d.routes[0].wallAttackIds});assert.ok(d.routes[0].wallAttackIds.length>0);}
 assert.deepEqual(crop.descriptions.camera.entries,crop.descriptions.prepared.entries);
 for(const mode of ['camera','prepared']){const d=outside.descriptions[mode];assert.equal(d.entries[0].inside,false);assert.equal(d.routes[0].cropAttack,false);assert.ok(d.routes[0].wallAttackIds.length>0);assert.equal(d.routes[0].escapeForward,true);assert.equal(d.routes[0].escapeReverse,true);assert.ok(d.entries[0].distanceToCamera<20);}
});
