import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const culture=process.argv[2];
const lifecycle=process.argv[3]==='--lifecycle';
assert(process.argv.length<=4&&(process.argv[3]===undefined||lifecycle),'Only --lifecycle is supported');
assert(['suajili','etiope','mapungubwe','saheliana','musgum'].includes(culture),'Select a supported building culture');
const dir=path.join(root,lifecycle?'docs/qa/embedded-building-color-lifecycle':'docs/qa/embedded-building-color-native',culture);
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
// Explicit receipt expectations, independent of the browser fixture's step array.
const lifecycleCases=[
 ['initial',0,'intact',600,0,0],['damaged',.65,'intact',210,0,1],
 ['repaired',0,'intact',600,0,2],['collapse-start',.79,'collapsing',0,3.2,3],
 ['collapse-middle',.895,'collapsing',0,1.6,4.6],['ruined',1,'ruined',0,0,6.2],
 ['ruined-settled',1,'ruined',0,0,8.2],['rebuilt',0,'intact',600,0,9.2],
];
function verifyLifecycle(s,entry){
 const [name,damage,status,hp,collapseRemaining,elapsed]=entry;
 assert.deepEqual(s.lifecycle,{name,status,hp,collapseRemaining,elapsed});
 assert.equal(s.nativeStates.length,2);assert.deepEqual(s.nativeStates[0],s.nativeStates[1]);
 for(const n of s.nativeStates){
  assert.equal(n.damage,damage);assert.equal(n.effectTime,elapsed);
  assert.equal(n.outer,damage<1);assert.equal(n.inner,damage>0&&damage<1);assert.equal(n.ash,damage>0);
  for(const k of ['smoke','debris'])assert(Number.isInteger(n[k])&&n[k]>=0,name+' '+k);
  assert(Number.isFinite(n.ashAge)&&n.ashAge>=0);
  if(damage===0){assert.equal(n.smoke,0);assert.equal(n.debris,0);}
  if(name.startsWith('collapse-')){assert(n.smoke>0);assert(n.debris>0);}
 }
}
const pairs=[],rows=[];
for(const entry of lifecycle?lifecycleCases:[['intact',0],['damage35',.35],['damage65',.65]])for(const view of lifecycle?['front']:['front','back']){
 const [label,damage]=entry;
 const filename=lifecycle?`${label}-comparison.json`:`${label}-${view}-comparison.json`,report=await json(path.join(dir,filename));
 assert.equal(report.ready,true);assert.equal(report.culture,culture);assert.equal(report.pilotKey,key);
 assert.equal(report.comparison,'finished');assert.deepEqual(report.errors,[]);assert.deepEqual(report.receiptProof,receiptProof);
 assert.equal(report.damage,damage);assert.equal(report.viewAngle,view==='front'?0:180);assert.equal(report.rows.length,12);
 const expected=biomes.flatMap(b=>[b+':false',b+':true']).sort();
 assert.deepEqual(report.rows.map(r=>r.biome+':'+r.night).sort(),expected,filename+' lighting cases');
 if(lifecycle)verifyLifecycle(report,entry);
 for(const r of report.rows){assert.equal(r.damage,damage);if(lifecycle)assert.equal(r.lifecycle,label);assert.equal(r.glError,0);for(const k of ['changedPixels','rgbMeanAbsoluteDifference','maxRgbDifference'])assert(Number.isFinite(r[k])&&r[k]>=0,filename+' '+k);}
 rows.push({file:filename,damage,view,day:report.rows.find(r=>!r.night),night:report.rows.find(r=>r.night)});
 for(const light of ['day','night']){
  const stem=lifecycle?`${label}-${light}`:`${label}-${view}-${light}`,snapshots={};
  for(const variant of ['baseline','candidate']){
   const s=await json(path.join(dir,`${stem}-${variant}.json`));snapshots[variant]=s;
   assert.equal(s.ready,true);assert.equal(s.selected,variant);assert.equal(s.culture,culture);assert.equal(s.pilotKey,key);
   assert.equal(s.damage,damage);assert.equal(s.night,light==='night');assert.equal(s.viewAngle,view==='front'?0:180);
   assert.equal(s.pose,'NativeBuilding frozen damage');assert.equal(s.biome,'sabana');assert.deepEqual(s.errors,[]);assert.deepEqual(s.receiptProof,receiptProof);
   if(lifecycle)verifyLifecycle(s,entry);
   for(const k of ['camera','cameraTarget'])assert(s[k].length===3&&s[k].every(Number.isFinite),stem+' '+k);
  }
  const a=snapshots.baseline,b=snapshots.candidate;
  for(const k of ['camera','cameraTarget','damage','night','viewAngle','resolution','receiptProof','culture','pilotKey','pose','biome'])assert.deepEqual(a[k],b[k],stem+' '+k);
  // Orbit round trips can differ by a few floating-point ulps in the later report.
  for(const k of ['camera','cameraTarget'])for(let i=0;i<3;i++)assert(Math.abs(a[k][i]-report[k][i])<=1e-12,stem+' report '+k);
  const screenshots=[];
  for(const variant of ['baseline','candidate']){
   const file=`${stem}-${variant}.${lifecycle?'jpg':'png'}`,bytes=await readFile(path.join(dir,file));
   const info=imageInfo(bytes);assert.deepEqual(info.resolution,a.resolution,file+' dimensions');
   screenshots.push({file,sha256:hash(bytes),encoding:info.encoding});
  }
  pairs.push({file:stem,damage,camera:a.camera,cameraTarget:a.cameraTarget,receiptProof,screenshots});
 }
}
if(lifecycle)for(const light of ['day','night']){
 const initial=pairs.find(p=>p.file===`initial-${light}`);
 for(const stage of ['repaired','rebuilt']){
  const restored=pairs.find(p=>p.file===`${stage}-${light}`);
  assert.deepEqual(restored.screenshots.map(s=>s.sha256),initial.screenshots.map(s=>s.sha256),stage+' restores the same frozen screenshot');
 }
}
assert.deepEqual(await json(path.join(dir,'console.json')),[]);
await writeFile(path.join(dir,'screenshot-pairs.json'),JSON.stringify({pairs},null,2)+'\n');
const readbackPairs=rows.length*12;
await writeFile(path.join(dir,'readback-summary.json'),JSON.stringify({rows,completedReports:rows.length,readbackPairs,glErrors:0,fixtureErrors:0,consoleWarningsOrErrors:0,scope:'Six biome labels repeat native day/night lighting; they do not represent six full worlds or distinct NativeBuilding palettes.'+(lifecycle?' Lifecycle mode verifies frozen native render states, not worker repairs or economic charges.':'')},null,2)+'\n');
console.log(JSON.stringify({culture,lifecycle,screenshotPairs:pairs.length,completedReports:rows.length,readbackPairs,receiptProof}));
