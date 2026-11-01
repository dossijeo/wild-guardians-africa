// Extract the reference's precomputed contour/timing guides after verifying
// that every guide belongs to the background currently shipped by the game.
import fs from 'node:fs';
import crypto from 'node:crypto';
const source=process.argv[2];if(!source)throw Error('Provide the reference HTML path');
const html=fs.readFileSync(source,'utf8');
function data(id){const match=html.match(new RegExp(`<script id="${id}"[^>]*>(.*?)<\\/script>`,'s'));if(!match)throw Error(`Missing ${id}`);return JSON.parse(match[1]);}
const guides=data('inline-pencil-guides'),reference=data('inline-data'),manifest=JSON.parse(fs.readFileSync('public/cinematics/manifest.json','utf8'));
const decode=uri=>Buffer.from(uri.slice(uri.indexOf(',')+1),'base64');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const scenes=manifest.acts.flatMap(act=>act.scenes);if(scenes.length!==50||Object.keys(guides).length!==scenes.length)throw Error('Unexpected guide count');
for(const scene of scenes){const path=scene.layers[0].image,embedded=reference.images[path];if(!embedded||!guides[scene.id]||digest(decode(embedded))!==digest(fs.readFileSync('public/cinematics/'+path)))throw Error(`Background mismatch: ${scene.id}`);}
fs.mkdirSync('public/cinematics/pencil-guides',{recursive:true});
for(const scene of scenes)fs.writeFileSync(`public/cinematics/pencil-guides/scene-${scene.id}.webp`,decode(guides[scene.id]));
console.log(`Extracted ${scenes.length} verified guides`);
