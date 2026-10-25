import json,sys,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
p=Path(sys.argv[1]);j=json.loads((p/'active-play.json').read_text(encoding='utf-8'));rows=[]
assert {r['phase'] for r in j['records']}=={'day','night'}
for r in j['records']:
 assert not r['errors'] and r['farEnabled'] and r['mountainsVisible']
 assert all(not f['glError'] and not f['pauses'] for f in r['frames'])
 assert r['after']['elapsed']-r['before']['elapsed']>=10
 assert r['frames'][-1]['wallMs']>=40000
 assert not (r['coverage'] or {}).get('stats',{}).get('overflow',0)
 probe=json.loads(subprocess.check_output(['C:/ffmpeg/bin/ffprobe.exe','-v','error','-count_frames','-show_entries','stream=nb_read_frames,width,height','-show_entries','format=duration','-of','json',str(p/f"{r['phase']}.webm")]))
 assert probe['streams'][0]['width']==1280 and probe['streams'][0]['height']==720
 assert float(probe['format']['duration'])>=38
 assert len({tuple(f['chunkKeys']) for f in r['frames']})>1
 baseZ=r['frames'][0]['camera'][2];baseX=r['frames'][0]['camera'][0]
 assert all(abs(f['camera'][0]-baseX)<1e-6 and abs(f['camera'][2]-baseZ-f['expectedShift'])<1e-6 for f in r['frames'])
 rows.append(dict(chunkSets=len({tuple(f['chunkKeys']) for f in r['frames']}),origins=sorted({tuple(f['origin']) for f in r['frames']}),pendingFrames=sum(f['pending'] for f in r['frames']),phase=r['phase'],observedFrames=len(r['frames']),elapsedAdvance=r['after']['elapsed']-r['before']['elapsed'],geometryRange=[min(f['geometry'] for f in r['frames']),max(f['geometry'] for f in r['frames'])],textureRange=[min(f['textures'] for f in r['frames']),max(f['textures'] for f in r['frames'])],workersChanged=r['before']['workers']!=r['after']['workers'],video=probe))
 panel=Image.new('RGB',(960,600))
 for i in range(9):
  panel.paste(Image.open(p/f"{r['phase']}-{i}.png").resize((320,180)),((i%3)*320,(i//3)*200+20));ImageDraw.Draw(panel).text(((i%3)*320+4,(i//3)*200+4),f'{i*5}s',fill='white')
 panel.save(p/f"{r['phase']}-contact.jpg",quality=93)
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print([(r['phase'],r['observedFrames'],r['elapsedAdvance'],r['workersChanged']) for r in rows])
