import test from 'node:test';
import assert from 'node:assert/strict';
import {RAID_NOTICE_TEXT} from '../src/simulation/raid-notice.js';
import {visibleNotices} from '../src/app/notices.js';
const warning={id:'warning',text:RAID_NOTICE_TEXT,target:'animal-1'};
test('finished raids do not leave a live attack warning on the HUD or change saved history',()=>{
 const state={messages:[warning,{id:'funds',text:'Fondos insuficientes',target:null}],raid:null},before=JSON.stringify(state);
 assert.deepEqual(visibleNotices(state),[state.messages[1]]);assert.equal(JSON.stringify(state),before);
});
test('the current raid warning persists until the whole raid ends, including after its first animal exits',()=>{
 const state={messages:[warning],raid:{animals:[{id:'animal-1',status:'gone'},{id:'animal-2',status:'attacking'}]}};
 assert.deepEqual(visibleNotices(state),[warning]);state.raid=null;assert.deepEqual(visibleNotices(state),[]);
});
test('a later raid hides the previous raid alert and displays the matching current alert in chronological order',()=>{
 const current={...warning,id:'current',target:'animal-3'},other=[1,2,3,4].map(id=>({id:String(id),text:'Aviso '+id,target:null}));
 const state={messages:[warning,...other,current],raid:{animals:[{id:'animal-3'}]}};
 assert.deepEqual(visibleNotices(state),[other[2],other[3],current]);
});
