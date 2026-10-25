from pathlib import Path
import json,numpy as np,cv2
root=Path('.');v=next(v for v in json.loads((root/'public/content/villages.json').read_text()) if v['id']=='mapungubwe');raw=root/'public'/v['binary']['url'].lstrip('/');a=np.fromfile(raw,dtype='<f4',count=v['vertexBytes']//4).reshape(-1,8);idx=np.fromfile(raw,dtype='<u4',offset=v['vertexBytes'],count=v['indexCount']);masks=[]
for u in v['units']:
 mask=np.zeros((512,512),np.uint8)
 for ids in idx[u['offset']:u['offset']+u['count']].reshape(-1,3):cv2.fillConvexPoly(mask,np.round(a[ids,6:8]*511).astype(np.int32),1)
 masks.append(mask.astype(bool))
allmask=np.logical_or.reduce(masks);others=np.logical_or.reduce(masks[1:]);report={'resolution':512,'method':'triangle coverage rounded to 512 square; approximate, excludes mip-safe padding','units':len(masks),'totalCoverageFraction':float(allmask.mean()),'workshopCoverageFraction':float(masks[0].mean()),'workshopExclusiveFraction':float((masks[0]&~others).mean()),'workshopOverlapOtherFraction':float((masks[0]&others).mean()),'unitKeys':[u['key'] for u in v['units']]}
(root/'docs/qa/global-visual-lab/workshop-art/shared-atlas-audit.json').write_text(json.dumps(report,indent=2)+'\n',newline='\n');print(report)
