"""Preserve the original terminal F100 bytes; no replay or source mutation."""
import gzip,hashlib,json,pathlib,shutil
root=pathlib.Path('docs/qa/economic-candidates-a518');out=root/'f100-terminal';out.mkdir(exist_ok=True)
raw=pathlib.Path('C:/Users/PC/.codex/worktrees/campaign-f83b1-100/wild-guardians-africa/.cache/f100')
source='83b1c1eaa0235f9a9b34966f88b496f42eeb161b';key='gran-canon-saheliana';sha=lambda b:hashlib.sha256(b).hexdigest()
files={}
for p in sorted(raw.glob('*.json')):
 b=p.read_bytes();target=out/(p.name+'.gz');target.write_bytes(gzip.compress(b,mtime=0));assert gzip.decompress(target.read_bytes())==b
 files[p.name]={'originalSha256':sha(b),'originalBytes':len(b),'gzipSha256':sha(target.read_bytes()),'gzipBytes':target.stat().st_size}
for p,name in [(raw.parent/'f100-run.log','producer.log'),(pathlib.Path('.cache/f100-native-audit.log'),'native-audit.log'),(pathlib.Path('.cache/f100-independent-audit.log'),'independent-audit.log')]:
 b=p.read_bytes();(out/name).write_bytes(b);files[name]={'originalSha256':sha(b),'originalBytes':len(b)}
for name in ['campaign-live-source-review.json','economy-f-root-readonly-review.json']:
 p=pathlib.Path('C:/Users/PC/source/repos/wild-guardians-africa/.cache')/name
 if p.exists():b=p.read_bytes();(out/name).write_bytes(b);files[name]={'originalSha256':sha(b),'originalBytes':len(b),'scope':'Independent root partial/source review, not terminal acceptance'}
report=json.loads((raw/(key+'-report.json')).read_text());summary=json.loads((raw/(key+'-summary.json')).read_text());audit=json.loads((raw/'f100-independent-audit.json').read_text())
assert report['provenance']['gitHead']==source and audit['responsibleCaseAccepted'] is False
bands=[]
for start,end in [(1,10),(11,30),(31,60),(61,100)]:
 rows=report['daily'][start-1:end];idle={k:sum(x['idle'][k] for x in rows) for k in ['budget','space','shift-end']};total=sum(idle.values());bands.append({'days':[start,end],'idle':idle,'totalIdle':total,'daylight':len(rows)*300,'fraction':total/(len(rows)*300),'deliveries':sum(x['delivered'] for x in rows)})
receipt={'source':source,'session':45765,'pid':20428,'producerExit':0,'nativeAuditExit':0,'independentAuditExit':0,'nativeStatus':'passed','result':'victory','completedNights':100,'responsibleCaseAccepted':False,'inactivity':audit['inactivity'],'idleSeconds':7930,'daylightSeconds':30000,'gates':audit['gates'],'bands':bands,'cashflow':summary['cashflow'],'files':files,'scope':'Single frozen original native campaign. Survival/source/ledger/physical/end-state and summary checks pass, strict25% activity fails. No poor6/matrix30/new-main approval; preserve first10 unchanged. No GPU/performance claim.'}
(out/'archive-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'out':str(out),'bands':bands,'cashflow':summary['cashflow'],'receipt':sha((out/'archive-receipt.json').read_bytes())}))
