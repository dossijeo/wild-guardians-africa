import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';import {gunzipSync} from 'node:zlib';import {actorGeometry} from '../../tests/helpers/actor-geometry.js';import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';import {replaySurfacePose} from '../../tests/browser/guardian-surface-pose.js';import assert from 'node:assert/strict';
const path='src/rendering/beast-ragdoll-binding.js',base=pathToFileURL(process.cwd()+'/'+path);
const load=async source=>(await import('data:text/javascript;base64,'+Buffer.from(source.replace("from 'three'","from '"+import.meta.resolve('three')+"'").replace(/from '(\.[^']+)'/g,(_,s)=>"from '"+new URL(s,base).href+"'")).toString('base64'))).BeastRagdollBinding;
const classes=[await load(execFileSync('git',['show','c010b3767:'+path],{encoding:'utf8'})),await load(fs.readFileSync(path,'utf8'))];
const pose=JSON.parse(gunzipSync(fs.readFileSync('tests/fixtures/rhino-recovery-negative-surface-pose.json.gz'))),bindings=[];
for(const Binding of classes){const model=await actorGeometry('public'+ANIMAL_ACTIONS.animals.rhino.url);const binding=new Binding(model,{species:'rhino'});binding.capture();binding.colliders();replaySurfacePose(model,pose);binding.capture();bindings.push(binding);}
assert.deepEqual(bindings[0].colliders({refit:true}),bindings[1].colliders({refit:true}));
for(const b of bindings)for(let i=0;i<3;i++)b.colliders({refit:true});
const rows=[];for(let i=0;i<20;i++){const row={};for(const j of i%2?[1,0]:[0,1]){const t=performance.now();bindings[j].colliders({refit:true});row[j?'plain':'vector']=performance.now()-t;}rows.push(row);}console.log(JSON.stringify({exactColliderEquality:true,rows},null,2));
