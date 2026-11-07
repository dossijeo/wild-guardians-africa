import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {Assets} from '../src/rendering/assets.js';
import {NativeWall} from '../src/rendering/walls.js';
const read=p=>readFileSync(new URL('../public'+p,import.meta.url));
const json=p=>JSON.parse(read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('wall banks match all twenty source pieces and survive damage and gate articulation',async t=>{
 const pack=json('/content/walls.json'),meta=json('/content/lighting/global-ao/walls.json');assert.equal(meta.manifestSHA256,sha(read('/content/walls.json')));assert.equal(meta.outputSHA256,sha(read(meta.binary)));
 assert.equal(meta.records.length,20);for(const r of meta.records)for(const [key,hash]of Object.entries(r.hashes))assert.equal(hash,sha(read(pack.pieces[r.key][key].url)));
 t.mock.method(globalThis,'fetch',async url=>{const b=read(url);return {ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length)};});
 const assets=new Assets();assets.visualSearch='?globalAO=1';assets.textures={loadAsync:async()=>new THREE.Texture()};
 try{const prototypes=await assets.walls(pack);for(const material of ['zarzas','empalizada','adobe','piedra','reforzado'])for(const gate of [false,true]){
  const entity={id:'qa',material,gate,hp:100,maxHp:100,status:'intact',gateOpen:0};const wall=new NativeWall(prototypes,entity,0);
  try{for(const hp of [100,75,50,25,0])for(const opening of [0,.5,1]){entity.hp=hp;entity.gateOpen=opening;wall.update(entity,undefined,1);
   for(const {mesh,bridge}of wall.parts){const ao=mesh.geometry.attributes.ambientVisibility;assert.equal(ao.count,mesh.geometry.attributes.position.count);assert.ok(mesh.material.userData.modelAmbientVisibility);assert.ok([...ao.array].every(v=>Number.isFinite(v)&&v>=0&&v<=1));if(opening===1&&bridge.leafFlags)for(let i=0;i<ao.count;i++)if(bridge.leafFlags[i])assert.equal(ao.getX(i),1);}
  }}finally{wall.dispose();}
 }}finally{assets.disposeModels();}
});
