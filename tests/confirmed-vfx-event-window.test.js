import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedVfxEventWindow} from '../src/rendering/confirmed-vfx-event-window.js';

const hit=(n,at=10)=>({id:`event-${n}`,type:'AnimalLogicalHit',attackId:`attack-${n}`,presentation:{elapsed:at,animal:{x:1,z:2},target:{x:0,z:0}}});
test('retains an ordered complete batch beyond the 200-event ring and deduplicates',()=>{
 const window=createConfirmedVfxEventWindow({lifetime:4}),events=Array.from({length:201},(_,i)=>hit(i+1));
 const ring=events.slice(1);window.sync(10,[],ring);const result=window.sync(10,events,ring);
 assert.equal(result.length,201);assert.equal(result[0].id,'event-1');assert.equal(result.at(-1).id,'event-201');
 events[0].presentation.animal.x=999;assert.equal(window.sync(10,events,[])[0].presentation.animal.x,1);
});
test('the window follows simulation time across pauses and expires without reviving old ring events',()=>{
 const window=createConfirmedVfxEventWindow({lifetime:4}),event=hit(1);
 assert.equal(window.sync(10,[event],[]).length,1);for(let i=0;i<20;i++)assert.equal(window.sync(10,[],[]).length,1);
 assert.equal(window.sync(13.99,[],[]).length,1);assert.equal(window.sync(14,[],[event]).length,0);
 assert.equal(window.sync(14,[{id:'event-2',type:'AnimalLogicalHit'}],[]).length,0);
});
test('legacy unnumbered events remain scoped to the existing state ring',()=>{
 const window=createConfirmedVfxEventWindow({lifetime:4}),old={type:'AnimalLogicalHit',presentation:{elapsed:1}};
 assert.deepEqual(window.sync(1,[],[old]),[old]);assert.deepEqual(window.sync(1,[],[]),[]);
});
