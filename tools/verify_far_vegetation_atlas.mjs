import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=new URL('../docs/qa/far-vegetation-atlas/',import.meta.url),read=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
const metadata=read('acacia.json'),encoding=read('encoding.json'),file=new URL('savanna-acacia-8views.webp',root),image=await sharp(fileURLToPath(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
assert.equal(image.info.width,metadata.atlasWidth);assert.equal(image.info.height,metadata.atlasHeight);assert.equal(image.info.channels,4);
assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),encoding.webpSha256);assert.equal(metadata.errors.length,0);assert.equal(metadata.webglError,0);
const packPath=new URL('../public/content/biome-savanna.json',import.meta.url),pack=JSON.parse(readFileSync(packPath,'utf8')),hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
assert.equal(hash(packPath),encoding.sourcePackSha256);assert.equal(hash(new URL('../public'+pack.binary.url,import.meta.url)),encoding.sourceBinarySha256);assert.equal(hash(new URL('../public'+pack.textures.find(t=>t.role==='baseColor').base64.url,import.meta.url)),encoding.sourceColorSha256);
assert.equal(metadata.sourceVertices,pack.assets[0].lods[0].position.count/3);assert.equal(metadata.sourceTriangles,pack.assets[0].lods[0].index.count/3);
assert.equal(metadata.views,8);assert.equal(metadata.baseV,0);assert.ok(metadata.impostorWidth>0&&metadata.impostorHeight>0);
assert.equal(metadata.localBase[1],metadata.sourceBounds.min[1]);assert.ok(metadata.impostorHeight>=metadata.sourceBounds.max[1]-metadata.sourceBounds.min[1]);
const rows=[];
for(let view=0;view<8;view++){
 let minX=256,minY=256,maxX=-1,maxY=-1,opaquePixels=0;const pixels=[];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const offset=(y*2048+view*256+x)*4,alpha=image.data[offset+3];pixels.push(alpha);if(alpha){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);opaquePixels++;}}
 const actual={view,angleDegrees:view*45,minX,minY,maxX,maxY,opaquePixels};assert.deepEqual(actual,metadata.cells[view]);assert.equal(maxY,255,'base occupies the common bottom pixel');assert.ok(minX>0&&maxX<255&&minY>0,'crown has transparent top/side margins');rows.push({...actual,alphaSha256:createHash('sha256').update(Buffer.from(pixels)).digest('hex')});
}
assert.equal(new Set(rows.map(r=>r.alphaSha256)).size,8,'eight different silhouettes');assert.equal(encoding.alphaDifferences,0);assert.equal(encoding.visibleRGBDifferences,0);
console.log(JSON.stringify({scope:'Precomputed native Savanna acacia atlas only; no gameplay integration or LOD acceptance',passed:true,width:image.info.width,height:image.info.height,webpBytes:encoding.webpBytes,rows},null,2));
