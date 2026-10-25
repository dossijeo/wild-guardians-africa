"""Check repeated stationary current-recipe reports before presenting their costs."""
import argparse, json
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl
from PIL import Image, ImageChops, ImageStat
parser=argparse.ArgumentParser()
parser.add_argument('--biome',required=True)
parser.add_argument('--quality',default='media')
a=parser.parse_args()
root=Path('docs/qa/global-visual-lab/current-review-20261025/current-resident-cost')
rows=[]; reference=None
prefix=f'{a.biome}-{a.quality}-default'
for run in ['r1','r2']:
    path=root/f'{prefix}-{run}.json'
    d=json.loads(path.read_text(encoding='utf-8'));s=d['result']['streaming']
    q=dict(parse_qsl(urlsplit(d['url']).query))
    assert d['biome']==a.biome and d['quality']==a.quality
    assert not [e for e in d['errors'] if 'X4000' not in e]
    assert all(k not in q for k in ['waterBedWorker','waterShoreWorker','chunkEviction','warmObstruction','retainPrograms'])
    assert q['workerResidency']=='actors' and q['frameScheduler']=='1'
    if a.biome=='manglares':assert q['groundCache']=='fixed512' and q['mangroveFerns']=='holly'
    assert s['options']['distance']==0 and s['options']['frames']==360 and not s['options']['active']
    assert s['summary']['frames']['count']==372 and s['created']==0 and s['farSettled']
    assert s['gpu']['supported'] and s['gpu']['disjoint']==0 and s['gpu']['summary']['count']>=120
    assert s['elapsed']==s['initialElapsed'] and s['workersBefore']==s['workersAfter']
    assert s['baseline']==s['final']
    state={k:s[k] for k in ['options','cameraOrigin','targetOrigin','initialElapsed','workersBefore','baseline','hardware']}
    state['query']=q;state['streamingOptions']=d['result']['streamingOptions']
    if reference is None:reference=state
    else:assert state==reference,'Repeat conditions differ'
    rows.append({'run':run,'gpu':s['gpu']['summary'],'cpuRender':s['summary']['render'],'presentation':s['summary']['frames'],'readyMs':d['result']['loading']['readyMs']})
im1=Image.open(root/f'{prefix}-r1.png').convert('RGB');im2=Image.open(root/f'{prefix}-r2.png').convert('RGB')
assert im1.size==im2.size==(1280,720)
diff=ImageChops.difference(im1,im2)
report={'scope':'Two serial resident paused runs, not A/B or a loading benchmark. GPU elapsed includes pipeline bubbles. CPU render includes draw. Screenshots are taken after timing.','conditions':reference,'runs':rows,'pixelComparison':{'meanAbsoluteRGB':sum(ImageStat.Stat(diff).mean)/3,'bounds':diff.getbbox()}}
with (root/f'{prefix}-summary.json').open('w',encoding='utf-8',newline='\n') as f:json.dump(report,f,indent=2)
print(json.dumps({'runs':rows,'pixels':report['pixelComparison']},indent=2))
