import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardianCueLoader} from '../src/ui/guardian-cue-bank.js';
test('packaged languages share one fetch and preserve the requested record',async()=>{
 const records={ES_01:{id:'ES_01',mouthCues:[{start:0,end:1,value:'A'}]},EN_01:{id:'EN_01',mouthCues:[]}},calls=[];
 const load=createGuardianCueLoader({packed:true,fetchJson:async url=>{calls.push(url);return {version:1,records};}});
 const [es,en]=await Promise.all([load('game/content/guardian/lipsync/ES_01.json'),load('game/content/guardian/lipsync/EN_01.json')]);
 assert.equal(es,records.ES_01);assert.equal(en,records.EN_01);assert.deepEqual(calls,['game/content/guardian/lipsync/bank.json']);
 await assert.rejects(load('game/content/guardian/lipsync/ES_99.json'),/Missing packaged/);
});
test('a failed bank fetch can retry and development keeps separate offline records',async()=>{
 let calls=0;const load=createGuardianCueLoader({packed:true,fetchJson:async()=>{if(++calls===1)throw Error('offline');return {version:1,records:{ES_01:{id:'ES_01'}}};}});
 await assert.rejects(load('content/guardian/lipsync/ES_01.json'),/offline/);assert.equal((await load('content/guardian/lipsync/ES_01.json')).id,'ES_01');assert.equal(calls,2);
 const separate=createGuardianCueLoader({fetchJson:async url=>url});assert.equal(await separate('local/ES_01.json'),'local/ES_01.json');
});
