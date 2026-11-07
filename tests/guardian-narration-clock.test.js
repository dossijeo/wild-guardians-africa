import test from 'node:test';
import assert from 'node:assert/strict';
import {guardianNarrationAudio} from '../src/ui/guardian-narration-clock.js';

test('muted messages follow their cue clock without replacing real audio',()=>{
 const record={id:'ES_01'},audio={currentTime:2,paused:true,ended:false};
 assert.equal(guardianNarrationAudio({audio,status:'playing'},record,9),audio);
 assert.deepEqual(guardianNarrationAudio({status:'fallback',failure:'muted'},record,2.4),{currentTime:2.4,paused:false,ended:false});
 assert.equal(guardianNarrationAudio({status:'fallback',failure:'missing-clip'},record,2),null);
 assert.equal(guardianNarrationAudio({status:'fallback',failure:'muted'},null,2),null);
});
