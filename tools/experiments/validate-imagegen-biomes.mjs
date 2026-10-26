import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='docs/qa/tree-atlas-refresh-20261026',inventory=JSON.parse(await fs.readFile(`${root}/imagegen-inventory.json`,'utf8'));
if(!inventory.complete||inventory.entries.length!==44||inventory.entries.some(x=>x.status!=='ready'))throw Error('Require complete 44-atlas staging before validation');
for(const entry of inventory.entries){const bytes=await fs.readFile(entry.runtime);if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error(`Stale runtime: ${entry.runtime}`);}
const manifestBytes=await fs.readFile(`${root}/imagegen-manifest.json`),manifest=JSON.parse(manifestBytes),manifestSha256=createHash('sha256').update(manifestBytes).digest('hex');
const biomes={'sabana':'savanna','gran-rio':'grand_river','manglares':'mangrove','volcanes':'volcanoes','gran-canon':'canyons','desierto':'desert'};
const jobs=process.argv.length>2?process.argv.slice(2):Object.keys(biomes).flatMap(b=>['day','night'].map(p=>`${b}:${p}`));
for(const job of jobs){const [biome,phase]=job.split(':');if(!biomes[biome]||!['day','night'].includes(phase))throw Error('Expected biome:day|night');
 const out=`${root}/all-biomes-validation/${biome}-${phase}`;
 const env={...process.env,WG_QA_URL:process.env.WG_QA_URL??'http://127.0.0.1:5220',WG_QA_WIDTH:'1920',WG_QA_HEIGHT:'1080',WG_WATER_BIOME:biome,WG_WATER_SEED:'712',WG_WATER_CAMERA:'normal',WG_WATER_FIXED_TIME:'1',WG_WATER_TIME:phase==='night'?'400':'100',WG_ANGULAR_LOD:'1',WG_NEW_ATLASES:'1',WG_ATLAS_MANIFEST:'imagegen',WG_ATLAS_ISOLATE:'0',WG_ATLAS_HORIZON:'1',WG_ATLAS_GROUND:'1',WG_FORCE_FAR_3D:'0',WG_IMAGEGEN_ATLAS:'0',WG_WATER_OUT:out};
 console.log('Starting',job);await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['tools/experiments/check-mangrove-water-authority.mjs'],{env,stdio:'inherit'});c.on('exit',code=>code===0?resolve():reject(Error(`${job}: exit ${code}`)));c.on('error',reject);});
 const report=JSON.parse(await fs.readFile(`${out}/report.json`,'utf8')),audit=JSON.parse(await fs.readFile(`${out}/atlas-resource-audit.json`,'utf8'));
 if(report.errors.length||audit.renderer.adapters.some(a=>a.pending||a.errors.length||a.prelit!==1))throw Error(`Renderer errors ${job}`);
 for(const entry of manifest.biomes[biomes[biome]])for(const p of ['day','night'])if(!audit.responses.some(r=>new URL(r.url).pathname===entry[p]&&r.status===200))throw Error(`Expected atlas was not loaded: ${entry[p]}`);
 if((phase==='night'&&audit.renderer.night<.99)||(phase==='day'&&audit.renderer.night>.01))throw Error(`Wrong lighting phase ${job}`);
 await fs.writeFile(`${out}/validated.json`,JSON.stringify({job,manifestSha256,seed:report.data.seed,atlasCount:manifest.biomes[biomes[biome]].length*2,errors:report.errors,verified:true},null,2));
}
