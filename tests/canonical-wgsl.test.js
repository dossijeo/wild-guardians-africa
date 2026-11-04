import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalizeNodeBufferNames as canon} from '../src/labs/canonical-wgsl.js';
test('normalizes identifiers consistently without collapsing distinct buffers',()=>{
 const a='struct NodeBuffer_123Struct {} var NodeBuffer_123: NodeBuffer_123Struct; let x=NodeBuffer_456.value + NodeBuffer_123.value;';
 const b='struct NodeBuffer_999Struct {} var NodeBuffer_999: NodeBuffer_999Struct; let x=NodeBuffer_111.value + NodeBuffer_999.value;';
 assert.equal(canon(a),canon(b));assert.notEqual(canon(a),canon(b.replace('NodeBuffer_111.value','NodeBuffer_999.value')));
});
test('fails closed on conflicting generated identifiers and leaves unrelated numbers intact',()=>{
 const input='NodeBuffer_Q0 NodeBuffer_123 123 @binding(123)';assert.equal(canon(input),input);assert.equal(canon('NodeBuffer_123 123 @binding(123)'),'NodeBuffer_Q0 123 @binding(123)');
});
