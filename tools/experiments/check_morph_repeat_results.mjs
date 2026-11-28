import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const files=process.argv.slice(2);if(files.length<2)throw Error('Provide at least two visual result JSON files');
const results=await Promise.all(files.map(async path=>({path,data:JSON.parse(await readFile(path,'utf8'))})));
for(const {path,data} of results){assert.equal(data.backend,'WebGPU real',path);assert.deepEqual(data.errors,[],path);assert.equal(data.frames.length,4,path);for(const frame of data.frames){assert.ok(frame.repeatHashes?.length>=3,path);const stableCount=frame.repeatHashes.length>=5?3:2;assert.equal(new Set(frame.repeatHashes.slice(-stableCount)).size,1,`${path}: pose ${frame.time} did not stabilize`);}}
const expected=results[0].data.frames.map(frame=>frame.repeatHashes.at(-1));for(const {path,data} of results.slice(1))assert.deepEqual(data.frames.map(frame=>frame.repeatHashes.at(-1)),expected,`${path}: stable output differs`);
console.log(JSON.stringify({ok:true,files,poses:expected.length,meshes:results[0].data.morphMeshes,weights:results[0].data.morphValues}));
