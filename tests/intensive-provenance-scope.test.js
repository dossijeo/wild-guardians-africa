import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {gitSourceContext} from '../tools/intensive-run-provenance.mjs';

test('a runner nested inside a repository cannot attribute its sources to the enclosing HEAD',()=>{
  const direct=gitSourceContext(fileURLToPath(new URL('../',import.meta.url)));
  const nested=gitSourceContext(fileURLToPath(new URL('../tools/',import.meta.url)));
  assert.equal(direct.sourceRootIsGitRoot,true);
  assert.equal(direct.gitScope,'source-root');
  assert.match(direct.gitHead,/^[a-f0-9]{40}$/);
  assert.equal(direct.gitHead,direct.repositoryGitHead);
  assert.equal(nested.sourceRootIsGitRoot,false);
  assert.equal(nested.gitScope,'enclosing-repository');
  assert.equal(nested.gitHead,null);
  assert.equal(nested.repositoryGitHead,direct.repositoryGitHead);
});
