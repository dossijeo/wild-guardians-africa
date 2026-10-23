import assert from 'node:assert/strict';
import {createCropSoilMasks} from '../src/rendering/crop-soil-mask.js';
const source=new Uint8Array(35*35*4);for(let i=0;i<source.length;i+=4){source[i]=211;source[i+1]=83;source[i+2]=151;source[i+3]=20;}
const original=new Uint8Array(source),texture={image:{data:source},needsUpdate:false},layer=createCropSoilMasks();
layer.attach(texture,0,0,[{x:0,z:0,alive:true}]);assert.deepEqual(source,original,'borrowed base memory untouched');assert.notDeepEqual(texture.image.data,original);
for(let i=0;i<source.length;i++)if(i%4!==3)assert.equal(texture.image.data[i],source[i]);
texture.needsUpdate=false;assert.equal(layer.flush([]),false);assert.equal(texture.needsUpdate,false,'no work absent invalidation');
layer.invalidate();layer.flush([]);assert.deepEqual(texture.image.data,original,'removed crop leaves no mark');
layer.invalidate();layer.flush([{x:0,z:0,alive:true}]);layer.release(texture);assert.equal(texture.image.data,source,'release restores borrowed owner');assert.equal(layer.size,0);
layer.dispose();layer.dispose();console.log('Base immutability, removal, idle flush and ownership checks passed');

// Material caches need change notifications only when the sampled bytes change.
const notifications=[],eventTexture={image:{data:new Uint8Array(original)},dispatchEvent:e=>notifications.push(e.type)};
const eventLayer=createCropSoilMasks();
eventLayer.attach(eventTexture,0,0,[{x:0,z:0,alive:true}]);
assert.deepEqual(notifications,['groundmaskchanged']);
eventLayer.invalidate();eventLayer.flush([{x:0,z:0,alive:true}]);
assert.equal(notifications.length,1,'unchanged bytes do not invalidate caches');
eventLayer.invalidate();eventLayer.flush([]);
assert.equal(notifications.length,2,'removed plant invalidates material');
eventLayer.release(eventTexture);
assert.equal(notifications.length,3,'restoring borrowed data notifies consumers');
