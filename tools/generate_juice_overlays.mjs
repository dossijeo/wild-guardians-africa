// Reproducible extraction of the user-provided 200% overlay lab; excludes demo backgrounds/UI.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
const input=process.argv[2];if(!input)throw Error('Pass the original overlay lab HTML path');
const bytes=await fs.readFile(input),html=bytes.toString('utf8');
const assets=JSON.parse(html.match(/<script[^>]*id="embedded-assets"[^>]*>([\s\S]*?)<\/script>/)[1]);
const records=[];await fs.mkdir('assets-source/game-juice',{recursive:true});await fs.mkdir('public/content/game-juice',{recursive:true});
for(const [id,uri] of Object.entries(assets.textures)){
 const source=Buffer.from(uri.split(',')[1],'base64');await fs.writeFile(`assets-source/game-juice/${id}.png`,source);
 const runtime=await sharp(source).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:6}).toBuffer();
 await fs.writeFile(`public/content/game-juice/${id}.webp`,runtime);const {width,height}=await sharp(runtime).metadata();records.push({id,sourceBytes:source.length,runtimeBytes:runtime.length,width,height,sha256:crypto.createHash('sha256').update(runtime).digest('hex')});
}
await fs.writeFile('public/content/game-juice/provenance.json',JSON.stringify({lab:'Wild_Guardians_Overlay_Lab_200pct_Sin_Textos.html',labSha256:crypto.createHash('sha256').update(bytes).digest('hex'),intensity:2,records},null,2)+'\n');console.log(records);
