import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
const file='tools/experiments/native-far-ground.js',candidate=await readFile(file,'utf8');
const anchor='if(!nativeWaterMask&&!data.water&&world.nav?.field)';
if(candidate.split(anchor).length!==2)throw Error('Unexpected candidate source');
const baseline=candidate.replace(anchor,'if(!data.water&&world.nav?.field)');
const root='docs/qa/residual-spikes-20261027/far-water-skip-abab';await mkdir(root,{recursive:true});
const hash=s=>createHash('sha256').update(s).digest('hex');
const env={...process.env,WG_THREAD_PORT:'5220',WG_THREAD_BIOME:'manglares',WG_THREAD_QUALITY:'media',WG_THREAD_FIXTURE_FILE:'docs/qa/residual-spikes-20261027/quality-current-fixture.json',WG_CURRENT_REVIEW:'1',WG_THREAD_DEFAULT_STREAMING:'1',WG_THREAD_ACTIVE:'1',WG_THREAD_QUALITY_CYCLE:'1',WG_THREAD_QUALITY_MENU_PROTOCOL:'1',WG_THREAD_QUALITY_ACTIVE:'1',WG_THREAD_QUALITY_PHASES:'1',WG_THREAD_QUALITY_EXECUTION:'1'};
// Sequential source substitution only while no browser run is alive; always restore.
try{
 for(const name of ['A1','B1','A2','B2']){
  const source=name.startsWith('A')?baseline:candidate;await writeFile(file,source);
  await writeFile(`${root}/${name}-provenance.json`,JSON.stringify({name,sourceHash:hash(source),candidateHash:hash(candidate),baselineHash:hash(baseline),controls:env.WG_THREAD_FIXTURE_FILE,scope:'Instrumented quality-cycle ABAB; warnings retained, no clean-console assumption'},null,2));
  console.log('Starting',name);const log=createWriteStream(`${root}/${name}.log`);
  try{await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tools/experiments/check-spatial-thread-game.mjs'],{env:{...env,WG_THREAD_REPORT:`${root}/${name}.json`},stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`${name} exited ${code}`)));});}finally{await new Promise(resolve=>log.end(resolve));}
  console.log('Completed',name);
 }
}finally{await writeFile(file,candidate);}
