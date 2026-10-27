import {spawn} from 'node:child_process';
const variants=process.argv.slice(2);
for(const variant of variants){
 const [phase,mode]=variant.split('-');
 const env={...process.env,WG_QA_URL:'http://127.0.0.1:5220',WG_WATER_SEED:'712',WG_WATER_CAMERA:'normal',WG_WATER_FIXED_TIME:'1',WG_WATER_TIME:phase==='night'?'400':'100',WG_ANGULAR_LOD:'1',WG_NEW_ATLASES:'1',WG_ATLAS_ISOLATE:'1',WG_ATLAS_HORIZON:'1',WG_FORCE_FAR_3D:mode==='3d'?'1':'0',WG_MATCH_FAR_DENSITY:'1',WG_IMAGEGEN_ATLAS:mode==='imagegen'?'1':'0',WG_WATER_OUT:`docs/qa/tree-atlas-refresh-20261026/comparison/${variant}`};
 console.log('Starting',variant);
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['tools/experiments/check-mangrove-water-authority.mjs'],{env,stdio:'inherit'});c.on('exit',code=>code===0?resolve():reject(Error(`${variant} exited ${code}`)));c.on('error',reject);});
}
