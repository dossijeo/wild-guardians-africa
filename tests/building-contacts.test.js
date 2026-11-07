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


test('wall contacts follow scale/rotation/damage and exclude open gate footprints',()=>{
 const wall={id:'wall',kind:'wall',x:0,z:0,yaw:0,baseScaleX:2,material:'adobe',status:'intact',hp:100,maxHp:100};
 const s={structures:[wall]},a=blank();rasterBuildingContacts(a,s);
 const dark=data=>data.pixels.reduce((sum,v)=>sum+255-v,0);
 assert.ok(dark(a)>0);assert.equal(a.pixels[0],255);
 wall.yaw=Math.PI/2;const b=blank();rasterBuildingContacts(b,s);assert.notDeepEqual(a.pixels,b.pixels);
 wall.hp=25;const damaged=blank();rasterBuildingContacts(damaged,s);assert.ok(dark(damaged)<dark(b)*.3);
 for(const change of [{gate:true},{gate:false,status:'ruined'},{status:'collapsing'}]){
  Object.assign(wall,change);const c=blank();rasterBuildingContacts(c,s);assert.equal(dark(c),0);
 }
});

test('wall contact cache observes damage, dimensions and conversion to gate',()=>{
 const contacts=new NativeContacts({buildings:true});
 const wall={id:'wall',kind:'wall',x:0,z:0,status:'intact',hp:100,maxHp:100};
 const s={structures:[wall]},prototypes=Array.from({length:20},()=>({group:0,radius:1}));
 const update=()=>contacts.update(new Map(),prototypes,[-16,-16,16,16],1,[true,true,true,true],s);
 assert.equal(update(),true);assert.equal(update(),false);
 wall.hp=20;assert.equal(update(),true);assert.equal(update(),false);
 wall.baseScaleX=2;assert.equal(update(),true);
 wall.gate=true;assert.equal(update(),true);assert.ok(contacts.texture.image.data.every(v=>v===255));
 contacts.dispose();
});
