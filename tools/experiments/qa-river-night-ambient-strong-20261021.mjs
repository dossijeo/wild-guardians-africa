import {patchRiverWear} from './river-wear-qa-route.mjs';
export async function installGrassPigmentLod(page){
 await page.route('**/tools/experiments/qa-continuous-grass-river.js*',async route=>{
  const response=await route.fetch();let body=patchRiverWear(await response.text());
  for(const [a,b] of [['vec3(.93,1.08,.84)','vec3(1.14,1.18,1.05)'],['dayShade=vec3(.17,.28,.34)','dayShade=vec3(.14,.26,.32)'],['vec3(1.55,1.42,1.02)','vec3(1.77,1.79,1.42)']]){if(!body.includes(a))throw Error('River palette anchor missing');body=body.replace(a,b);}
  const edits=[['float bend=uCoverageRefined*.50','float bend=lod*uCoverageRefined*.50'],['N.y-=uCoverageRefined*uCoverageWindStrength','N.y-=lod*uCoverageRefined*uCoverageWindStrength']];
  for(const [a,b] of edits){if(!body.includes(a))throw Error('Wind LOD anchor missing');body=body.replace(a,b);}
  const edits2=[
   ['in vec3 flatPosition,bladeRoot;', 'in vec3 flatPosition,bladeRoot,flatNormal;'],
   ["['flatPosition',3],['bladeRoot',3]","['flatPosition',3],['bladeRoot',3],['flatNormal',3]"],
   ['vec3 N=normal;', 'vec3 N=normalize(mix(flatNormal,normal,lod*uCoverageRefined));'],
   [' q.meshes=',` for(const data of Object.values(modules)){data.flatNormal=[];for(let i=0;i<data.uv.length/2;i++){const leaf=Math.round(data.uv[i*2+1]*12);const n=leaf<8?modules.light.normal.slice(leaf*9,leaf*9+3):data.normal.slice(i*3,i*3+3);data.flatNormal.push(...n);}}
 q.meshes=`]
  ];
  for(const [a,b] of edits2){if(!body.includes(a))throw Error('Normal LOD anchor missing: '+a);body=body.replace(a,b);}
  const pigment='(root.xz+pos.xz)*uCoverageScale';if(!body.includes(pigment))throw Error('Pigment anchor');body=body.replace(pigment,'(root.xz+pos.xz*lod)*uCoverageScale');
  const night='nightShade=vec3(.095,.17,.32)*uNightLight';if(!body.includes(night))throw Error('Night ambient anchor missing');body=body.replace(night,'nightShade=vec3(.24,.36,.48)*uNightLight');
  await route.fulfill({response,body});
 });
}
