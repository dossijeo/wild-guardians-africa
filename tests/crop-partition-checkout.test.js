import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

test('clean Git autocrlf checkout preserves hash-addressed partition JSON bytes',()=>{
 const root=resolve('.'),directory=join(root,'.cache');mkdirSync(directory,{recursive:true});
 const checkout=mkdtempSync(join(directory,'partition-autocrlf-test-'));
 const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 const revision=git(['rev-parse','HEAD']).trim(),path='public/assets/crop-partition-v1-98e4f7db28fa5f0c2a6e/partition-manifest.json';
 git(['clone','--shared','--no-checkout',root,checkout]);
 git(['config','core.autocrlf','true'],checkout);
 git(['sparse-checkout','init','--no-cone'],checkout);
 git(['sparse-checkout','set','--no-cone','/.gitattributes','/'+path],checkout);
 git(['checkout','--detach',revision],checkout);
 assert.equal(git(['check-attr','text','--',path],checkout).trim(),path+': text: unset');
 const bytes=readFileSync(join(checkout,path));
 assert.equal(bytes.length,2313);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'98e4f7db28fa5f0c2a6ef4536405a9bb7a96b1613125a4b140324472b7d4bb77');
 assert.equal(bytes.includes(Buffer.from('\r\n')),false);
 assert.equal(git(['status','--porcelain','--untracked-files=no'],checkout),'');
 // Keep this small actual checkout as reproducible test evidence, not a fake LF copy.
});
