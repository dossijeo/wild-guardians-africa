import sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'tools/trees'))
from tree_transfer_common import *
pack=json.loads((ROOT/'public/content/biome-savanna.json').read_text(encoding='utf8'));blob=(ROOT/('public'+pack['binary']['url'])).read_bytes()
def data(d):
 fmt={'<f4':'f','<u2':'H','<u4':'I'}[d['type']];return struct.unpack_from('<'+str(d['count'])+fmt,blob,d['offset'])
targets=[]
for a in pack['assets'][:4]:
 lod=a['lods'][0];p=data(lod['position']);vs=[Vector((p[i],-p[i+2],p[i+1])) for i in range(0,len(p),3)];h=max(v.z for v in vs)-min(v.z for v in vs);center=Vector(((min(v.x for v in vs)+max(v.x for v in vs))*.5,(min(v.y for v in vs)+max(v.y for v in vs))*.5,min(v.z for v in vs)))
 targets.append({'slot':a['slot'],'verts':[(v-center)/h for v in vs],'height':h})
hd=components(HD);original=components(args.source)
def compare(target,source):
 bvh=BVHTree.FromPolygons(source['verts'],source['faces'],all_triangles=False)
 ds=sorted(bvh.find_nearest(v)[3] for v in target['verts'])
 return {'median':ds[len(ds)//2],'p95':ds[int(len(ds)*.95)],'max':ds[-1],'fractionWithin1e_5':sum(d<1e-5 for d in ds)/len(ds)}
report={'normalization':'Uniform height only; X/Y bbox centering, base Z. Distances as fraction of tree height. No production geometry mutated.','hdComponents':len(hd),'originalComponents':len(original),'currentToHD':[],'originalToHD':[]}
for t in targets:
 matches=sorted([(compare(t,s),i) for i,s in enumerate(hd)],key=lambda x:x[0]['p95']);report['currentToHD'].append({'slot':t['slot'],'height':t['height'],'matches':[{'component':i,**r} for r,i in matches]})
for i,s in enumerate(hd):
 matches=sorted([(compare({'verts':s['verts']},o),j) for j,o in enumerate(original)],key=lambda x:x[0]['p95']);report['originalToHD'].append({'hdComponent':i,'matches':[{'originalComponent':j,**r} for r,j in matches[:2]]})
out=ROOT/'docs/lighting/tree-hd-transfer';out.mkdir(parents=True,exist_ok=True);(out/'surface-audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
