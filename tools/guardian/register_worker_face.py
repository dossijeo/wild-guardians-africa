"""Register a facially edited full worker library without erasing lab provenance."""
import argparse, hashlib, json, shutil, struct
from pathlib import Path

root = Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
p.add_argument('profile', choices=['youngMale', 'youngFemale', 'olderMale', 'olderFemale'])
p.add_argument('input', type=Path)
a = p.parse_args()
manifest = root / 'content/manifests/worker-actions.json'
records = json.loads(manifest.read_text(encoding='utf8'))
record = records[a.profile]
data = a.input.read_bytes()
assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 8)[0] == len(data)
size = struct.unpack_from('<I', data, 12)[0]
doc = json.loads(data[20:20 + size])
assert {c['name'] for c in doc['animations']} == set(record['actions'])
assert all(len(s['joints']) == record['bones'] for s in doc['skins'])
names = {n.get('name') for n in doc['nodes']}
assert {'Can_Nozzle', 'ActorFacialLids', 'WorkerOralAnatomy'} <= names
targets = {n for m in doc['meshes'] for n in m.get('extras', {}).get('targetNames', [])}
assert 'mouthOpen' in targets
digest = hashlib.sha256(data).hexdigest()
target = root / 'public/assets' / (digest + '.glb')
if target.exists():
    assert target.read_bytes() == data
else:
    shutil.copyfile(a.input, target)
record['facialEdit'] = {
    'baseLibrary': record.get('facialEdit', {}).get('baseLibrary', {
        k: record[k] for k in ('url', 'sha256', 'bytes')
    }),
    'pipeline': 'tools/guardian/merge_worker_facial_library.py',
    'registration': 'tools/guardian/register_worker_face.py',
    'scope': 'Authored skin, eyelids and oral meshes; original action channels and tools retained'
}
record.update(url='/assets/' + target.name, sha256=digest, bytes=len(data))
text = json.dumps(records, ensure_ascii=False, indent=2)
manifest.write_text(text, encoding='utf8')
(root / 'public/content/worker-actions.json').write_text(text, encoding='utf8')
print(target.name)
