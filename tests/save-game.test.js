import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {saveGame} from '../src/app/save-game.js';

test('failed staging, backup or primary writes never announce success or lose the previous playable save',()=>{
 for(const failAt of [':pending',':backup','primary']){
  const data=new Map();let failing=false;
  const storage={getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k),setItem:(k,v)=>{
   if(failing&&(failAt==='primary'?!k.endsWith(':pending')&&!k.endsWith(':backup'):k.endsWith(failAt)))throw Error('Quota exceeded');data.set(k,v);
  }};
  const repo=new SaveRepository(storage),s=Game.newGame({seed:712,slotId:'save-error'});repo.save(s);s.day=2;
  const errors=[];failing=true;assert.equal(saveGame(s,repo,{confirm:true,onError:e=>errors.push(e)}),false);
  assert.deepEqual(errors,['No se pudo guardar la partida: Quota exceeded']);assert.equal(s.messages.length,0);
  assert.equal(repo.load(s.slotId).day,1);assert.equal(s.day,2);
  assert.equal(storage.getItem(repo.key(s.slotId)+':pending'),null,'failed writes must release their unused staging copy');
  failing=false;assert.equal(saveGame(s,repo,{confirm:true,onError:e=>errors.push(e)}),true);
  assert.equal(repo.load(s.slotId).day,2);assert.equal(s.messages.filter(m=>m.text==='Partida guardada.').length,1);
 }
});
test('autosave is silent; an explicit confirmation is emitted only after a successful write',()=>{
 const s=Game.newGame({seed:712,slotId:'saved-confirmation'}),writes=[];
 const repo={save:state=>writes.push(serialize(state))};
 assert.equal(saveGame(s,repo),true);assert.equal(s.messages.length,0);
 assert.equal(saveGame(s,repo,{confirm:true}),true);assert.equal(JSON.parse(writes[1]).messages.length,0);
 assert.equal(s.messages[0].text,'Partida guardada.');assert.equal(saveGame(null,repo),false);assert.equal(writes.length,2);
});
