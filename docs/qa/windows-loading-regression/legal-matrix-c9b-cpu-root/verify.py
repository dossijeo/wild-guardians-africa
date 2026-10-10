from pathlib import Path
import gzip,hashlib,json
p=Path(__file__).resolve().parent;m=json.loads((p/'receipt.json').read_text());b=(p/'original-report.json.gz').read_bytes();assert hashlib.sha256(b).hexdigest()==m['gzipSha256'];raw=gzip.decompress(b);assert len(raw)==m['reportBytes'] and hashlib.sha256(raw).hexdigest()==m['reportSha256'];assert hashlib.sha256((p/'original-driver.mjs').read_bytes()).hexdigest()==m['driverSha256']
r=json.loads(raw);assert r['source']==m['source'];rows=r['rows'];assert len(rows)==30 and all(x['ok'] for x in rows)
biomes={'sabana','gran-rio','manglares','volcanes','gran-canon','desierto'};cultures={'mapungubwe','saheliana','suajili','musgum','etiope'};assert {(x['biome'],x['culture']) for x in rows}=={(b,c) for b in biomes for c in cultures}
for x in rows:
 q=x['provenance'];assert q['biome']==x['biome'] and q['culture']==x['culture'];assert str(q['seed'])=='712' and q['day']==1 and q['skyNight']>=.99;assert any(c['operation']=='Game.tick' and c['count']>0 for c in q['commands'])
print('PASS original30 legal CPU fixtures; no native/rendering acceptance')
