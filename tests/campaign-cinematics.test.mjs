import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {newGame} from '../src/simulation/game.js';
import {dueCinematicAct,finishCinematicAct,initializeCinematicProgress} from '../src/app/campaign-cinematics.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('each tenth successful night shows one act before hiring or victory',()=>{
  const state=newGame({seed:712});
  for(let act=1;act<=10;act++){
    state.completedNights=act*10;state.day=state.completedNights+1;
    state.pauses=act===10?[]:['hiring'];state.result=act===10?'victory':null;
    assert.equal(dueCinematicAct(state),act);
    finishCinematicAct(state,act);
    assert.equal(dueCinematicAct(state),0);
    assert.equal(deserialize(serialize(state)).cinematicSeenAct,act);
  }
});

test('defeat, postgame and pre-milestone nights cannot start cinematics',()=>{
  const state=newGame({seed:123});state.completedNights=10;state.day=11;
  assert.equal(dueCinematicAct(state),0);
  state.pauses=['hiring'];state.result='defeat';assert.equal(dueCinematicAct(state),0);
  state.result=null;state.postgame=true;assert.equal(dueCinematicAct(state),0);
  state.postgame=false;state.completedNights=9;assert.equal(dueCinematicAct(state),0);
});

test('older saves do not replay chapters already passed',()=>{
  const state=newGame({seed:2026});delete state.cinematicSeenAct;
  state.completedNights=40;state.day=41;state.pauses=['hiring'];
  assert.equal(initializeCinematicProgress(state),4);
  assert.equal(dueCinematicAct(state),0);
  state.completedNights=50;state.day=51;
  assert.equal(dueCinematicAct(state),5);
});

test('all ten acts include five narrated, layered, local scenes',async()=>{
  const manifest=JSON.parse(await readFile(resolve(root,'public/cinematics/manifest.json'),'utf8'));
  assert.equal(manifest.acts.length,10);
  const references=new Set();
  for(const [index,act] of manifest.acts.entries()){
    assert.equal(act.number,index+1);assert.equal(act.afterNight,(index+1)*10);
    assert.equal(act.scenes.length,5);
    for(const scene of act.scenes){
      assert.ok(scene.narrationRaw&&scene.narrationRawEN);
      assert.ok(scene.layers.length>=1);
      for(const layer of scene.layers){assert.ok(layer.motion);references.add(layer.image);}
      for(const lang of ['ES','EN']){assert.ok(scene.audio[lang].durationSeconds>0);references.add(scene.audio[lang].file);}
    }
  }
  assert.equal(references.size,205);
  for(const path of references){
    assert.match(path,/^(layers|audio)\/[a-z0-9-]+\.(webp|opus)$/);
    assert.ok((await stat(resolve(root,'public/cinematics',path))).size>0,path);
  }
});
