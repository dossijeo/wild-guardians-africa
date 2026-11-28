import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {authority,scenarios,guards,integrationTests,testPath} from './catalog.mjs';
import {root,git,files,digest,fingerprint,changedFiles,selectTests,runDirectory,command,saveReport,browserJobs} from './core.mjs';

const [mode='help',...args]=process.argv.slice(2);
const value=key=>{const i=args.indexOf(key);if(i<0)return undefined;if(!args[i+1]||args[i+1].startsWith('--'))throw Error(`Missing value for ${key}`);return args[i+1];};
const allowed={a5:['--scenario','--run','--gpu','--receipt'],context:['--json'],impact:['--base','--files','--tier','--run','--gpu'],lab:['--scenario','--run','--gpu','--require-complete'],research:['--topic'],check:[],help:[]};
if(!allowed[mode]||args.some(a=>a.startsWith('--')&&!allowed[mode].includes(a)))throw Error('Unknown command/option. Use help.');
const emit=x=>console.log(JSON.stringify(x,null,2));
function context(){
  const sources=authority.map(file=>{const text=readFileSync(path.join(root,file),'utf8');return {file,sha256:digest(text),opening:text.split(/\r?\n/).slice(0,9).join('\n')};});
  const checklist=readFileSync(path.join(root,authority[2]),'utf8');
  let sync;try{sync=git(['rev-list','--left-right','--count','HEAD...origin/codex/guardian-3d-animation']);}catch{sync='upstream unavailable';}
  const data={head:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),localRemoteDifference:sync,remoteNotice:'Local tracking ref only; git fetch before integration.',
    sources,deliverables:checklist.split(/\r?\n/).filter(l=>/^\| \*\*A6-04\.[ef]-R/.test(l)),
    parentCriteria:checklist.split(/\r?\n/).filter(l=>/^- \[[ x]\] \*\*A6-\d/.test(l)),
    recentCommits:git(['log','-5','--oneline']),modifiedCode:changedFiles().filter(p=>/^(src|tests|tools|public\/wild-engine)\//.test(p)),
    operatingReference:'docs/guardian/MIGRATION-OPERATIONS.md',handoff:'docs/guardian/MIGRATION-SUPPORT-HANDOFF.md',scenarios:Object.keys(scenarios)};
  if(args.includes('--json'))emit(data);else console.log(`# Contexto derivado (no modifica el plan)\n${data.branch} @ ${data.head}\nLocal/remoto: ${sync}\n${data.remoteNotice}\n\n${sources[0].opening}\n\n${data.deliverables.join('\n')}\n\n${data.parentCriteria.join('\n')}\n\n${data.recentCommits}\n\n${data.modifiedCode.length} archivos de código/pruebas/herramientas con cambios; --json da rutas y hashes de autoridad.\nReferencia: ${data.operatingReference}\nTraspaso: ${data.handoff}`);
}
async function run(tests,jobs,label,{pending=[],build=false,requiredGpu=false,selection=null}={}){
  const before=fingerprint(),dir=runDirectory(label),results=[];
  console.log(`Evidence: ${dir}`);
  if(tests.length){
    const all=files().filter(p=>/^tests\/.*\.test\.js$/.test(p));
    // Use the repository's canonical directory entry for a full suite; avoid
    // exceeding Windows' command line limit with thousands of test paths.
    const inputs=tests.length===all.length&&all.every(p=>tests.includes(p))?['tests']:tests;
    results.push(await command(['--test','--test-concurrency=2','--test-reporter=tap',...inputs],dir,'node'));
  }
  // Browser runs remain opt-in: no automatic benchmark campaign or GPU contention.
  if(args.includes('--gpu'))for(const job of jobs){
    console.log(`Browser component: ${job.name}`);
    const receiptPath=path.join(dir,`${job.name}.json`);
    const result=await command([job.script],dir,job.name,{env:{...job.env,OUTPUT:receiptPath,QA_BASE_URL:process.env.QA_BASE_URL??'http://127.0.0.1:5181'}});
    if(result.status==='passed'){
      try{
        const raw=readFileSync(receiptPath),receipt=JSON.parse(raw);
        if(!receipt.result||['errors','consoleErrors','httpFailures','requestFailures'].some(k=>receipt[k]?.length))throw Error('Browser receipt contains errors or lacks result');
        result.receipt={path:receiptPath,sha256:digest(raw)};
      }catch(error){result.status='failed';result.receiptError=String(error);}
    }
    results.push(result);
  }
  if(build)results.push(await command(['node_modules/vite/bin/vite.js','build'],dir,'build'));
  const report={version:1,kind:label,selection,results,pending,requiredGpu,missingGpu:requiredGpu&&!args.includes('--gpu'),verticalComplete:false,
    scope:'Existing component/integration evidence only. Never closes A6 or grants gameplay authority.'};
  const output=saveReport(dir,report,before);
  emit({report:output,results:results.map(r=>({status:r.status,code:r.code,log:r.log})),pending,missingGpu:report.missingGpu,stable:report.context.stable,verticalComplete:false});
  process.exitCode=results.some(r=>r.status==='failed')?1:results.some(r=>r.status==='incomplete')||!report.context.stable||report.missingGpu||(args.includes('--require-complete')&&pending.length)?2:0;
}
async function main(){
  if(mode==='a5')return (await import('./a5-lab.mjs')).runA5Lab(args);
  if(mode==='context')return context();
  if(mode==='impact'){
    const changed=value('--files')?.split(',').filter(Boolean)??changedFiles(value('--base'));
    const plan=selectTests(changed,value('--tier')??'focused');
    if(!args.includes('--run'))return emit({...plan,browserJobs:plan.browserRequired?browserJobs(['harvest','gates','recovery'],scenarios):[]});
    const jobs=plan.browserRequired?browserJobs(['harvest','gates','recovery'],scenarios):[];
    return run(plan.tests,jobs,`impact-${plan.tier}`,{selection:plan,build:plan.buildRequired&&plan.tier!=='focused',requiredGpu:plan.browserRequired});
  }
  if(mode==='lab'){
    const names=(value('--scenario')??'harvest').split(',');if(names.includes('all'))names.splice(0,names.length,...Object.keys(scenarios));
    for(const name of names)if(!scenarios[name])throw Error(`Unknown scenario: ${name}`);
    const tests=[...new Set([...guards,...names.flatMap(n=>scenarios[n].tests.map(testPath))])].sort(),jobs=browserJobs(names,scenarios);
    const pending=names.flatMap(name=>scenarios[name].pending.map(reason=>({scenario:name,reason})));
    if(!args.includes('--run'))return emit({scenarios:names.map(name=>({name,...scenarios[name]})),tests,browserJobs:jobs,pending,verticalComplete:false});
    return run(tests,jobs,'lab',{pending,requiredGpu:jobs.length>0});
  }
  if(mode==='check'){
    const paths=[...authority,...guards,...integrationTests,
      ...Object.values(scenarios).flatMap(s=>[s.browser,s.evidence].filter(Boolean))];
    for(const file of paths)if(!existsSync(path.join(root,file)))throw Error(`Missing catalog reference: ${file}`);
    for(const file of ['MIGRATION-OPERATIONS.md','MIGRATION-VERTICALS.md','MIGRATION-RESEARCH.md','MIGRATION-SUPPORT-HANDOFF.md']){
      const full=path.join(root,'docs/guardian',file),text=readFileSync(full,'utf8');
      for(const match of text.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g))if(!/^https?:/.test(match[1])&&!existsSync(path.resolve(path.dirname(full),match[1])))throw Error(`Broken link in ${file}: ${match[1]}`);
    }
    emit({catalog:'valid',references:paths.length,closure:'not evaluated'});return;
  }
  if(mode==='research'){
    const topic=value('--topic')??'siguiente dependencia',dir=runDirectory('research');
    const template=readFileSync(path.join(root,'docs/guardian/MIGRATION-RESEARCH-TEMPLATE.md'),'utf8');
    const output=path.join(dir,'brief.md');writeFileSync(output,template.replace('{{problem}}',topic).replace('{{head}}',git(['rev-parse','HEAD'])));
    emit({output,procedure:'docs/guardian/MIGRATION-RESEARCH.md',delegation:'Optional one-shot read-only research; never start a persistent agent or write production code.'});return;
  }
  console.log(`node tools/guardian/migration-support/cli.mjs <command>
a5 [--scenario all|cold,progressive,steady,recovery,local,retirement] [--run] [--gpu]
a5 --receipt FILE                       Recheck .json/.json.gz evidence; does not execute GPU
A5 guide: docs/guardian/a5-resource-lab-handoff-20261119.md
context [--json]                         Derive state from canonical documents/Git
impact [--base REV|--files a,b] [--tier focused|integration|broad] [--run] [--gpu]
lab [--scenario harvest|all|a,b] [--run] [--gpu] [--require-complete]
research [--topic TEXT]                  Create a brief in ignored .cache
check                                   Verify catalog and local documentation links
Without --run: selection only. No dependencies installed or WASM rebuilt.
Exit: 0 requested component checks pass; 1 failure; 2 pending GPU/full acceptance or concurrent edits.
GPU: existing Vite server, hardware Edge and PLAYWRIGHT_MODULE required by existing runners.
Evidence is fresh, isolated under .cache/migration-support; no cached pass is reused.`);
}
await main();
