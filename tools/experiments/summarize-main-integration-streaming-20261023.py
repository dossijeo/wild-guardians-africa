from pathlib import Path
import json
root=Path('docs/qa/global-visual-lab/main-integration-20261022')
rows=[]
for biome in ['sabana','gran-rio','manglares','desierto','volcanes','gran-canon']:
 for quality in ['media','baja']:
  for phase in ['day','night']:
   name=f'{quality}-{phase}.json'
   candidates=[root/f'{biome}-streaming-retry'/name,root/f'{biome}-streaming'/name]
   p=next((p for p in candidates if p.exists()),None)
   if p is None:
    rows.append(dict(biome=biome,quality=quality,phase=phase,status='pending'));continue
   d=json.loads(p.read_text(encoding='utf-8'));r=d['records'];first=r[0];returns=[x for x in r if x['offset']==0]
   structural=len(r)==5 and d['stateUnchanged'] and not d['errors'] and not any(x['glError'] for x in r)
   structural=structural and all(all(x[k]==first[k] for k in ['camera','target','chunks']) for x in returns)
   structural=structural and all(not all(k in x['chunks'] for k in first['chunks']) for x in r if x['offset'])
   rows.append(dict(biome=biome,quality=quality,phase=phase,status='structural-pass' if structural else 'FAILED',source=str(p.relative_to(root)),sameReturnDraws=all((x['calls'],x['triangles'])==(first['calls'],first['triangles']) for x in returns),returnMemory=[x['memory'] for x in returns],chunksReadyMs=[x['chunksReadyMs'] for x in r[1:]],sameMemoryBetweenReturns=returns[1]['memory']==returns[2]['memory']))
(root/'streaming-summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
lines=['# Streaming postmerge: estado estructural','','Dos idas y vueltas de 192 m, escenas pausadas. No prueba campañas activas ni ausencia de fugas a largo plazo. Memoria son contadores de Three.js, no bytes. La revisión visual se documenta por separado.','','| Bioma | Perfil / fase | Estado | Carga de retorno igual | Recursos entre retornos iguales |','|---|---|---|---|---|']
for r in rows:lines.append(f"| {r['biome']} | {r['quality']} / {r['phase']} | {r['status']} | {r.get('sameReturnDraws','—')} | {r.get('sameMemoryBetweenReturns','—')} |")
(root/'STREAMING.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Completed',sum(r['status']!='pending' for r in rows),'of',len(rows))
