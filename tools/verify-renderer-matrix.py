"""Exact visual/streaming gates; report invalid comparisons separately, never hide them."""
import hashlib, itertools, json, sys
from pathlib import Path

biomes=['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']
qualities=['muy_baja','baja','media','alta']
pose_arg=next((x for x in sys.argv[1:] if x.startswith('--poses=')), '--poses=0,1,2')
poses=[float(x) for x in pose_arg.split('=')[1].split(',')]
paths=[x for x in sys.argv[1:] if not x.startswith('--poses=')]
expected=set(itertools.product(biomes,qualities,['day','night'],poses))
cases={}; invalid=[]; different=[]; images=[]; config=[]
for name in paths:
    path=Path(name);data=json.loads(path.read_text(encoding='utf-8'));config.append(data['config'])
    for row in data['rows']:
        if 'name' not in row: continue
        image=path.parent/row['name']
        images.append({'path':str(image),'sha256':hashlib.sha256(image.read_bytes()).hexdigest()})
        d=row.get('difference')
        if d is None: continue
        entry={'file':name,**{k:row[k] for k in ['biome','quality','phase','pose','variant']},'difference':d}
        if row['errors'] or row['glError'] or not d['shadowsEqual'] or not d['residencyEqual'] or not row.get('contentEqual',True) or not row.get('boundsEqual',True):
            invalid.append(entry);continue
        key=(row['biome'],row['quality'],row['phase'],row['pose'])
        cases.setdefault(key,{}).setdefault(row['variant'],[]).append(entry)
        if d['pixels']: different.append(entry)
missing=[list(key) for key in sorted(expected) if key not in cases or not all(v in cases[key] for v in ['main','candidate'])]
report={'expectedConditions':len(expected),'completeConditions':len(expected)-len(missing),'missing':missing,'invalidComparisons':invalid,'pixelDifferences':different,'structuralMatrixPassed':not missing and not invalid,'strictMatrixPassed':not missing and not invalid and not different,'config':config,'images':images}
Path(paths[-1]).with_name('matrix-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['config','images']},ensure_ascii=False,indent=2))
if missing or different:sys.exit(1)
