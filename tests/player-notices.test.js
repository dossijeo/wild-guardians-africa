import test from 'node:test';
import assert from 'node:assert/strict';
import {RAID_NOTICE_TEXT} from '../src/simulation/raid-notice.js';
import {visibleNotices,NoticeLifetime,tutorialCoversNotice} from '../src/app/notices.js';
import {RESERVE_MESSAGE} from '../src/simulation/budget.js';
const warning={id:'warning',text:RAID_NOTICE_TEXT,target:'animal-1'};
test('finished raids do not leave a live attack warning on the HUD or change saved history',()=>{
 const state={messages:[warning,{id:'funds',text:'Fondos insuficientes',target:null}],raid:null},before=JSON.stringify(state);
 assert.deepEqual(visibleNotices(state),[state.messages[1]]);assert.equal(JSON.stringify(state),before);
});
test('raid tutorial replaces the same raid warning permanently without deleting saved history',()=>{
 for(const id of ['mechanic.first-raid','magic.shield','reminder.shield']){
  const state={messages:[warning],raid:{animals:[{id:'animal-1'}]}},before=JSON.stringify(state),notices=new NoticeLifetime();
  assert.deepEqual(notices.visible(state,0,{id,text:'Explicación de la incursión'}),[]);
  assert.deepEqual(notices.visible(state,1),[]);assert.equal(JSON.stringify(state),before);
 }
});
test('unrelated events wait behind the tutorial and get their full readable lifetime afterwards',()=>{
 const state={messages:[{id:'season',text:'Noche húmeda'}],raid:null},notices=new NoticeLifetime(15);
 assert.deepEqual(notices.visible(state,0,{id:'basic.work',text:'Aprende a regar'}),[]);
 assert.deepEqual(notices.visible(state,30,{id:'basic.work',text:'Aprende a regar'}),[]);
 assert.deepEqual(notices.visible(state,31),state.messages);
 assert.deepEqual(notices.visible(state,45.99),state.messages);assert.deepEqual(notices.visible(state,46),[]);
});
test('the defeat explanation suppresses its identical event; unrelated errors remain available',()=>{
 const state={messages:[{id:'defeat',text:'Sin recursos'},{id:'repair',text:'Reparación cancelada'}],raid:null},notices=new NoticeLifetime();
 assert.deepEqual(notices.visible(state,0,{id:'result.defeat',text:'Sin recursos'}),[]);
 assert.deepEqual(notices.visible(state,10),[state.messages[1]]);
});

test('closing guardian animation keeps unrelated notices waiting without consuming readable time',()=>{
 const state={messages:[{id:'weather',text:'Noche húmeda'}]},notices=new NoticeLifetime();
 notices.visible(state,0,{id:'basic.work',text:'Aprende a regar'});
 assert.deepEqual(notices.visible(state,10,null,{tutorialVisible:true}),[]);
 assert.deepEqual(notices.visible(state,11,null,{tutorialVisible:false}),state.messages);
 assert.deepEqual(notices.visible(state,25.99),state.messages);
 assert.deepEqual(notices.visible(state,26),[]);
});

test('reserve explanation covers the matching command error only when actually presented',()=>{
 const state={messages:[]},message={text:RESERVE_MESSAGE},presentation={id:'budget.reserve',text:RESERVE_MESSAGE};
 assert.equal(tutorialCoversNotice(state,message,presentation),true);
 assert.equal(tutorialCoversNotice(state,message,null),false,'a hidden tutorial cannot replace feedback in a modal');
 assert.equal(tutorialCoversNotice(state,{text:'Terreno inclinado'},presentation),false);
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
