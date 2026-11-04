import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
test('reconciles state and events before releasing terrain and acknowledging',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),order=[],port={postMessage:m=>order.push(['ack',m.sequence]),close(){},start(){}},stop=observePresentationGameEvents(state,e=>order.push(['event',e.id])),stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm:sequence=>order.push(['terrain',sequence])},onConfirmed:m=>order.push(['confirmed',m.sequence])});
 emit(authority,'Test');const event=authority.events.at(-1);port.onmessage({data:{kind:'publication',session:'s',tick:false,firstSequence:1,publication:{session:'s',sequence:1,snapshot:serialize(authority),events:[event]}}});
 assert.deepEqual(order,[['event',event.id],['terrain',1],['confirmed',1],['ack',1]]);assert.equal(stream.status().sequence,1);stream.dispose();stop();
});
test('invalid sequence closes only the presentation stream',()=>{
 const state=fixture();let failure;const port={postMessage(){throw Error('unexpected ack');},close(){this.closed=true;},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){throw Error('unexpected terrain');}},onError:error=>{failure=error;}});
 port.onmessage({data:{kind:'publication',session:'s',tick:true,firstSequence:2,publication:{session:'s',sequence:2,snapshot:serialize(state),events:[]}}});assert.match(failure.message,/gap/);assert.equal(stream.status().closed,true);assert.equal(port.closed,true);
});
