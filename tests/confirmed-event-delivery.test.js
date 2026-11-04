import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {serializeConfirmedState,deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';
import {GameJuiceModel} from '../src/ui/game-juice-model.js';
import {AudioSystem} from '../src/audio/audio.js';

test('real receiver delivers all confirmed UI and audio events before the next frame',async()=>{
 const authority=Game.newGame({seed:712,slotId:'event-delivery'}),state=deserializeConfirmedState(serializeConfirmedState(authority)),model=new GameJuiceModel(state),audio=new AudioSystem({sfx:1,music:1}),sounds=[],rows=[],messages=[];
 audio.sound=async id=>sounds.push(id);audio.remember(state.events);
 const worker={postMessage:value=>messages.push(value),terminate(){}},world={createConfirmedReceiver(session){return createConfirmedStateReceiver(state,session);}};
 const runtime=createWorkerHostedRuntime({world,session:'s',clientOptions:{},runtimeOptions:{coalescePublications:true},workerFactory:()=>worker,onConfirmedEvents:events=>{rows.push(...model.consume(state,events));audio.process(events,{state});}});
 const start=runtime.start(),publish=(sequence,events)=>worker.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence,snapshot:serializeConfirmedState(authority),events}}});
 publish(1,[]);worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
 const events=[],stop=Game.observeGameEvents(authority,event=>events.push(structuredClone(event)));
 Game.emit(authority,'NightStarted');Game.emit(authority,'CropPlaced',{presentation:{x:1,z:2}});for(let i=0;i<203;i++)Game.emit(authority,'Unrelated');
 assert.equal(authority.events.length,200);assert.ok(!authority.events.some(event=>event.id===events[0].id));publish(2,events);
 const next=[];stop();const stopNext=Game.observeGameEvents(authority,event=>next.push(structuredClone(event)));Game.emit(authority,'RaidSpawned');stopNext();publish(3,next);
 assert.deepEqual(rows.filter(row=>row.kind==='overlay').map(row=>row.effect),['nightfall','raid']);assert.equal(sounds.filter(id=>id==='ui_buy').length,1);assert.equal(sounds.filter(id=>id==='game_attack_alert').length,1);
 assert.deepEqual(model.consume(state,[]),[]);audio.process([],{state});assert.equal(sounds.length,2);assert.equal(messages.at(-1).sequence,3);
 model.dispose();runtime.dispose();
});
