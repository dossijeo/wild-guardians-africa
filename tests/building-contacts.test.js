import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeContacts} from '../src/rendering/contacts.js';
import {rasterBuildingContacts} from '../src/rendering/building-contacts.js';
const blank=()=>({pixels:new Uint8Array(256*256).fill(255),bounds:[-16,-16,32,32]});
const state=()=>({culture:'suajili',structures:[{id:'house',kind:'center',x:0,z:0,status:'intact',culture:'suajili',yaw:0}]});
test('building contacts stay localized, preserve existing AO and follow rotation',()=>{
 const a=blank(),s=state();a.pixels[0]=70;rasterBuildingContacts(a,s);
 assert.equal(a.pixels[0],70);assert.equal(a.pixels[255],255);
 assert.ok(a.pixels.some(v=>v<255));
 const b=blank();s.structures[0].yaw=Math.PI/2;rasterBuildingContacts(b,s);
 assert.notDeepEqual(a.pixels.subarray(256),b.pixels.subarray(256));
 s.structures[0].status='ruined';const c=blank();rasterBuildingContacts(c,s);assert.ok(c.pixels.every(v=>v===255));
});
test('cached contact atlas refreshes on placement, rotation and demolition without replacing texture',()=>{
 const contacts=new NativeContacts({buildings:true}),texture=contacts.texture,s=state();
 const prototypes=Array.from({length:20},()=>({group:0,radius:1})),layers=[true,true,true,true];
 const update=()=>contacts.update(new Map(),prototypes,[-16,-16,16,16],1,layers,s);
 assert.equal(update(),true);assert.equal(update(),false);
 s.structures[0].yaw=.7;assert.equal(update(),true);assert.equal(update(),false);
 s.structures=[];assert.equal(update(),true);assert.ok(texture.image.data.every(v=>v===255));
 assert.equal(contacts.texture,texture);contacts.dispose();
});
