import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createConfirmedSceneReceiver} from '../src/rendering/confirmed-scene-receiver.js';

test('heading changes commit with the ordered scene publication and never on rejection',()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),headings=new Map([['worker',1.2]]),world={state,mixers:new Map(),confirmedWorkerVisualHeadings:headings},receiver=createConfirmedSceneReceiver(state,'s',world),packet={session:'s',sequence:1,snapshot:serializeConfirmedState(state),events:[],physicsPose:null};
 assert.throws(()=>receiver.accept({...packet,presentationWorkerHeadings:[{id:'unknown',yaw:2}]}),/heading delta/);assert.equal(receiver.status().sequence,0);assert.equal(headings.get('worker'),1.2);
 assert.equal(receiver.accept({...packet,presentationWorkerHeadings:[{id:'worker',yaw:2}]}).accepted,true);assert.equal(headings.get('worker'),2);
 assert.equal(receiver.accept({...packet,presentationWorkerHeadings:[{id:'worker',yaw:3}]}).accepted,false);assert.equal(headings.get('worker'),2);
 assert.equal(receiver.accept({...packet,sequence:2}).accepted,true);assert.equal(headings.get('worker'),2);
 assert.equal(receiver.accept({...packet,sequence:3,presentationWorkerHeadings:[{id:'worker',yaw:null}]}).accepted,true);assert.equal(headings.has('worker'),false);
});
