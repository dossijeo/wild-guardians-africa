import test from 'node:test';
import assert from 'node:assert/strict';
import {NoticeLifetime,visibleNotices} from '../src/app/notices.js';
import {RAID_NOTICE_TEXT} from '../src/simulation/raid-notice.js';
import {projectConfirmedNotices,confirmedNoticeFocus,validateConfirmedNoticeProjection} from '../src/simulation/confirmed-notice-projection.js';

test('compact notice view preserves tutorial suppression, raid filtering and readable lifetime',()=>{
 const state={messages:[{id:'raid',text:RAID_NOTICE_TEXT,target:'beast'},{id:'magic',text:'Muralla mágica',target:'wall',category:'awakening-threat'},{id:'weather',text:'Noche húmeda',target:null}],plants:[],structures:[{id:'wall',x:3,z:4,hp:9}],workers:[],raid:{animals:[{id:'beast',x:5,z:6,species:'hiena'},{id:'unrelated',x:9,z:9}]}};
 const view=projectConfirmedNotices(state),original=new NoticeLifetime(),projected=new NoticeLifetime(),options={allowAwakeningUrgent:true};assert.equal(validateConfirmedNoticeProjection(view),view);assert.deepEqual(view.raid.animals,[{id:'beast'}]);assert.deepEqual(view.targets,[{id:'wall',x:3,z:4},{id:'beast',x:5,z:6}]);assert.throws(()=>validateConfirmedNoticeProjection({...view,targets:[{id:'other',x:0,z:0}]}),/Invalid/);
 for(const [time,presentation] of [[0,{id:'mechanic.first-raid',text:'Explicación'}],[2,{id:'mechanic.first-raid',text:'Explicación'}],[4,null],[20,null]])assert.deepEqual(projected.visible(view,time,presentation,options),original.visible(state,time,presentation,options));
 projected.dismiss('weather');original.dismiss('weather');assert.deepEqual(projected.visible(view,21),original.visible(state,21));state.raid=null;assert.deepEqual(visibleNotices(projectConfirmedNotices(state)),visibleNotices(state));
});

test('notice focus follows original entity priority and falls back to the confirmed location',()=>{
 const state={messages:[{id:'one',text:'A',target:'x',location:{x:30,z:40}},{id:'two',text:'B',target:'missing',location:{x:7,z:8}},{id:'three',text:'C',target:null}],plants:[{id:'x',x:1,z:2,theta:.2,distance:9}],structures:[{id:'x',x:100,z:200}],workers:[],raid:null};const view=projectConfirmedNotices(state);
 assert.deepEqual(confirmedNoticeFocus(view,'one'),{id:'x',x:1,z:2,theta:.2,distance:9});assert.deepEqual(confirmedNoticeFocus(view,'two'),{x:7,z:8});assert.equal(confirmedNoticeFocus(view,'three'),null);assert.equal(confirmedNoticeFocus(view,'unknown'),null);assert.throws(()=>projectConfirmedNotices({...state,messages:[{id:'bad'}]}),/Invalid notice/);
});
