import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardianNarrationReceiver,createGuardianNarrationSender} from '../src/rendering/guardian-worker-narration.js';

test('media clock is sampled at a bounded cadence with immediate pause and seek',()=>{
 let now=0;const messages=[],sender=createGuardianNarrationSender({clock:()=>now,send:value=>messages.push(value)}),record={id:'guide',path:'audio/guide.ogg'},audio={currentTime:1,paused:false,ended:false,playbackRate:1};
 assert.equal(sender.update(record,audio),true);now=30;audio.currentTime=1.03;assert.equal(sender.update(record,audio),false);
 now=100;audio.currentTime=1.1;assert.equal(sender.update(record,audio),true);
 now=105;audio.paused=true;assert.equal(sender.update(record,audio),true);
 now=110;audio.currentTime=2;assert.equal(sender.update(record,audio),true);
 now=115;assert.equal(sender.update(null,null),true);
 now=1000;assert.equal(sender.update(null,null),false);
 assert.deepEqual(messages.map(message=>message.sequence),[1,2,3,4,5]);assert.equal(messages.at(-1).narration,null);
 sender.dispose();assert.equal(sender.update(record,audio),false);
});

test('receiver ignores stale generations and extrapolates only while playing and briefly',()=>{
 let now=0;const receiver=createGuardianNarrationReceiver({clock:()=>now}),record={id:'guide',path:'audio/guide.ogg'};
 assert.equal(receiver.accept({sequence:3,narration:{record,audio:{currentTime:2,paused:false,ended:false,playbackRate:2}}}),true);
 now=100;assert.equal(receiver.sample().audio.currentTime,2.2);now=1000;assert.equal(receiver.sample().audio.currentTime,2.5);
 assert.equal(receiver.accept({sequence:2,narration:null}),false);assert.equal(receiver.sample().record.id,'guide');
 assert.equal(receiver.accept({sequence:4,narration:{record,audio:{currentTime:3,paused:true,ended:false,playbackRate:1}}}),true);
 now=1500;assert.equal(receiver.sample().audio.currentTime,3);
 assert.equal(receiver.accept({sequence:5,narration:null}),true);assert.deepEqual(receiver.sample(),{record:null,audio:null});
 receiver.dispose();assert.equal(receiver.accept({sequence:6,narration:null}),false);
});

test('voice replacement and playback end are sent without waiting for the sampling interval',()=>{
 let now=0;const messages=[],sender=createGuardianNarrationSender({clock:()=>now,send:value=>messages.push(value)});
 const audio={currentTime:0,paused:false,ended:false,playbackRate:1};
 sender.update({id:'one',path:'audio/one.ogg'},audio);
 now=1;sender.update({id:'two',path:'audio/two.ogg'},audio);
 now=2;audio.ended=true;sender.update({id:'two',path:'audio/two.ogg'},audio);
 assert.deepEqual(messages.map(message=>[message.narration?.record.id,message.narration?.audio?.ended]),[['one',false],['two',false],['two',true]]);
});

test('buffering stops clock extrapolation until media has enough data',()=>{
 let now=0;const messages=[],sender=createGuardianNarrationSender({clock:()=>now,send:value=>messages.push(value)}),receiver=createGuardianNarrationReceiver({clock:()=>now});
 const record={id:'one',path:'audio/one.ogg'},audio={currentTime:2,paused:false,ended:false,playbackRate:1,readyState:4};sender.update(record,audio);receiver.accept(messages.at(-1));
 now=10;audio.readyState=2;sender.update(record,audio);receiver.accept(messages.at(-1));now=110;assert.equal(receiver.sample().audio.currentTime,2);
 audio.readyState=4;sender.update(record,audio);receiver.accept(messages.at(-1));now=210;assert.equal(receiver.sample().audio.currentTime,2.1);
});
