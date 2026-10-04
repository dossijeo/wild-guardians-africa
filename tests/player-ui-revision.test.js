import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {SaveRepository} from '../src/persistence/snapshots.js';
import {NoticeLifetime} from '../src/app/notices.js';
import {ToolSession} from '../src/ui/tool-session.js';
import {UiAudio} from '../src/audio/ui-audio.js';
function storage(){const data=new Map();return {data,get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('deleting a saved game removes its primary, backup and pending copies, preserving other games and settings',()=>{
 const st=storage(),repo=new SaveRepository(st),s=Game.newGame({slotId:'delete-me'}),other=Game.newGame({slotId:'keep-me'});
 repo.save(s);s.day=2;repo.save(s);repo.save(other);
 st.setItem(repo.key(s.slotId)+':pending',st.getItem(repo.key(s.slotId)));
 st.setItem('wild-guardians:settings','unchanged');const before=repo.load(other.slotId);
 repo.delete(s.slotId);assert.deepEqual(repo.list().map(x=>x.slotId),[other.slotId]);
 for(const suffix of ['',':backup',':pending'])assert.equal(st.getItem(repo.key(s.slotId)+suffix),null);
 assert.throws(()=>repo.load(s.slotId));assert.deepEqual(repo.load(other.slotId),before);
 assert.equal(st.getItem('wild-guardians:settings'),'unchanged');repo.delete(s.slotId);
 assert.throws(()=>repo.delete(''),/Ranura inválida/);
});
test('a failed removal propagates its error rather than reporting a deleted playable slot',()=>{
 const st=storage(),repo=new SaveRepository(st),s=Game.newGame({slotId:'removal-error'});repo.save(s);
 st.removeItem=()=>{throw Error('storage blocked');};
 assert.throws(()=>repo.delete(s.slotId),/storage blocked/);assert.equal(repo.load(s.slotId).slotId,s.slotId);
});
test('notices expire on real time, dismiss immediately, retain saved history, and do not restart on UI refresh',()=>{
 const state={messages:[{id:'a',text:'Noche húmeda'}],raid:null},before=structuredClone(state),notices=new NoticeLifetime(15);
 assert.deepEqual(notices.visible(state,100),state.messages);
 assert.deepEqual(notices.visible(state,114.99),state.messages);assert.deepEqual(notices.visible(state,115),[]);
 assert.deepEqual(notices.visible(state,500),[]);assert.deepEqual(state,before);
 state.messages.push({id:'b',text:'Crecimiento aumentado'});assert.deepEqual(notices.visible(state,500),[state.messages[1]]);
 notices.dismiss('b');assert.deepEqual(notices.visible(state,500.1),[]);
 assert.equal(state.messages.length,2);state.messages=[];notices.visible(state,501);assert.equal(notices.entries.size,0);
 notices.reset();assert.equal(notices.entries.size,0);
});
test('planting and construction remain armed until first successful placement; timeout resets only on placement',()=>{
 const session=new ToolSession();session.select({kind:'wall'},10);assert.equal(session.expired(1000),false);
 session.used(1000);assert.equal(session.expired(1009.99),false);session.used(1009);assert.equal(session.expired(1018.99),false);assert.equal(session.expired(1019),true);
 session.select({kind:'plant'},1020);assert.equal(session.expired(5000),false);
});
test('discarding a phantom context is silent and invalidates queued sound, while an actual close still plays once',()=>{
 const calls=[],audio=new UiAudio((id,options)=>calls.push({id,options}),()=>0);
 audio.surface('context','obsolete');audio.close({silent:true});
 assert.equal(calls[0].options.isCurrent(),false);audio.close();assert.deepEqual(calls.map(c=>c.id),['ui_panel_open']);
 audio.surface('panel','grow');audio.close();audio.close();assert.equal(calls.filter(c=>c.id==='ui_panel_close').length,1);
});
