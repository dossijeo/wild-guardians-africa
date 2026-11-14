import test from 'node:test';
import assert from 'node:assert/strict';
import {rejectedFramePreparations,closePreparationImages} from '../src/rendering/remote-frame-preparations.js';
test('resource recovery preserves initialization order and discards obsolete render commands',()=>{
 const write={method:'writeBuffer',args:[]},image={method:'copyExternalImageToTexture',args:[{}]},prep={texturePreparation:{version:1},__remoteCommands:[]},draw={__remoteCommands:[{method:'beginRenderPass'}]};
 const input=[write,{method:'submit',args:[[draw,prep]]},image],result=rejectedFramePreparations(input,b=>b===prep);
 assert.deepEqual(result,[write,{method:'submit',args:[[prep]]},image]);assert.deepEqual(input[1].args[0],[draw,prep]);
});
test('readbacks, compute and undeclared copies require recovery rather than partial replay',()=>{
 for(const method of ['beginComputePass','copyBufferToBuffer','copyTextureToTexture','clearBuffer','resolveQuerySet'])assert.equal(rejectedFramePreparations([{method:'submit',args:[[{__remoteCommands:[{method}]}]]}],()=>true),null);
 assert.equal(rejectedFramePreparations([{method:'submit',args:[[{texturePreparation:{version:1},__remoteCommands:[]}]]}],()=>false),null);
});
test('discarding preparations closes each owned external image once',()=>{
 let closed=0;const source={close:()=>closed++},image={method:'copyExternalImageToTexture',args:[{source}]};closePreparationImages([image,image,{method:'writeBuffer',args:[]}]);assert.equal(closed,1);
});
