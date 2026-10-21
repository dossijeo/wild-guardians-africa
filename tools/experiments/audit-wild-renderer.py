import json,statistics as st,sys,math
from pathlib import Path
from PIL import Image,ImageChops
p=Path(sys.argv[1] if len(sys.argv)>1 else 'docs/qa/wild-renderer/abba')
d=json.loads((p/'benchmarks.json').read_text(encoding='utf-8'));rows=d['records'];assert len(rows)==8
summary=[];comparisons=[];mismatches=[];diagnostic="--diagnostic" in sys.argv;incremental="--incremental" in sys.argv;av="combined" if incremental else "base";bv="incremental" if incremental else "combined"
if '--events' in sys.argv:incremental=True;av='incremental';bv='events'
if '--engine' in sys.argv:incremental=True;av='combined';bv='engine'
for phase in ['day','night']:
 rr=[r for r in rows if r['phase']==phase];assert [r['variant'] for r in rr]==([av,bv,av,bv] if incremental else [av,bv,bv,av])
 for r in rr:
  assert not r['errors'] and r['time']==rr[0]['time'] and r['target']==rr[0]['target']
  dense=bool(r.get('fixture'))
  for mode,n in [('gpu',120 if dense else 180),('cadence',180 if dense else 360)]:
   v=r[mode];assert v['stateUnchanged'] and v['glError']==0 and len(v['frames'])==n
   assert v['resolution']==[1280,720] and v['device']==rr[0][mode]['device']
   differences=[dict(frame=i,calls=[a['calls'],b['calls']],triangles=[a['triangles'],b['triangles']],cameraEqual=a['camera']==b['camera']) for i,(a,b) in enumerate(zip(rr[0][mode]['frames'],v['frames'])) if (a['camera'],a['calls'],a['triangles'])!=(b['camera'],b['calls'],b['triangles'])]
   if differences:mismatches.append(dict(phase=phase,block=rr.index(r),variant=r['variant'],mode=mode,frames=differences))
   assert diagnostic or not differences, 'Rendering differs; use --diagnostic only to report invalid comparisons'
  g=r['gpu']['gpu'];assert g['supported'] and len(g['samples'])==(120 if dense else 180)
  assert not any(g[k] for k in ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','contextLost','pending'])
  f=r['cadence']['frames'];ordered=sorted(x['intervalMs'] for x in f)
  summary.append(dict(phase=phase,variant=r['variant'],cpuMs=st.mean(x['cpuMs'] for x in f),groupMs=st.mean(x['groupCpuMs'] for x in f),packMs=st.mean(x['packMs'] for x in f),gpuMs=st.mean(x['ms'] for x in g['samples']),intervalMs=st.mean(ordered),fpsCadence=1000/st.mean(ordered),p50=ordered[len(ordered)//2-1],p95=ordered[math.ceil(len(ordered)*.95)-1],p99=ordered[math.ceil(len(ordered)*.99)-1],inputMs=st.mean((x['wasm'] or {}).get('inputMs',0) for x in f),kernelMs=st.mean((x['wasm'] or {}).get('kernelMs',0) for x in f),copyBytes=st.mean((x['wasm'] or {}).get('copiedBytes',0) for x in f),liveBytes=max((x['wasm'] or {}).get('liveBytes',0) for x in f),callsRange=[min(x['calls'] for x in f),max(x['calls'] for x in f)],trianglesRange=[min(x['triangles'] for x in f),max(x['triangles'] for x in f)]))
  summary[-1].update({key:st.mean((x['wasm'] or {}).get(key,0) for x in f) for key in ['registryMs','registerMs','registeredInstances','registrations','descriptorBytes','orderUploads','visibilityUploads','engineCopiedBytes','nativePropRegistrations']})
 a=Image.open(p/f'sabana-baja-{av}-{phase}/scene.png').convert('RGB');b=Image.open(p/f'sabana-baja-{bv}-{phase}/scene.png').convert('RGB');diff=ImageChops.difference(a,b)
 changed=sum(px!=(0,0,0) for px in diff.getdata());comparisons.append(dict(phase=phase,changedPixels=changed,maxChannelDelta=max(v[1] for v in diff.getextrema())));print(phase,'changed pixels',changed)
 pair=Image.new('RGB',(2560,720));pair.paste(a,(0,0));pair.paste(b,(1280,0));pair.save(p/f'{phase}-pair.webp',lossless=True)
(p/'summary.json').write_text(json.dumps({'validForPerformanceComparison':not mismatches and all(c['changedPixels']==0 for c in comparisons),'mismatches':mismatches,'rows':summary,'images':comparisons,'device':rows[0]['gpu']['device'],'samplesGPU':sum(len(r['gpu']['gpu']['samples']) for r in rows),'framesCadence':sum(len(r['cadence']['frames']) for r in rows)},indent=2)+'\n',encoding='utf-8')
for r in summary:print(r)
