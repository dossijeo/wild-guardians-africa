import json,sys
from pathlib import Path
p=Path(sys.argv[1]);d=json.loads((p/'benchmarks.json').read_text(encoding='utf-8'))
assert len(d['records'])==8
checks=[]
for phase in ['day','night']:
 rows=[r for r in d['records'] if r['phase']==phase];base=rows[0]
 for r in rows:
  a=r['sceneAudit'];assert a['shadowResolution']==2048
  assert all(a['fernShadowEnabled']) if r['variant']=='shadowed' else not any(a['fernShadowEnabled'])
  for mode in ['gpu','cadence']:
   expected=base[mode]['frames'];actual=r[mode]['frames']
   assert [x['coverageInstances'] for x in actual]==[x['coverageInstances'] for x in expected]
   assert [x['camera'] for x in actual]==[x['camera'] for x in expected]
   for key in ['near','far','triangles','moduleSpacing','chunks','bufferBytes']:
    assert r[mode]['coverage'][key]==base[mode]['coverage'][key],key
  assert a['memory']==base['sceneAudit']['memory']
  checks.append({'phase':phase,'variant':r['variant'],'sameVisibleFernSequence':True,'sameGeometryAndMemory':True,'shadowDraws':r['shadowCacheAfter']['draws']-a['shadowCacheBefore']['draws'],'shadowCacheHits':r['shadowCacheAfter']['hits']-a['shadowCacheBefore']['hits']})
(p/'isolation-checks.json').write_text(json.dumps(checks,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(checks,indent=2))
