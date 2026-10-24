// Same conservative frustum as the first QA prototype, with selection-based uploads.
export async function installInstanceSelectionRoute(page){
 await page.route('**/src/rendering/asset-groups.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchors=['const stamp=', 'if(stamp!==g.stamp){','const matrix=new THREE.Matrix4();let offset=0;','for(const e of entries)for(let i=0;i<e.mesh.count;i++){'];
  if(!anchors.every(a=>body.includes(a)))throw Error('Selection QA anchor missing');
  body=body.replace('const stamp=','let stamp=');
  body=body.replace('if(stamp!==g.stamp){',`
    if(pass==='color'&&this.qaInstanceCull){
      const input=stamp+'|'+this.vp.elements.join(',');
      if(input!==g.qaInput){
        const mask=g.qaMask??(g.qaMask=new Uint8Array(capacity));
        const matrix=g.qaMatrix??(g.qaMatrix=new THREE.Matrix4());
        const sphere=g.qaSphere??(g.qaSphere=new THREE.Sphere());
        if(!source.geometry.boundingSphere)source.geometry.computeBoundingSphere();
        let n=0,changed=g.qaLength!==count;
        for(const entry of entries)for(let i=0;i<entry.mesh.count;i++){
          matrix.fromArray(entry.mesh.instanceMatrix.array,i*16).premultiply(entry.group.matrixWorld);
          sphere.copy(source.geometry.boundingSphere).applyMatrix4(matrix);sphere.radius+=2.5;
          const visible=this.frustum.intersectsSphere(sphere)?1:0;
          if(mask[n]!==visible)changed=true;mask[n++]=visible;
        }
        g.qaLength=count;g.qaInput=input;if(changed)g.qaRevision=(g.qaRevision??0)+1;
      }
      stamp='selection:'+g.qaRevision+'|'+stamp;
    }
    if(stamp!==g.stamp){`);
  body=body.replace(anchors[2],'const matrix=new THREE.Matrix4();let offset=0,qaIndex=0;');
  body=body.replace(anchors[3],anchors[3]+"if(pass==='color'&&this.qaInstanceCull&&!g.qaMask[qaIndex++])continue;");
  await route.fulfill({response,body});
 });
}
