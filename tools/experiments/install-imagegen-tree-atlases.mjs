import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='docs/qa/tree-atlas-refresh-20261026',sha=b=>createHash('sha256').update(b).digest('hex');
const inventory=JSON.parse(await fs.readFile(`${root}/imagegen-inventory.json`,'utf8'));
if(!inventory.complete||inventory.entries.length!==44||inventory.entries.some(x=>x.status!=='ready'))throw Error('Installation blocked: require all 44 staged atlases');
const bytes=await fs.readFile(`${root}/imagegen-manifest.json`),manifest=JSON.parse(bytes),manifestHash=sha(bytes);
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])for(const phase of ['day','night']){
 const audit=JSON.parse(await fs.readFile(`${root}/all-biomes-validation/${biome}-${phase}/validated.json`,'utf8'));
 if(!audit.verified||audit.errors.length||audit.manifestSha256!==manifestHash)throw Error(`Installation blocked: stale/incomplete visual validation ${biome}/${phase}`);
}
const plan=[];
for(const [biome,entries] of Object.entries(manifest.biomes))for(const entry of entries){
 for(const phase of ['day','night']){
  const record=inventory.entries.find(x=>x.biome===biome&&x.slot===entry.slot&&x.phase===phase);
  if(!record||entry[phase]!=='/'+record.runtime)throw Error('Staged manifest does not match inventory');
  const data=await fs.readFile(record.runtime);if(sha(data)!==record.sha256)throw Error(`Stale atlas ${record.runtime}`);
  const target=`public/assets/far-vegetation/${biome}-${entry.slot}-${phase}.webp`;
  plan.push({source:record.runtime,target,data,sha256:record.sha256});entry[phase]=`./assets/far-vegetation/${biome}-${entry.slot}-${phase}.webp`;
 }
 entry.experimental=false;delete entry.errors;delete entry.webglError;delete entry.drawCallsPerView;
}
manifest.totalTextureBytes=plan.reduce((sum,item)=>sum+item.data.length,0);
manifest.version=(manifest.version??1)+1;manifest.artRevision='imagegen-20261026';
if(JSON.stringify(manifest).includes('/docs/qa/'))throw Error('QA paths must never enter production manifest');
if(!process.argv.includes('--apply')){console.log(JSON.stringify({dryRun:true,files:plan.length,bytes:plan.reduce((n,p)=>n+p.data.length,0),manifestHash,command:'node tools/experiments/install-imagegen-tree-atlases.mjs --apply'}));process.exit(0);}
// Backup every replaced resource outside public before changing anything.
const backup=`${root}/installation-backup-${Date.now()}`;await fs.mkdir(backup,{recursive:true});
await fs.copyFile('public/content/far-vegetation.json',`${backup}/far-vegetation.json`);
for(const item of plan)await fs.copyFile(item.target,`${backup}/${path.basename(item.target)}`);
try{
 for(const item of plan){const temp=item.target+'.imagegen-tmp';await fs.writeFile(temp,item.data);await fs.rename(temp,item.target);}
 const target='public/content/far-vegetation.json';await fs.writeFile(target+'.imagegen-tmp',JSON.stringify(manifest,null,2)+'\n');await fs.rename(target+'.imagegen-tmp',target);
}catch(error){
 const failures=[];for(const item of plan)try{await fs.copyFile(`${backup}/${path.basename(item.target)}`,item.target);}catch(e){failures.push(String(e));}
 try{await fs.copyFile(`${backup}/far-vegetation.json`,'public/content/far-vegetation.json');}catch(e){failures.push(String(e));}
 throw Error(`Installation failed; rollback errors=${JSON.stringify(failures)}; backup=${backup}; cause=${error}`);
}
await fs.writeFile(`${root}/installation.json`,JSON.stringify({manifestHash,backup,files:plan.map(({data,...p})=>p),qaAssetsInstalled:false},null,2));
console.log(JSON.stringify({installed:plan.length,backup,qaAssetsInstalled:false}));
