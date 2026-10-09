import {createServer} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import {webPackagePlugin} from './web-package.mjs';
const root=process.cwd(),output=path.join(root,'docs/qa/crops-v4/native');
const exporter={name:'crops-v4-native-report',configureServer(server){server.middlewares.use((req,res,next)=>{
 if(req.url!=='/__crops_v4_report')return next();
 if(req.method!=='POST'){res.statusCode=405;res.end();return;}
 let body='',oversized=false;req.on('data',chunk=>{body+=chunk;if(body.length>24*1024*1024){oversized=true;req.destroy();}});
 req.on('end',()=>{try{
  if(oversized)throw Error('Oversized report');const {report,png}=JSON.parse(body);
  if(report.recipeVersion!==4||report.samples?.length!==8||report.sides?.length!==72||!report.sides.every(m=>m.side===0&&m.shadowSide===0&&m.depthSide===0)||report.cleanup?.closed!==true||!/^data:image\/png;base64,/.test(png))throw Error('Invalid CULT V4 functional receipt');
  const bytes=Buffer.from(png.split(',')[1],'base64');if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid PNG');
  fs.mkdirSync(output,{recursive:true});const id=new Date().toISOString().replace(/[:.]/g,'-');
  fs.writeFileSync(path.join(output,id+'.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(output,id+'.png'),bytes);
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:id}));
 }catch(error){res.statusCode=400;res.end(String(error.message));}});
});}};
const server=await createServer({configFile:false,root,cacheDir:path.join(root,'.cache/vite-crops-v4'),base:'./',optimizeDeps:{entries:['tests/browser/crops-v4-world.html']},plugins:[exporter,webPackagePlugin()],server:{host:'127.0.0.1',port:5285,strictPort:true}});
await server.listen();console.log('CULT V4 functional QA: http://127.0.0.1:5285/tests/browser/crops-v4-world.html');
