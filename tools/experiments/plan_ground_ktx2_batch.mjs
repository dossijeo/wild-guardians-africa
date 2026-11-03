// Ground shader consumes raw samples; mud patch base additionally uses sRGB.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {assetUrl} from '../../src/rendering/asset-url.js';
import sharp from 'sharp';
const output=process.argv[2]??'.cache/ktx2-fixture/ground-batch.json',tiles=JSON.parse(await readFile('public/content/ground-materials.json','utf8')),items=new Map();
function add(url,role,kind,biome,consumer){if(!url)return;const path=assetUrl(url);if(!/^\/(assets|content)\//.test(path)||path.includes('..'))throw Error('Unsafe ground texture '+path);const source='public'+path,key=source+'|'+kind,entry=items.get(key)??{source,kind,uses:[]};entry.uses.push({biome,role,consumer});items.set(key,entry);}
for(const [biome,tile] of Object.entries(tiles)){
 for(const role of ['base','normal','arh'])add(tile[role],role,role==='normal'?'normal':'data',biome,'BiomeGround raw sampler');
 if(tile.mudPatches)for(const role of ['base','normal','arh']){add(tile.mudPatches[role],role,role==='normal'?'normal':'data',biome,'BiomeGround raw sampler');add(tile.mudPatches[role],role,role==='base'?'color':role==='normal'?'normal':'data',biome,'MudPatches');}
}
const records=[],unresolved=[];for(const item of [...items.values()].sort((a,b)=>a.source.localeCompare(b.source)||a.kind.localeCompare(b.kind))){const {width,height}=await sharp(item.source).metadata();if(!width||!height||width%4||height%4)unresolved.push({...item,width,height,reason:'Current packer requires dimensions divisible by four'});else records.push({...item,width,height});}await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({records,unresolved,scope:'Manifest ground materials only; raw ground base samples use BC7 UNORM, while mud patch base also requires an sRGB variant. Visual labs and procedurally generated ground masks are excluded.'},null,2)+'\n');console.log(JSON.stringify({output,records:records.length,uses:records.reduce((n,r)=>n+r.uses.length,0),unresolved:unresolved.length}));
