import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {readGlb} from '../tools/glb-container.mjs';

test('repacking an already-WebP center preserves texture references and normal classification',()=>{
 const catalogue=JSON.parse(readFileSync('public/content/destruction.json'));
 const source=resolve('public'+catalogue.buildings[0].url),dir=mkdtempSync(join(tmpdir(),'wg-webp-center-'));
 try{
  const output=join(dir,'packed.glb');
  execFileSync(process.execPath,['tools/compress_web_assets.mjs','--candidate',source,output],{stdio:'pipe'});
  const before=readGlb(readFileSync(source)).json,after=readGlb(readFileSync(output)).json;
  assert.equal(after.textures.length,before.textures.length);
  for(let i=0;i<before.textures.length;i++){
   const index=before.textures[i].source??before.textures[i].extensions.EXT_texture_webp.source;
   assert.equal(after.textures[i].extensions.EXT_texture_webp.source,index);
   assert.equal(after.images[index].mimeType,'image/webp');
  }
  const manifest=JSON.parse(readFileSync(output+'.compression.json'));
  const normalTexture=before.textures[before.materials[0].normalTexture.index];
  const normalImage=normalTexture.source??normalTexture.extensions.EXT_texture_webp.source;
  const encodedNormal=manifest.records[0].images.find(image=>image.index===normalImage);
  assert.equal(encodedNormal.role,'normal');assert.equal(encodedNormal.lossless,true);
  const colorTexture=before.textures[before.materials[0].pbrMetallicRoughness.baseColorTexture.index];
  const colorImage=colorTexture.source??colorTexture.extensions.EXT_texture_webp.source;
  assert.equal(manifest.records[0].images.find(image=>image.index===colorImage).role,'color');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
