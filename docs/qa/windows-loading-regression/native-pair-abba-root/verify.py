from pathlib import Path
import gzip, hashlib, json, sys, tempfile

folder = Path(__file__).resolve().parent
root = folder.parents[3]
sys.path.insert(0, str(root / 'tools'))
from summarize_native_loading_pair import summarize

manifest = json.loads((folder / 'archive.json').read_text())
with tempfile.TemporaryDirectory() as temporary:
    destination = Path(temporary)
    for row in manifest['files']:
        packed = (folder / row['path']).read_bytes()
        assert len(packed) == row['gzipBytes']
        assert hashlib.sha256(packed).hexdigest() == row['gzipSha256']
        raw = gzip.decompress(packed)
        assert len(raw) == row['bytes']
        assert hashlib.sha256(raw).hexdigest() == row['sha256']
        path = destination / row['original']
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
    summary = summarize(destination)
    assert summary == json.loads((folder / 'summary.json').read_text())
    assert hashlib.sha256((destination / 'fixture.json').read_bytes()).hexdigest() == summary['fixtureSha256']
print('PASS: exact original ABBA reports and fixture; native gates and derived summary')
