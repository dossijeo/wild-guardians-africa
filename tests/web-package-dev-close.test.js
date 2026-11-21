import test from 'node:test';import assert from 'node:assert/strict';import {webPackagePlugin} from '../tools/web-package.mjs';
test('development close never rewrites the production package',()=>{
 const plugin=webPackagePlugin();plugin.configResolved({command:'serve',root:'nonexistent-test-root',build:{outDir:'dist'}});assert.doesNotThrow(()=>plugin.closeBundle());
});
