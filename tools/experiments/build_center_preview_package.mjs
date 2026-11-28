import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cp,mkdir,mkdtemp,readFile,readdir,realpath,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename,isAbsolute,join,relative,resolve} from 'node:path';
import {promisify} from 'node:util';

// Reproducible pilot package. Never overwrites the original center or output.
const [outputArg,culture='mapungubwe']=process.argv.slice(2);if(!outputArg||!['mapungubwe','suajili','etiope','saheliana','musgum'].includes(culture))throw Error('Usage: node build_center_preview_package.mjs <new-output-directory> [culture]');
const output=resolve(outputArg),tempRoot=await realpath(tmpdir()),scratch=await realpath(await mkdtemp(join(tempRoot,'wg-center-package-'))),rel=relative(tempRoot,scratch);if(!rel||rel.startsWith('..')||isAbsolute(rel)||!basename(scratch).startsWith('wg-center-package-'))throw Error('Unexpected scratch directory');
const id=culture+'Center',hash=data=>createHash('sha256').update(data).digest('hex'),run=promisify(execFile),payload=join(scratch,'package'),bake=join(scratch,'bake'),materials=join(scratch,'materials');
async function command(script,args,extra={}){const result=await run(process.execPath,[script,...args],{cwd:process.cwd(),env:{...process.env,...extra},maxBuffer:4*1024*1024});if(result.stderr.trim())process.stderr.write(result.stderr);return result.stdout;}
try{
 await mkdir(payload);const destruction=JSON.parse(await readFile('public/content/destruction.json','utf8')),descriptor=destruction.buildings.find(row=>row.culture===culture);if(!descriptor||!/^\/assets\/[a-f0-9]{64}\.glb$/.test(descriptor.url))throw Error('Missing center source');const source='public'+descriptor.url,fixture=join(scratch,'sources.json');await writeFile(fixture,JSON.stringify([{id,source}]));
 await command('tools/experiments/bake_vertex_color_preview.mjs',[bake],{WG_VERTEX_SOURCES:fixture});const manifest=join(bake,'manifest.json'),preview=join(payload,'preview.glb');await command('tools/experiments/pack_vertex_color_preview.mjs',[id,preview],{WG_VERTEX_MANIFEST:manifest});await command('tools/experiments/extract_vertex_preview_materials.mjs',[id,materials],{WG_VERTEX_MANIFEST:manifest});const pilot=JSON.parse(await command('tools/experiments/build_vertex_bc7_pilot.mjs',[materials,payload]));
 const variants={};for(const variant of ['webp','bc7']){const files=[];for(const name of (await readdir(join(payload,variant))).sort()){const data=await readFile(join(payload,variant,name));files.push({path:`${variant}/${name}`,bytes:data.length,sha256:hash(data)});}variants[variant]={requires:variant==='bc7'?['texture-compression-bc']:[],files};}const data=await readFile(preview),out={schemaVersion:1,id,sourceModel:pilot.model,preview:{path:'preview.glb',bytes:data.length,sha256:hash(data),requires:[]},variants};await writeFile(join(payload,'package.json'),JSON.stringify(out,null,2)+'\n');await mkdir(output);await cp(payload,output,{recursive:true,force:false,errorOnExist:true});console.log(JSON.stringify({output,previewBytes:data.length,webpBytes:variants.webp.files.reduce((sum,f)=>sum+f.bytes,0),bc7Bytes:variants.bc7.files.reduce((sum,f)=>sum+f.bytes,0)}));
}finally{await rm(scratch,{recursive:true,force:true});}
