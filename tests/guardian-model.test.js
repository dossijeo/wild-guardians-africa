import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const bytes=fs.readFileSync('public/content/guardian/guardian.glb');const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
test('shipping rig is floating, bounded, and has all facial controls',()=>{assert.equal(gltf.skins[0].joints.length,37);assert.ok(!gltf.nodes.some(n=>/hip|leg|foot/i.test(n.name)));const names=new Set(gltf.meshes.flatMap(m=>m.extras?.targetNames??[]));for(const s of 'ABCDEFGHX')assert.ok(names.has('viseme_'+s));for(const s of ['blink_L','blink_R','joy','focus','surprise'])assert.ok(names.has(s));assert.ok(bytes.length<4*1024*1024);});
test('cloth and body clips have disjoint properties and eyes are free for gaze',()=>{const cloth=new Set(),body=new Set();for(const a of gltf.animations){assert.ok(a.channels.length);for(const c of a.channels){const n=gltf.nodes[c.target.node].name;assert.ok(!n.startsWith('Eye.'));(a.name.startsWith('Mantle_')?cloth:body).add(n+':'+c.target.path);if(a.name.startsWith('Mantle_'))assert.ok(/^(Mantle|Feather|Wood)\./.test(n));else assert.ok(!n.startsWith('Mantle.'));}}assert.ok([...cloth].every(k=>!body.has(k)));});

test('float is independent of dialogue and secondary motion is explicitly rigged',()=>{const names=gltf.nodes.map(n=>n.name??'');assert.equal(names.filter(n=>n.startsWith('Feather.')).length,8);assert.equal(names.filter(n=>n.startsWith('Wood.')).length,4);const drift=gltf.animations.find(a=>a.name==='Float');assert.ok(drift);assert.ok(drift.channels.every(c=>gltf.nodes[c.target.node].name==='Root'));for(const a of gltf.animations.filter(a=>a.name!=='Float'))assert.ok(a.channels.every(c=>gltf.nodes[c.target.node].name!=='Root'));});

test('continuous wind and float loops have matching endpoints and bounded speed at the seam',()=>{
 const binaryStart=28+bytes.readUInt32LE(12);
 function values(i){const a=gltf.accessors[i],v=gltf.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[a.type],start=binaryStart+(v.byteOffset??0)+(a.byteOffset??0);return Array.from({length:a.count},(_,j)=>Array.from({length:n},(_,k)=>bytes.readFloatLE(start+j*(v.byteStride??n*4)+k*4)));}
 for(const a of gltf.animations.filter(a=>['Float','Idle','Mantle_Breeze','Mantle_Spell'].includes(a.name))){
  for(const c of a.channels){const s=a.samplers[c.sampler],t=values(s.input).flat(),v=values(s.output),last=v.length-1;assert.ok(Math.abs(t[last]-12)<.001);for(let k=0;k<v[0].length;k++){assert.ok(Math.abs(v[0][k]-v[last][k])<1e-5,a.name+' loop position');const start=(v[1][k]-v[0][k])/(t[1]-t[0]),end=(v[last][k]-v[last-1][k])/(t[last]-t[last-1]);assert.ok(Math.abs(start-end)<.03,a.name+' loop velocity');}}
 }
});
