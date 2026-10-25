"""Build a linked comparison gallery; original PNG pixels are not modified."""
import json,html,hashlib
from pathlib import Path
base=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab'
out=base/'current-review-20261025'
mapping={'sabana':'sabana-day-night-corrected','gran-rio':'gran-rio-day-night','manglares':'manglares-day-night','desierto':'desierto-day-night','volcanes':'volcanes-day-night','gran-canon':'gran-canon-calm'}
parts=['<!doctype html><html lang="es"><meta charset="utf-8"><title>Wild Guardians: main histórico y laboratorio actual</title><style>body{background:#151a20;color:#eee;font:16px system-ui;margin:24px}section{margin-bottom:40px}figure{margin:0} .pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}img{width:100%;height:auto}a{color:#afd8ff}figcaption{padding:8px}nav a{margin-right:16px}</style><h1>Main histórico frente al laboratorio actual</h1><p>Izquierda: main b2497b0695218652672c805c40971ea830686e3a (referencia congelada, no main actual). Derecha: revisión gráfica 25 octubre. Semilla 712, 1280×720, calidad media, simulación pausada. Fotografías reales del renderer, sin retoques.</p><p>Se verifican cámara, objetivo, origen, hora, elapsed y trabajadores. No se exige igualdad de geometría: se muestran mejoras gráficas. El main histórico usa su configuración de fondos original; no es una comparación de rendimiento ni una garantía de identidad de todos los estados internos.</p><nav>']
parts += [f'<a href="#{b}">{b}</a>' for b in mapping];parts.append('</nav>')
rows=[]
for biome,folder in mapping.items():
 old=base/'accepted-main-review-20261023'/biome/'main';new=out/folder
 a=json.loads((old/'captures.json').read_text());b=json.loads((new/'captures.json').read_text())
 parts.append(f'<h2 id="{biome}">{biome}</h2>')
 for r in a['records']:
  if r['variant']!='native':continue
  q=next(x for x in b['records'] if x['variant']=='native' and x['phase']==r['phase'])
  assert not r['errors'] and not q['errors']
  assert len(r['frames'])==len(q['frames'])==3
  for f,g in zip(r['frames'],q['frames']):
   keys=['camera','target','time','origin','elapsed','workers']
   assert all(f[k]==g[k] for k in keys),(biome,r['phase'],f['i'])
   assert not f['glError'] and not g['glError']
   rel=f"{biome}-media-native-{r['phase']}/{f['i']:04}.png"
   sources=[old/rel,new/rel];urls=[f'../accepted-main-review-20261023/{biome}/main/{rel}',f'{folder}/{rel}']
   rows.append({'biome':biome,'phase':r['phase'],'view':f['i'],'matched':keys,'sources':[{'url':u,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p,u in zip(sources,urls)]})
   parts.append(f'<section><h3>{r["phase"]} · vista {f["i"]}</h3><div class="pair">')
   for label,u in zip(['Main histórico','Laboratorio actual'],urls):parts.append(f'<figure><a href="{u}"><img loading="lazy" src="{u}" alt="{biome} {label}"></a><figcaption>{label}</figcaption></figure>')
   parts.append('</div></section>')
parts.append('</html>')
(out/'main-current-gallery.html').write_text('\n'.join(parts),encoding='utf-8')
(out/'main-current-gallery.json').write_text(json.dumps({'baselineCommit':'b2497b0695218652672c805c40971ea830686e3a','pairs':rows},indent=2)+'\n',encoding='utf-8')
print(f'{len(rows)} pairs validated, {len(rows)*2} source images hashed; no re-render or image manipulation.')
