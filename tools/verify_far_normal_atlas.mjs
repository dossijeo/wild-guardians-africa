import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import sharp from 'sharp';
const dir=new URL('../docs/qa/far-normal-atlas/',import.meta.url),read=name=>JSON.parse(readFileSync(new URL(name,dir),'utf8')),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const metadata=read('acacia-normal.json'),encoding=read('encoding.json'),original=JSON.parse(readFileSync(new URL('../docs/qa/far-vegetation-atlas/acacia.json',import.meta.url),'utf8'));
const file=new URL('savanna-acacia-normals-8views.webp',dir),image=await sharp(fileURLToPath(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),albedo=await sharp(fileURLToPath(new URL('../docs/qa/far-vegetation-atlas/savanna-acacia-8views.webp',import.meta.url))).ensureAlpha().raw().toBuffer();
assert.equal(hash(readFileSync(file)),encoding.webpSha256);assert.equal(image.info.width,2048);assert.equal(image.info.height,256);assert.equal(image.info.channels,4);assert.equal(metadata.webglError,0);assert.deepEqual(metadata.errors,[]);assert.equal(metadata.normalExperimental,true);
for(const key of ['views','viewResolution','localBase','impostorWidth','impostorHeight','baseV','sourceBounds','sourceVertices','sourceTriangles','anglesDegrees'])assert.deepEqual(metadata[key],original[key]);
for(const [path,expected] of Object.entries(encoding.sourceHashes))assert.equal(hash(readFileSync(new URL('../'+path,import.meta.url))),expected);
assert.equal(encoding.alphaDifferences,0);assert.equal(encoding.visibleRGBDifferences,0);
const rows=[];let normalizedSamples=0,lengthSum=0,minLength=Infinity,maxLength=0;
for(let view=0;view<8;view++){
 let minX=256,minY=256,maxX=-1,maxY=-1,opaquePixels=0,intersection=0,union=0;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const i=(y*2048+view*256+x)*4,a=image.data[i+3],b=albedo[i+3];if(a||b)union++;if(a&&b)intersection++;
  if(a){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);opaquePixels++;}
  if(a===255){const length=Math.hypot(...[0,1,2].map(c=>image.data[i+c]/255*2-1));assert.ok(Number.isFinite(length));normalizedSamples++;lengthSum+=length;minLength=Math.min(minLength,length);maxLength=Math.max(maxLength,length);}
 }
 const cell={view,angleDegrees:view*45,minX,minY,maxX,maxY,opaquePixels};assert.deepEqual(cell,metadata.cells[view]);assert.equal(maxY,255);assert.ok(minX>0&&maxX<255&&minY>0);assert.ok(intersection/union>.9,'normal/albedo alpha silhouettes largely coincide');rows.push({...cell,alphaIoU:intersection/union});
}
assert.ok(normalizedSamples>1000);assert.ok(lengthSum/normalizedSamples>.9&&lengthSum/normalizedSamples<1.02);
console.log(JSON.stringify({passed:true,scope:'Offline candidate only; not normal-lighting or performance acceptance',webpBytes:encoding.webpBytes,normalizedSamples,minLength,maxLength,meanLength:lengthSum/normalizedSamples,rows},null,2));
