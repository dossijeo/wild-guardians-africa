import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const culture=process.argv[2];
assert(['suajili','etiope','mapungubwe','saheliana','musgum'].includes(culture),'Select a supported building culture');
const dir=path.join(root,'docs/qa/embedded-building-color-native',culture);
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function imageInfo(bytes){
 if(bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a'){
  assert.equal(bytes.subarray(12,16).toString(),'IHDR');
  return {encoding:'png',resolution:[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]};
 }
 assert.equal(bytes.readUInt16BE(0),0xffd8,'Unsupported screenshot encoding');
 for(let offset=2;offset+4<bytes.length;){
  assert.equal(bytes[offset++],0xff,'Invalid JPEG marker');
  while(bytes[offset]===0xff)offset++;
  const marker=bytes[offset++];
  assert(marker!==0xda&&marker!==0xd9,'JPEG lacks size header');
  if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
  const length=bytes.readUInt16BE(offset);assert(length>=2&&offset+length<=bytes.length,'Truncated JPEG segment');
  if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
   assert(length>=8);return {encoding:'jpeg',resolution:[bytes.readUInt16BE(offset+5),bytes.readUInt16BE(offset+3)]};
  }
  offset+=length;
 }
 throw Error('Missing image dimensions');
}
const descriptor=(await json(path.join(root,'public/content/destruction.json'))).buildings.find(b=>b.culture===culture);
assert(descriptor&&/^[a-f0-9]{64}$/.test(descriptor.sha256),'Missing original building identity');
const key=descriptor.sha256+'-1';
const runtimePath='assets/web/'+descriptor.sha256+'.glb';
const candidatePath='/.cache/embedded-colors-remaining/'+key+'/candidate.glb';
const receiptProof={runtimePath,candidatePath,
 runtimeSha256:hash(await readFile(path.join(root,'public',runtimePath))),
 candidateSha256:hash(await readFile(path.join(root,candidatePath.slice(1))))};
const biomes=['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'];
const pairs=[],rows=[];
for(const [label,damage] of [['intact',0],['damage35',.35],['damage65',.65]])for(const view of ['front','back']){
 const filename=`${label}-${view}-comparison.json`,report=await json(path.join(dir,filename));
 assert.equal(report.ready,true);assert.equal(report.culture,culture);assert.equal(report.pilotKey,key);
 assert.equal(report.comparison,'finished');assert.deepEqual(report.errors,[]);assert.deepEqual(report.receiptProof,receiptProof);
 assert.equal(report.damage,damage);assert.equal(report.viewAngle,view==='front'?0:180);assert.equal(report.rows.length,12);
 const expected=biomes.flatMap(b=>[b+':false',b+':true']).sort();
 assert.deepEqual(report.rows.map(r=>r.biome+':'+r.night).sort(),expected,filename+' lighting cases');
 for(const r of report.rows){assert.equal(r.damage,damage);assert.equal(r.glError,0);for(const k of ['changedPixels','rgbMeanAbsoluteDifference','maxRgbDifference'])assert(Number.isFinite(r[k])&&r[k]>=0,filename+' '+k);}
 rows.push({file:filename,damage,view,day:report.rows.find(r=>!r.night),night:report.rows.find(r=>r.night)});
 for(const light of ['day','night']){
  const stem=`${label}-${view}-${light}`,snapshots={};
  for(const variant of ['baseline','candidate']){
   const s=await json(path.join(dir,`${stem}-${variant}.json`));snapshots[variant]=s;
   assert.equal(s.ready,true);assert.equal(s.selected,variant);assert.equal(s.culture,culture);assert.equal(s.pilotKey,key);
   assert.equal(s.damage,damage);assert.equal(s.night,light==='night');assert.equal(s.viewAngle,view==='front'?0:180);
   assert.equal(s.pose,'NativeBuilding frozen damage');assert.equal(s.biome,'sabana');assert.deepEqual(s.errors,[]);assert.deepEqual(s.receiptProof,receiptProof);
   for(const k of ['camera','cameraTarget'])assert(s[k].length===3&&s[k].every(Number.isFinite),stem+' '+k);
  }
  const a=snapshots.baseline,b=snapshots.candidate;
  for(const k of ['camera','cameraTarget','damage','night','viewAngle','resolution','receiptProof','culture','pilotKey','pose','biome'])assert.deepEqual(a[k],b[k],stem+' '+k);
  // Orbit round trips can differ by a few floating-point ulps in the later report.
  for(const k of ['camera','cameraTarget'])for(let i=0;i<3;i++)assert(Math.abs(a[k][i]-report[k][i])<=1e-12,stem+' report '+k);
  const screenshots=[];
  for(const variant of ['baseline','candidate']){
   const file=`${stem}-${variant}.png`,bytes=await readFile(path.join(dir,file));
   const info=imageInfo(bytes);assert.deepEqual(info.resolution,a.resolution,file+' dimensions');
   screenshots.push({file,sha256:hash(bytes),encoding:info.encoding});
  }
  pairs.push({file:stem,damage,camera:a.camera,cameraTarget:a.cameraTarget,receiptProof,screenshots});
 }
}
assert.deepEqual(await json(path.join(dir,'console.json')),[]);
await writeFile(path.join(dir,'screenshot-pairs.json'),JSON.stringify({pairs},null,2)+'\n');
await writeFile(path.join(dir,'readback-summary.json'),JSON.stringify({rows,completedReports:6,readbackPairs:72,glErrors:0,fixtureErrors:0,consoleWarningsOrErrors:0,scope:'Six biome labels repeat native day/night lighting; they do not represent six full worlds or distinct NativeBuilding palettes.'},null,2)+'\n');
console.log(JSON.stringify({culture,screenshotPairs:pairs.length,completedReports:rows.length,readbackPairs:72,receiptProof}));
