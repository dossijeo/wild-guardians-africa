import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const root='docs/qa/tree-atlas-refresh-20261026/ground-comparison';
const variants=['3d','raster','imagegen'];const rows=[];const data=[];
for(const mode of variants){const base=`${root}/day-${mode}`,audit=JSON.parse(await readFile(`${base}/ground-draw-audit.json`)),report=JSON.parse(await readFile(`${base}/report.json`));rows.push({mode,pose:audit.pose,camera:audit.camera,quaternion:audit.quaternion,canvas:audit.canvas,pixelRatio:audit.pixelRatio,frames:audit.frames,cardDraws:audit.cardDraws,modelDraws:audit.modelDraws,unready:audit.adapters.map(a=>a.unreadyWithinDensity),errors:report.errors});data.push(await sharp(`${base}/ground.png`).removeAlpha().raw().toBuffer());}
if(rows.some(x=>JSON.stringify(x.camera)!==JSON.stringify(rows[0].camera)||JSON.stringify(x.quaternion)!==JSON.stringify(rows[0].quaternion)||x.errors.length))throw Error('Mismatch');
const region={x:0,y:300,width:1600,height:230},diffs=[];
for(const [a,b] of [[0,1],[1,2]]){let count=0,sum=0,max=0;for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){let d=0;const p=(y*1920+x)*3;for(let c=0;c<3;c++)d+=Math.abs(data[a][p+c]-data[b][p+c]);sum+=d;max=Math.max(max,d);if(d>30)count++;}diffs.push({a:variants[a],b:variants[b],pixelsOver30RgbSum:count,totalPixels:region.width*region.height,meanAbsoluteChannelDifference:sum/(region.width*region.height*3),maxRgbSum:max});}
await writeFile(`${root}/summary.json`,JSON.stringify({scope:'Ground level actual renderer submission audited. Pixel differences in tree band, not quality score. Near 3D occludes some distant pilot; no density changes for visibility.',region,rows,diffs},null,2));console.log(JSON.stringify({rows,diffs},null,2));
