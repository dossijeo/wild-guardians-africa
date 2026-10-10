from pathlib import Path
import json,gzip,hashlib,subprocess
root=Path(__file__).resolve().parents[4];directory=root/'tests/fixtures/frozen-loading-source';manifest=json.loads((directory/'manifest.json').read_text())
for row in manifest['entries']:
 packed=(directory/row['file']).read_bytes();raw=gzip.decompress(packed)
 assert len(packed)==row['gzipBytes'] and hashlib.sha256(packed).hexdigest()==row['gzipSha256']
 assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256']
 assert raw==subprocess.check_output(['git','show',row['commit']+':'+row['path']],cwd=root),row['path']
 assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==row['gitBlob']
print('PASS: 19 exact original historical Git blobs; no runtime assets')
