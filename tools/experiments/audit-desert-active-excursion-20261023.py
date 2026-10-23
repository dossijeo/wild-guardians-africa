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
 bx,bz=r['frames'][0]['camera'][0],r['frames'][0]['camera'][2]
 assert all(abs(f['camera'][0]-bx-f['expectedShift'])<1e-6 and abs(f['camera'][2]-bz-f['expectedShift']*.35)<1e-6 for f in r['frames'])
 rows.append(dict(phase=r['phase'],observedFrames=len(r['frames']),elapsedAdvance=r['after']['elapsed']-r['before']['elapsed'],geometryRange=[min(f['geometry'] for f in r['frames']),max(f['geometry'] for f in r['frames'])],textureRange=[min(f['textures'] for f in r['frames']),max(f['textures'] for f in r['frames'])],workersChanged=r['before']['workers']!=r['after']['workers'],video=probe))
 row=rows[-1];row['pendingFrames']=sum(f['pending'] for f in r['frames']);row['origins']=sorted({tuple(f['origin']) for f in r['frames']});row['distinctChunkSets']=len({tuple(f['chunkKeys']) for f in r['frames']});row['chunkCountRange']=[min(len(f['chunkKeys']) for f in r['frames']),max(len(f['chunkKeys']) for f in r['frames'])]
 assert row['distinctChunkSets']>1
 panel=Image.new('RGB',(1440,870),'#151515')
 for i,shot in enumerate(r['shots']):
  col,rowIndex=i%3,i//3
  panel.paste(Image.open(p/f"{r['phase']}-{i}.png").resize((480,270)),(col*480,rowIndex*290+20));ImageDraw.Draw(panel).text((col*480+4,rowIndex*290+4),f"{shot['wallMs']/1000:.2f}s",fill='white')
 panel.save(p/f"{r['phase']}-contact.jpg",quality=93)
assert len({tuple(f['origin']) for r in j['records'] for f in r['frames']})>1
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print([(r['phase'],r['observedFrames'],r['elapsedAdvance'],r['workersChanged']) for r in rows])
