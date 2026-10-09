import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('WorldScene.load passes its real local early-region owner to later attachment',()=>{
 const result=spawnSync(process.execPath,['--experimental-loader','./tests/fixtures/world-load-cpu-loader.mjs','./tests/fixtures/world-load-cpu-callpath.mjs'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+String.fromCharCode(10)+result.stderr);
 assert.match(result.stdout,/WorldScene.load original callpath/);
});
