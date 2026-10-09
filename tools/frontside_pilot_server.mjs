// Isolated local QA server. Only the fixed pilot report artifact may be written.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {sourceFineIdentity,sourceFineMapping,sourceFineReportPrefix} from './lib/frontside-source-fine-report.mjs';
import {readFileSync} from 'node:fs';
import {sharedLeafReportPrefix} from './lib/frontside-shared-leaf-report.mjs';
import {sharedLeafContinuousReportPrefix} from './lib/frontside-shared-leaf-continuous-report.mjs';
import {worldMaizeReportPrefix} from './lib/frontside-world-maize-report.mjs';
import {sharedLeafGpuReportPrefix} from './lib/frontside-shared-leaf-gpu-report.mjs';
import {bridgeIndexReportPrefix} from './lib/frontside-bridge-index-report.mjs';
import {denseWorldMaizeReportPrefix} from './lib/frontside-dense-world-maize-report.mjs';
// Startup checks the independently loaded real web mapping against this fixed
// experiment's identities; a stale or different mapping cannot be reported.
sourceFineMapping(JSON.parse(readFileSync('content/manifests/web-assets.json')).records.find(r=>r.source===sourceFineIdentity.source));
const server=await createServer({server:{host:'127.0.0.1',port:5284,strictPort:true},plugins:[{
  name:'frontside-pilot-report',configureServer(server){server.middlewares.use('/__frontside_export_preflight',async(req,res)=>{
    if(req.method!=='POST'){res.statusCode=405;res.end();return;}
    try{let body='';for await(const chunk of req){body+=chunk;if(body.length>100_000)throw Error('Preflight limit');}
      const preflight=JSON.parse(body);if(!['SOURCE_FINE_EXPORT_PREFLIGHT_ONLY','SHARED_LEAF_EXPORT_PREFLIGHT_ONLY','SHARED_LEAF_CONTINUOUS_EXPORT_PREFLIGHT_ONLY','SHARED_LEAF_GPU_EXPORT_PREFLIGHT_ONLY','WORLD_MAIZE_EXPORT_PREFLIGHT_ONLY','BRIDGE_INDEX_EXPORT_PREFLIGHT_ONLY','DENSE_WORLD_MAIZE_EXPORT_PREFLIGHT_ONLY'].includes(preflight.status)||preflight.gpuDraws!==0)throw Error('Unexpected export preflight');
      const prefix=preflight.status==='DENSE_WORLD_MAIZE_EXPORT_PREFLIGHT_ONLY'?denseWorldMaizeReportPrefix(preflight.report,{preflight:true}):preflight.status==='BRIDGE_INDEX_EXPORT_PREFLIGHT_ONLY'?bridgeIndexReportPrefix(preflight.report,{preflight:true}):preflight.status==='WORLD_MAIZE_EXPORT_PREFLIGHT_ONLY'?worldMaizeReportPrefix(preflight.report):preflight.status==='SHARED_LEAF_GPU_EXPORT_PREFLIGHT_ONLY'?sharedLeafGpuReportPrefix(preflight.report):preflight.status==='SHARED_LEAF_CONTINUOUS_EXPORT_PREFLIGHT_ONLY'?sharedLeafContinuousReportPrefix(preflight.report):preflight.status==='SHARED_LEAF_EXPORT_PREFLIGHT_ONLY'?sharedLeafReportPrefix(preflight.report):sourceFineReportPrefix(preflight.report);
      // Deliberately writes no visual artifact: placeholder fields exercise
      // construction/JSON transport, not measured native quality.
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'EXPORT_PREFLIGHT_PASS_NOT_NATIVE',prefix,artifactsWritten:false}));
    }catch(error){res.statusCode=400;res.end(String(error));}
  });server.middlewares.use('/__frontside_report',async(req,res)=>{
    if(req.method!=='POST'){res.statusCode=405;res.end();return;}
    let report;
    try{let body='';for await(const chunk of req){body+=chunk;if(body.length>20_000_000)throw Error('Report limit');}
      report=JSON.parse(body);const sourceFine=report.status==='SOURCE_FINE_FIELD_TRAINING_NOT_APPROVED';if(!sourceFine&&!['SELECTION_ONLY_NOT_APPROVED','VISUAL_SCREEN_NOT_APPROVED','GPU_CANDIDATE_EXPERIMENT_NOT_APPROVED','WORLD_MAIZE_QA_NOT_APPROVED','WORLD_DENSE_MAIZE_GPU_NOT_APPROVED'].includes(report.status))throw Error('Unexpected report');
      if(report.status==='GPU_CANDIDATE_EXPERIMENT_NOT_APPROVED'&&report.sharedLeafGpuNet!==true)throw Error('GPU report identity missing');
      const prefix=report.status==='WORLD_DENSE_MAIZE_GPU_NOT_APPROVED'?denseWorldMaizeReportPrefix(report):report.originalBridgeIndexHuman===true?bridgeIndexReportPrefix(report):report.status==='WORLD_MAIZE_QA_NOT_APPROVED'?worldMaizeReportPrefix(report):report.sharedLeafGpuNet?sharedLeafGpuReportPrefix(report):sourceFine?sourceFineReportPrefix(report):report.sharedLeafContinuousHuman?sharedLeafContinuousReportPrefix(report):report.sharedLeafReverseHuman?sharedLeafReportPrefix(report):report.status==='SELECTION_ONLY_NOT_APPROVED'?(report.cropOnly?'runtime-visibility-crop-pairs':report.workerOnly?'runtime-visibility-worker1024':'runtime-visibility'):report.cropVisual?'crop-runtime-visual':'worker-runtime-visual';
      await mkdir('docs/qa/frontside-model-pilot',{recursive:true});
      if(report.capturePng){if(!/^data:image\/png;base64,/.test(report.capturePng))throw Error('Invalid capture');
        await writeFile('docs/qa/frontside-model-pilot/'+prefix+'-last-frame.png',Buffer.from(report.capturePng.split(',')[1],'base64'));
        delete report.capturePng;report.capture=prefix+'-last-frame.png';}
      await writeFile('docs/qa/frontside-model-pilot/'+prefix+'-selection.json',JSON.stringify(report,null,2)+'\n');
      res.setHeader('Content-Type','application/json');res.end('{"saved":true}');
    }catch(error){
      if(error.validationFailures&&(report?.denseWorldMaizeQa===true||report?.originalBridgeIndexHuman===true||report?.status==='SOURCE_FINE_FIELD_TRAINING_NOT_APPROVED'||report?.sharedLeafReverseHuman===true||report?.sharedLeafContinuousHuman===true||report?.sharedLeafGpuNet===true||report?.worldMaizeQa===true)){
        // Preserve a rejected native request in a distinct fixed instrument
        // artifact. It is never mistaken for the validated report route.
        await mkdir('docs/qa/frontside-model-pilot',{recursive:true});
        const rejection=report.denseWorldMaizeQa?'maize-world-dense-rejected-request':report.originalBridgeIndexHuman?'crop-bridge-index-double-rejected-request':report.worldMaizeQa?'maize-world-qa-rejected-request':report.sharedLeafGpuNet?'crop-leaf-shared-gpu-rejected-request':report.sharedLeafContinuousHuman?'crop-leaf-shared-continuous-human-rejected-request':report.sharedLeafReverseHuman?'crop-leaf-shared-human-rejected-request':'crop-source-fine-field-rejected-request';
        await writeFile('docs/qa/frontside-model-pilot/'+rejection+'.json',JSON.stringify({status:'INSTRUMENT_SCHEMA_REJECTED_NOT_APPROVED',validationFailures:error.validationFailures,report},null,2)+'\n');
      }
      res.statusCode=400;res.end(String(error));
    }
  });server.middlewares.use('/__frontside_candidate',async(req,res)=>{
    if(req.method==='GET'&&req.url==='/maize-leaf-shared-compact'){try{const file=await import('node:fs/promises').then(fs=>fs.readFile('.cache/frontside-model-pilot/candidates/archive/3eba51ae256663c20bdfcfc4f9e0133a304e8a6dfa25b072a07154b82f0ee65c.wgleaf'));res.setHeader('Content-Type','application/octet-stream');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}return;}
    if(req.method==='GET'&&req.url==='/maize-soil-budget'){try{const file=await import('node:fs/promises').then(fs=>fs.readFile('.cache/frontside-model-pilot/candidates/archive/e1e5886daaef7291b0553c46ea7e985661afb5e015cae7737958742bbd0185ff.json'));res.setHeader('Content-Type','application/json');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}return;}
    const stemArchives={'/maize-stem-reduction':'8ee78b05ef4c647fa8f3f5a27be17767a4dc455893452ad1f70c1434de35394e','/maize-stem-budget-max':'cb6b139a611ea35f6cbf5a5c80c2fc9d1fed8999ec477b70b68e560a3586dbc9','/maize-stem-anchor-normals':'1a0b22844303e38748162a03c2cdb333e671caccd092de68cd3926e78262a8e8'};
    if(req.method==='GET'&&stemArchives[req.url]){try{const file=await import('node:fs/promises').then(fs=>fs.readFile('.cache/frontside-model-pilot/candidates/archive/'+stemArchives[req.url]+'.json'));res.setHeader('Content-Type','application/json');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}return;}
    const sourceControls={'/youngMale-closed-subset':'74a0b60e73a9f6a78eb7bf0ef61954a5b08a9bff4ba52e018f6019c77d7c15d1','/youngMale-source-repack':'b785ae89e25abd5a1e06b0113db955130b6dc5a42800af645469ad6bbb81b078','/youngMale-crate11-degenerate':'50eb7f5077dd983d7bd4d4e1cac455ac990d6fa2ddedc0dc35926a25145af791'};
    if(req.method==='GET'&&sourceControls[req.url]){try{const file=await import('node:fs/promises').then(fs=>fs.readFile('.cache/frontside-model-pilot/candidates/archive/'+sourceControls[req.url]+'.glb'));res.setHeader('Content-Type','model/gltf-binary');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}return;}
    if(req.method==='GET'&&req.url==='/youngMale-crate11-normal'){try{const file=await import('node:fs/promises').then(fs=>fs.readFile('.cache/frontside-model-pilot/candidates/archive/4053b9b717e840313b7346fc85ead6b24e15e45b128ea5f876f711b0cf46bc9b.glb'));res.setHeader('Content-Type','model/gltf-binary');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}return;}
    const paths={'/youngMale-badge-field':'.cache/frontside-model-pilot/candidates/archive/e6158a9888cb090c8fee4fa2dc23b73b9fc13c02617cdb0bd7f8920184237863.glb','/youngMale':'.cache/frontside-model-pilot/candidates/youngMale-selective-reverse-NOT-APPROVED-web.glb','/youngMale-local-normal':'.cache/frontside-model-pilot/candidates/Can_Nozzle_geometry_4-local-normal-NOT-APPROVED-web.glb','/youngMale-badge-normal':'.cache/frontside-model-pilot/candidates/Can_badge_geometry_5-normals-cleanup-v2-NOT-APPROVED-web.glb','/maize-leaf-reduction':'.cache/frontside-model-pilot/candidates/archive/4d6d5dd729211e9ed5e429915ec81960da5e6b2197d1c8982a3dbb6a92893065.json'};
    if(req.method!=='GET'||!paths[req.url]){res.statusCode=404;res.end();return;}
    try{const file=await import('node:fs/promises').then(fs=>fs.readFile(paths[req.url]));res.setHeader('Content-Type',paths[req.url].endsWith('.json')?'application/json':'model/gltf-binary');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}
  });}
}]});await server.listen();server.printUrls();
