import fs from 'node:fs/promises';import sharp from 'sharp';
import {backdropBiomes,backdropSvg} from './experiments/far-backdrop-data.js';
await fs.mkdir('public/assets/far-vegetation',{recursive:true});
for(const biome of process.argv.slice(2).length?process.argv.slice(2):backdropBiomes)await sharp(Buffer.from(backdropSvg(biome))).webp({lossless:true,effort:4}).toFile(`public/assets/far-vegetation/${biome}-backdrop.webp`);
