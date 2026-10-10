"""Extract six supplied agricultural tutorial clips without transcoding."""
import argparse, base64, hashlib, json, re, struct
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('lab', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = args.lab.read_bytes()
match = re.search(r'const recordings=(\[.*?\]);', source.decode('utf-8'), re.S)
if not match:
    raise ValueError('Missing recordings catalog')
items = json.loads(match.group(1))
expected = {(key, language) for key in ('magic.growth', 'magic.multiply', 'reminder.multiply') for language in ('es', 'en')}
assert len(items) == 6 and {(x['key'], x['lang']) for x in items} == expected
records = []
for item in items:
    assert item['id'] == item['key'] + '.' + item['lang']
    assert item['audio'].startswith('data:audio/ogg;base64,')
    data = base64.b64decode(item['audio'].split(',', 1)[1], validate=True)
    head = data.index(b'OpusHead')
    channels = data[head + 9]
    rate = struct.unpack_from('<I', data, head + 12)[0]
    assert channels in (1, 2) and rate == 48000
    path = 'content/spirit-voices/agricultural/' + item['id'] + '.ogg'
    target = root / 'public' / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    records.append(dict(id=item['id'], messageId=item['key'], language=item['lang'], text=item['text'], path=path,
                        bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), codec='Opus', channels=channels,
                        sampleRate=rate, labDurationSeconds=item['seconds']))
manifest = dict(source=args.lab.name, sourceSha256=hashlib.sha256(source).hexdigest(),
                recipe='Original embedded Opus bytes; no transcoding; historical voice bank retained', records=records)
(root / 'content/manifests/agricultural-spirit-voices.json').write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
print(json.dumps(dict(clips=len(records), bytes=sum(x['bytes'] for x in records))))
