import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';

test('a retained native chunk can remain resident after its visual group is removed',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'native-visual-residency'});
 try{const [key]=opening.loaded.keys(),[cx,cz]=key.split(',').map(Number),core=opening.session.core,previous=core.currentChunk();opening.session.stream.retention.setDemand([key]);opening.loaded.delete(key);assert.equal(opening.session.stream.releaseChunk(cx,cz),0);assert.equal(opening.loaded.has(key),false);assert.ok(core.selectChunk(cx,cz)>=0,'retained chunk is still native resident');if(previous)core.selectChunk(previous.cx,previous.cz);}
 finally{opening.dispose();}
});
