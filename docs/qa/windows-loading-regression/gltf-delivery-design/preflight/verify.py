from pathlib import Path
import hashlib,json
here=Path(__file__).parent
root=next(p for p in here.resolve().parents if (p/'package.json').exists())
receipt=json.loads((here/'freeze-receipt.json').read_text())
for name,row in receipt['files'].items():
 data=(root/name).read_bytes();assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256'],name
for receiptName in ['checks.json','package-syntax.json']:
 for row in json.loads((here/receiptName).read_text()):
  assert row['exitCode']==0
  assert hashlib.sha256((here/row['log']).read_bytes()).hexdigest()==row['sha256']
assert receipt['tests']['pass']==59 and receipt['tests']['fail']==0
print('PASS: frozen source hashes and CPU check receipts')
