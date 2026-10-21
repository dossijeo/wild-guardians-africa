import sharp from 'sharp';
import {execFileSync} from 'node:child_process';

// Preserve the already-reviewed catalogue, including #197, while rebaking this pass.
const cells=[2,3,4,5,17,28,35,43,44,58,61];
const fresh=await sharp('assets-source/microevents/lowpoly-atlas.png').ensureAlpha().raw().toBuffer();
const base=await sharp(execFileSync('git',['show','d53f71bf9:public/content/microevents/atlas.webp'])).ensureAlpha().raw().toBuffer();
for(const cell of cells)for(let y=0;y<64;y++){
 const offset=((Math.floor(cell/8)*64+y)*512+(cell%8)*64)*4;
 fresh.copy(base,offset,offset,offset+64*4);
}
await sharp(base,{raw:{width:512,height:512,channels:4}}).png().toFile('assets-source/microevents/lowpoly-atlas.png');
