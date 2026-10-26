import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const root='docs/qa/tree-atlas-refresh-20261026/comparison';
const modes=['3d','raster','imagegen'];
const labels=['Modelos 3D con LOD','Atlas rasterizados del motor','Atlas raster + imagegen (solo especie 0)'];
const svg=(text,w=1280,h=48)=>Buffer.from(`<svg width="${w}" height="${h}"><rect width="100%" height="100%" fill="#18221b"/><text x="24" y="33" fill="white" font-family="Arial" font-size="24">${text}</text></svg>`);
const audit=[];
for(const phase of (process.argv.length>2?process.argv.slice(2):['day','night'])){
 const inputs=[];const crops=[];const horizons=[];
 for(let i=0;i<3;i++){
  const path=`${root}/${phase}-${modes[i]}`;
  const report=JSON.parse(await readFile(`${path}/report.json`));
  const horizon=JSON.parse(await readFile(`${path}/horizon-camera.json`));
  audit.push({phase,mode:modes[i],seed:report.data.seed,camera:report.data.camera,target:report.data.target,horizon,errors:report.errors,time:JSON.parse(report.data.snapshot).time});
  horizons.push({input:svg(labels[i]),left:i*1280,top:0},{input:`${path}/horizon.png`,left:i*1280,top:48});
  inputs.push({input:svg(labels[i]),left:i*1280,top:0},{input:`${path}/normal.png`,left:i*1280,top:48});
  const crop=await sharp(`${path}/normal.png`).extract({left:0,top:0,width:1100,height:210}).resize(1280,244).png().toBuffer();
  crops.push({input:svg(labels[i]),left:i*1280,top:0},{input:crop,left:i*1280,top:48});
 }
 await sharp({create:{width:3840,height:768,channels:3,background:'#18221b'}}).composite(inputs).png().toFile(`${root}/${phase}-comparison.png`);
 await sharp({create:{width:3840,height:768,channels:3,background:'#18221b'}}).composite(horizons).png().toFile(`${root}/${phase}-horizon-comparison.png`);
 await sharp({create:{width:3840,height:292,channels:3,background:'#18221b'}}).composite(crops).png().toFile(`${root}/${phase}-tree-band.png`);
}
await writeFile(`${root}/comparison-audit.json`,JSON.stringify({scope:'Real renderer screenshots. Imagegen pilot affects only mangrove species slot0; other species retain direct raster atlases. Normal gameplay camera, identical seed712/day100/night400.',runs:audit},null,2));
console.log(audit);
const mobile=[];
for(let row=0;row<2;row++)for(let col=0;col<2;col++){
 const phase=['day','night'][row],mode=['raster','imagegen'][col];
 const label=`${row?'Noche':'Dia'} — ${col?'Imagegen (solo especie 0)':'Raster directo'}`;
 const crop=await sharp(`${root}/${phase}-${mode}/horizon.png`).extract({left:0,top:300,width:1050,height:280}).png().toBuffer();
 mobile.push({input:svg(label,1050),left:col*1050,top:row*328},{input:crop,left:col*1050,top:row*328+48});
}
await sharp({create:{width:2100,height:656,channels:3,background:'#18221b'}}).composite(mobile).png().toFile(`${root}/raster-imagegen-horizon-detail.png`);
