import fs from 'node:fs/promises';
import sharp from 'sharp';
const dir=process.argv[2];
if(!dir)throw Error('Provide same-area capture directory');
const audit=JSON.parse(await fs.readFile(dir+'/pixel-audit.json'));
const [a,b]=await Promise.all(['elevated.png','regional-all.png'].map(name=>sharp(dir+'/'+name).removeAlpha().raw().toBuffer({resolveWithObject:true})));
if(a.info.width!==b.info.width||a.info.height!==b.info.height)throw Error('Image size mismatch');
const rows=[];
for(const row of audit){const h=row.hits.find(h=>h.tags.fluid&&h.field.mask>.95);if(!h)continue;const [x,y]=row.pixel,offset=(y*a.info.width+x)*3,old=[...a.data.subarray(offset,offset+3)],next=[...b.data.subarray(offset,offset+3)];rows.push({pixel:row.pixel,world:h.point,mask:h.field.mask,old,next,meanAbsolute:old.reduce((s,c,i)=>s+Math.abs(c-next[i]),0)/3});}
const out={scope:'Screen samples intersecting native water with mask > .95. Raycast excludes props: foliage can occlude samples; inspect images before treating this as pure-water error.',samples:rows.length,meanAbsolute:rows.reduce((s,r)=>s+r.meanAbsolute,0)/rows.length,rows};
await fs.writeFile(dir+'/same-area-rgb.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
