import fs from 'node:fs';import {spawnSync,execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/chunk-water-runtime-validation';
let source=fs.readFileSync('tools/experiments/check-spatial-thread-game.mjs','utf8');
const anchor='let s=await r.text();';if(source.split(anchor).length!==2)throw Error('Canonical scene hook changed');
source="import {patchChunkWaterScene} from './chunk-water-scene-patch.mjs';\n"+source.replace(anchor,'let s=patchChunkWaterScene(await r.text());');
const resultAnchor=' result.scheduler=await page.evaluate';if(source.split(resultAnchor).length!==2)throw Error('Result hook');source=source.replace(resultAnchor," result.chunkWaterBed=await page.evaluate(()=>globalThis.qaChunkWaterBed??null);if(!result.chunkWaterBed?.calls)throw Error('Incremental water candidate not exercised');\n"+resultAnchor);
const goto=' await page.goto(gameUrl.href);';if(source.split(goto).length!==2)throw Error('Goto hook');source=source.replace(goto,` if(process.env.WG_THREAD_CONTEXT==='1')await page.route('**/tools/experiments/spatial-thread-game-context-case.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor=' const before=snapshot(),oldPrograms=renderer.info.programs;';if(!body.includes(anchor))throw Error('Context pause hook');body=body.replace(anchor," (await import('/src/simulation/game.js')).pause(w.state,'menu');"+anchor);await route.fulfill({response,body});});\n`+goto);
const temp='tools/experiments/.chunk-water-runtime-generated.mjs';fs.writeFileSync(temp,source);
const sixBiomes=process.argv.includes('--six-biomes');
const modes=process.argv.includes('--edits')?['edits']:sixBiomes?['quality']:['quality','context'];
const biomes=sixBiomes?['sabana','gran-rio','desierto','volcanes','gran-canon','manglares']:['manglares'];
if(sixBiomes)source=source.replace("if(!result.chunkWaterBed?.calls)throw Error('Incremental water candidate not exercised');","// Coverage counts are reported even for biomes without applicable water.");
fs.writeFileSync(temp,source);
try{for(const biome of biomes)for(const mode of modes){
 const out=root+(sixBiomes?'/'+biome:'')+'/'+mode;fs.mkdirSync(out,{recursive:true});const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('WG_')));
 Object.assign(env,{WG_THREAD_PORT:'5220',WG_THREAD_BIOME:biome,WG_THREAD_QUALITY:'media',WG_PRODUCTION_VISUALS:'1',WG_THREAD_DEFAULT_STREAMING:'1',WG_THREAD_MAIN_PHASES:'1',WG_THREAD_REPORT:out+'/report.json'});
 if(mode==='quality')Object.assign(env,{WG_THREAD_ACTIVE:'1',WG_THREAD_QUALITY_CYCLE:'1',WG_THREAD_QUALITY_ACTIVE:'1',WG_THREAD_QUALITY_MENU_PROTOCOL:'1'});else if(mode==='context')env.WG_THREAD_CONTEXT='1';else env.WG_THREAD_EDIT='1';
 const files=[temp,'tools/experiments/chunk-water-scene-patch.mjs','tools/experiments/chunk-water-bed-candidate.js','src/rendering/scene.js','src/rendering/natural-water-edges.js','public/wild-engine/spatial-threaded.wasm'];
 const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');fs.writeFileSync(out+'/provenance.json',JSON.stringify({mode,biome,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sources:Object.fromEntries(files.map(p=>[p,sha(p)])),conditions:Object.fromEntries(Object.entries(env).filter(([k])=>k.startsWith('WG_'))),scope:'Functional diagnostic using existing historical populated biome fixture. Not art or performance acceptance; context case pauses simulation for state equality.'},null,2));
 console.log('Starting '+biome+' '+mode);const r=spawnSync(process.execPath,[temp],{env,encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(out+'/execution.log',(r.stdout??'')+(r.stderr??''));if(r.status!==0)throw Error(mode+' failed '+r.status);console.log('Completed '+biome+' '+mode);
}}finally{fs.unlinkSync(temp);}
