from pathlib import Path
import json
root=Path('docs/qa/global-visual-lab/ground-frequency')
data=json.loads((root/'captures.json').read_text())['records']
rows=[]
for a in data:
 if a['variant']!='global-lighting': continue
 b=next(b for b in data if b['variant']=='ground-frequency' and all(b[k]==a[k] for k in ['biome','view','phase']))
 assert all(a[k]==b[k] for k in ['camera','target','time'])
 rows.append({k:a[k] for k in ['biome','view','phase']} | {k+'Delta':b[k]-a[k] for k in ['calls','triangles','textures','geometries']} | {'baselineErrors':a['errors'],'candidateErrors':b['errors']})
(root/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',newline='\n')
print(json.dumps({'pairs':len(rows),'changedCounters':[r for r in rows if any(r[k+'Delta'] for k in ['calls','triangles','textures','geometries'])],'errors':sum(len(r['baselineErrors'])+len(r['candidateErrors']) for r in rows)},indent=2))
