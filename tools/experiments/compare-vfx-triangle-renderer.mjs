import {spawn} from 'node:child_process';
for(const [index,mode] of ['A','B','A','B'].entries()){
 const env={...process.env,WG_QA_URL:'http://127.0.0.1:5220',WG_MAGIC_PROFILE:'1',WG_EXPECT_BIOME:'manglares',WG_BEAST_FIXTURE:'docs/qa/mangrove-magic-20261026/estuary-raid/fixture.json',WG_SHIELD_OBSERVE_MS:'12000',WG_VFX_TRIANGLE_CANDIDATE:mode==='B'?'1':'0',WG_BEAST_QA_OUT:`docs/qa/mangrove-magic-20261026/vfx-triangle-candidate/${process.env.WG_MAGIC_CPU_SAMPLING==='0'?'nosampling':'renderer'}-${index+1}-${mode}`};
 console.log('Starting',index+1,mode);
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tools/experiments/check-beast-raid-ui.mjs'],{env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Run failed '+code)));});
}
