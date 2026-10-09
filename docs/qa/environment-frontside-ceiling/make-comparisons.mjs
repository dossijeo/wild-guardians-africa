// QA contact sheets only; original screenshots remain unchanged.
import sharp from 'sharp';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
for(const biome of ['sabana','manglares'])for(const view of ['overview','opposite']){
 const left=await sharp(join(dir,biome+'-'+view+'-double.jpg')).resize({width:620}).png().toBuffer();
 const right=await sharp(join(dir,biome+'-'+view+'-front.jpg')).resize({width:620}).png().toBuffer();
 const meta=await sharp(left).metadata();
 const label=Buffer.from('<svg width="1240" height="32"><rect width="1240" height="32" fill="#20251e"/><g fill="white" font-family="sans-serif" font-size="18"><text x="12" y="23">Antes: DoubleSide</text><text x="632" y="23">Después: FrontSide sin reparar</text></g></svg>');
 await sharp({create:{width:1240,height:meta.height+32,channels:4,background:'#20251e'}}).composite([{input:label,left:0,top:0},{input:left,left:0,top:32},{input:right,left:620,top:32}]).png().toFile(join(dir,biome+'-'+view+'-comparison.png'));
}
