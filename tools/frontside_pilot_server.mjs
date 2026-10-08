// Isolated local QA server. Only the fixed pilot report artifact may be written.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const server=await createServer({server:{host:'127.0.0.1',port:5284,strictPort:true},plugins:[{
  name:'frontside-pilot-report',configureServer(server){server.middlewares.use('/__frontside_report',async(req,res)=>{
    if(req.method!=='POST'){res.statusCode=405;res.end();return;}
    try{let body='';for await(const chunk of req){body+=chunk;if(body.length>20_000_000)throw Error('Report limit');}
      const report=JSON.parse(body);if(!['SELECTION_ONLY_NOT_APPROVED','VISUAL_SCREEN_NOT_APPROVED'].includes(report.status))throw Error('Unexpected report');
      const prefix=report.status==='SELECTION_ONLY_NOT_APPROVED'?(report.cropOnly?'runtime-visibility-crop-pairs':report.workerOnly?'runtime-visibility-worker1024':'runtime-visibility'):report.cropVisual?'crop-runtime-visual':'worker-runtime-visual';
      await mkdir('docs/qa/frontside-model-pilot',{recursive:true});
      if(report.capturePng){if(!/^data:image\/png;base64,/.test(report.capturePng))throw Error('Invalid capture');
        await writeFile('docs/qa/frontside-model-pilot/'+prefix+'-last-frame.png',Buffer.from(report.capturePng.split(',')[1],'base64'));
        delete report.capturePng;report.capture=prefix+'-last-frame.png';}
      await writeFile('docs/qa/frontside-model-pilot/'+prefix+'-selection.json',JSON.stringify(report,null,2)+'\n');
      res.setHeader('Content-Type','application/json');res.end('{"saved":true}');
    }catch(error){res.statusCode=400;res.end(String(error));}
  });server.middlewares.use('/__frontside_candidate',async(req,res)=>{
    if(req.method==='GET'&&req.url==='/youngMale-crate11-normal'){try{const file=await import('node:fs/promises').then(fs=>fs.readFile('.cache/frontside-model-pilot/candidates/archive/4053b9b717e840313b7346fc85ead6b24e15e45b128ea5f876f711b0cf46bc9b.glb'));res.setHeader('Content-Type','model/gltf-binary');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}return;}
    const paths={'/youngMale-badge-field':'.cache/frontside-model-pilot/candidates/archive/e6158a9888cb090c8fee4fa2dc23b73b9fc13c02617cdb0bd7f8920184237863.glb','/youngMale':'.cache/frontside-model-pilot/candidates/youngMale-selective-reverse-NOT-APPROVED-web.glb','/youngMale-local-normal':'.cache/frontside-model-pilot/candidates/Can_Nozzle_geometry_4-local-normal-NOT-APPROVED-web.glb','/youngMale-badge-normal':'.cache/frontside-model-pilot/candidates/Can_badge_geometry_5-normals-cleanup-v2-NOT-APPROVED-web.glb','/maize-leaf-reduction':'.cache/frontside-model-pilot/candidates/archive/4d6d5dd729211e9ed5e429915ec81960da5e6b2197d1c8982a3dbb6a92893065.json'};
    if(req.method!=='GET'||!paths[req.url]){res.statusCode=404;res.end();return;}
    try{const file=await import('node:fs/promises').then(fs=>fs.readFile(paths[req.url]));res.setHeader('Content-Type',paths[req.url].endsWith('.json')?'application/json':'model/gltf-binary');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}
  });}
}]});await server.listen();server.printUrls();
