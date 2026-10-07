import test from 'node:test';import assert from 'node:assert/strict';
import {mountainLodDiagnosticFragment,mountainCameraElevation} from './browser/mountain-lod-diagnostic.js';

test('LOD diagnostic retains alpha and one texture sample, calculating derivatives before discard',()=>{
 const source='varying vec2 vBackdropUv;void main(){vec4 c=texture2D(uBackdropAtlas,vBackdropUv);if(c.a<.35)discard;gl_FragColor=c;\n#include <colorspace_fragment>\n}';
 const original=source,diagnostic=mountainLodDiagnosticFragment(source);
 assert.equal(source,original);
 assert.equal((diagnostic.match(/texture2D\(/g)??[]).length,1);
 assert.ok(diagnostic.indexOf('dFdx(')<diagnostic.indexOf('discard'));
 assert.ok(diagnostic.indexOf('dFdy(')<diagnostic.indexOf('discard'));
 assert.match(diagnostic,/qaLod>=4/);assert.match(diagnostic,/qaLod>=5/);
 assert.equal(diagnostic.split('#include <colorspace_fragment>').length,2);
});
test('unexpected shader layouts reject rather than silently omit the diagnostic',()=>{
 assert.throws(()=>mountainLodDiagnosticFragment('void main(){}'),/Unexpected/);
 assert.throws(()=>mountainLodDiagnosticFragment('void main(){}void main(){}\n#include <colorspace_fragment>'),/Unexpected/);
});
test('camera QA elevation remains bounded and supports the preserved four-metre baseline',()=>{
 assert.equal(mountainCameraElevation('4'),4);assert.equal(mountainCameraElevation(600),600);assert.equal(mountainCameraElevation(0),0);
 for(const value of [NaN,Infinity,-1,601])assert.throws(()=>mountainCameraElevation(value),/0–600/);
});
