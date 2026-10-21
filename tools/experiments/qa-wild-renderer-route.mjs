import {installInstanceFrustumRoute} from './qa-asset-instance-frustum-route.mjs';
export async function installWildRendererRoute(page){
 const fake={route:async(pattern,handler)=>page.route(pattern,async route=>{
  const proxy={fetch:()=>route.fetch(),fulfill:async({response,body})=>{
   const begin='for(const e of entries)for(let i=0;i<e.mesh.count;i++){',end='g.mesh.count=offset;';
   if(!body.includes(begin)||!body.includes(end))throw Error('Wild Renderer packing anchors missing');
   body=body.replace(begin,"const wrStart=performance.now();if(pass==='color'&&this.qaWildRenderer){offset=this.qaWildRenderer.pack(g,entries,source,this.frustum,this.origin,this.omitZeroColor);}else "+begin);
   body=body.replace(end,"this.qaPackMs=(this.qaPackMs??0)+performance.now()-wrStart;"+end);
   body=body.replace('const g=cache.get(key);g.mesh.removeFromParent();','const g=cache.get(key);this.qaWildRenderer?.release(g);g.mesh.removeFromParent();');
   const stampStart=body.indexOf('const stamp='),stampEnd=body.indexOf('\n    if(stamp!==g.stamp)',stampStart);
   if(stampStart<0||stampEnd<0)throw Error('Incremental stamp anchor missing');
   const expression=body.slice(stampStart+'const stamp='.length,stampEnd).trim().replace(/;$/,'');
   body=body.slice(0,stampStart)+"const stamp=pass==='color'&&this.qaWildRenderer?.incremental?this.qaWildRenderer.frame:("+expression+");"+body.slice(stampEnd);
   body=body.replace('this.frustum.setFromProjectionMatrix(this.vp);','this.frustum.setFromProjectionMatrix(this.vp);this.qaWildRenderer?.beginFrame?.(chunks,this.frustum,this.origin);');
   body=body.replace('const qaUpload=',"const qaUpload=pass==='color'&&this.qaWildRenderer?.incremental?this.qaWildRenderer.lastUpdated:");
   body=body.replace('dispose(){this.clear();this.root.removeFromParent();}', 'dispose(){this.clear();this.qaWildRenderer?.dispose?.();this.root.removeFromParent();}');
   await route.fulfill({response,body});
  }};await handler(proxy);
 })};await installInstanceFrustumRoute(fake);
}
