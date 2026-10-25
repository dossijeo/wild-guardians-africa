import json, itertools, statistics
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/ground-pom'
checks=[];performance=[]
def picture(path):return Image.open(path if path.exists() else path.with_suffix('.webp'))
font=ImageFont.load_default()
for q in ['media','baja']:
 records=json.loads((root/f'captures-{q}.json').read_text())['records']
 for view,phase in itertools.product(['close','game'],['day','night']):
  rows=[r for r in records if r['view']==view and r['phase']==phase];base=next(r for r in rows if r['variant']=='A');a=np.array(picture(root/base['file']))
  for r in rows:
   for key in ['camera','target','time','sun','night','calls','triangles','geometries','structures','plants','chunks','tufts']:
    assert r[key]==base[key],(q,view,phase,r['variant'],key)
   assert not r['errors'],r['errors']
   b=np.array(picture(root/r['file']));mae=float(np.abs(a.astype(float)-b).mean())
   if r['variant'] in ['B','A2']:assert np.array_equal(a,b),(q,view,phase,r['variant'])
   checks.append({'quality':q,'view':view,'phase':phase,'variant':r['variant'],'mae':mae,'allStateAndGeometryEqual':True})
  if q=='media':
   for variants,name in [(['A','B','C','D'],'ABCD'),(['A','D','E','F'],'diagnostics')]:
    sheet=Image.new('RGB',(2560,1504),(20,22,25));draw=ImageDraw.Draw(sheet)
    for i,v in enumerate(variants):
     x=i%2*1280;y=i//2*752;header=Image.new('RGB',(640,16),(20,22,25));ImageDraw.Draw(header).text((6,2),f'{v} | {view} | {phase} | 1280 x 720',font=font,fill='white');sheet.paste(header.resize((1280,32),Image.Resampling.NEAREST),(x,y));sheet.paste(picture(root/f'{q}-{view}-{phase}-{v}.png'),(x,y+32))
    sheet.save(root/f'comparison-{view}-{phase}-{name}.jpg',quality=94)
 bench=json.loads((root/f'benchmarks-{q}.json').read_text())['records']
 assert len(bench)==40
 for view,phase,v in itertools.product(['close','game'],['day','night'],['A','B','C','D','F']):
  rows=[r for r in bench if r['view']==view and r['phase']==phase and r['variant']==v];assert len(rows)==2
  for r in rows:
   assert r['cameraStable'] and not r['errors'] and r['gpu']['supported']
   assert not r['gpu']['disjointEvents'] and not r['gpu']['pending'] and len(r['gpu']['samples'])==120
  gpu=[s['ms'] for r in rows for s in r['gpu']['samples']];cpu=[s for r in rows for s in r['cpu']]
  performance.append({'quality':q,'view':view,'phase':phase,'variant':v,'gpuMean':statistics.mean(gpu),'gpuP95':float(np.percentile(gpu,95)),'cpuMean':statistics.mean(cpu),'cpuP95':float(np.percentile(cpu,95)),'gpuBlockMeans':[statistics.mean(s['ms'] for s in r['gpu']['samples']) for r in rows],'samples':len(gpu),'device':rows[0]['device']})
(root/'comparison-audit.json').write_text(json.dumps({'checks':checks,'performance':performance},indent=2)+'\n',encoding='utf-8',newline='\n')
lines=['# GPU / CPU: milisegundos por frame','', 'Intel UHD / ANGLE D3D11; medias de 2 bloques de 120 muestras. CPU de envío, no tiempo total de simulación.','', '| Perfil | Cámara | Hora | A GPU / CPU | B GPU / CPU | C GPU / CPU | D GPU / CPU | F GPU / CPU |','|---|---|---|---:|---:|---:|---:|---:|']
for q,view,phase in itertools.product(['media','baja'],['close','game'],['day','night']):
 row=[q,view,phase]
 for v in ['A','B','C','D','F']:
  r=next(a for a in performance if (a['quality'],a['view'],a['phase'],a['variant'])==(q,view,phase,v));row.append(f"{r['gpuMean']:.3f} / {r['cpuMean']:.3f}")
 lines.append('| '+' | '.join(row)+' |')
lines+=['','P95 y medias de cada bloque en comparison-audit.json. A/B son matemáticamente idénticos: sus diferencias temporales estiman ruido/deriva, no una mejora de B. Los resultados no justifican un ranking preciso entre C y D en todos los escenarios. E se descarta visualmente y no tiene benchmark independiente.','']
(root/'BENCHMARKS.md').write_text('\n'.join(lines),encoding='utf-8',newline='\n')
print('Verified',len(checks),'captures and',sum(r['samples'] for r in performance),'GPU samples')

counts=[]
for q in ['media','baja']:
 for r in json.loads((root/f'fetches-{q}.json').read_text())['records']:
  assert not r['errors']
  a=np.array(picture(root/r['file']));mask=(a[:,:,1]==31)&(a[:,:,2]==223)
  values=np.rint(a[:,:,0][mask].astype(float)*32/255-.5).astype(int)
  assert len(values)>10000 and values.min()>=0 and values.max()<=15
  counts.append({'quality':q,'view':r['view'],'variant':r['variant'],'pixels':len(values),'pomMean':float(values.mean()),'pomP95':float(np.percentile(values,95)),'pomMax':int(values.max()),'histogram':np.bincount(values,minlength=16).tolist(),'totalGroundFetchMean':float(values.mean()+4+(r['variant'] in ['D','F']))})
(root/'texture-fetches.json').write_text(json.dumps({'note':'Instrumented logical height reads per visible mapped ground fragment. Not hardware transactions or anisotropic taps. Total adds mask + three maps + microvisibility where applicable. Excludes environment, world shadow and contact fetches. B equals A. Excluded from GPU benchmarks.','records':counts},indent=2)+'\n',encoding='utf-8',newline='\n')
proof={};solar=json.loads((root/'solar-check.json').read_text())['records']
for phase in ['day','night']:
 rows=[r for r in solar if r['phase']==phase];images=[np.array(picture(root/r['file']),dtype=float) for r in rows]
 assert len(rows)==3
 for r in rows:assert r['night']==(phase=='night') and not r['errors']
 proof[phase]={'solarDifferenceMAE':float(abs(images[0]-images[1]).mean()),'identicalStateRepeatMAE':float(abs(images[0]-images[2]).mean()),'maxChannelDifference':float(abs(images[0]-images[1]).max()),'changedChannels':int(np.count_nonzero(images[0]!=images[1]))}
assert proof['night']['solarDifferenceMAE']==0 and proof['night']['identicalStateRepeatMAE']==0
assert proof['day']['solarDifferenceMAE']>1 and proof['day']['identicalStateRepeatMAE']==0
motion=json.loads((root/'motion.json').read_text())['records'];assert len(motion)==8
for r in motion:assert r['poses']==motion[0]['poses'] and not r['errors']
proof['motion']={'clips':8,'framesPerClip':72,'cameraAndTargetEqual':True,'errors':0}
(root/'solar-motion-audit.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Verified 16 fragment-counter images, solar-only modulation and 8 identical camera trajectories')
