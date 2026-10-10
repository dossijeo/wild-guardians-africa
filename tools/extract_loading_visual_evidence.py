"""Extract opt-in native canvas evidence; never rewrite the original report.

These frames exclude the composited HTML HUD. PNG readback adds overhead, so
the source run is not a loading-time/GPU benchmark or physical-input test.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import struct
import zlib

LIMIT = 20_000_000
LABELS = {'initial', 'additional-plant', 'mature', 'late', 'middle', 'preplant', 'catchup-mid'}


def png_dimensions(data):
    if not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Invalid PNG signature')
    offset, dimensions, ended = 8, None, False
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError('Truncated PNG chunk')
        length = struct.unpack_from('>I', data, offset)[0]
        end = offset + 12 + length
        if end > len(data):
            raise ValueError('Truncated PNG data')
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:end - 4]
        crc = struct.unpack_from('>I', data, end - 4)[0]
        if zlib.crc32(kind + payload) & 0xffffffff != crc:
            raise ValueError('PNG CRC mismatch')
        if dimensions is None:
            if kind != b'IHDR' or length != 13:
                raise ValueError('PNG must start with IHDR')
            dimensions = struct.unpack_from('>II', payload)
            if min(dimensions) < 1:
                raise ValueError('Invalid PNG dimensions')
        if kind == b'IEND':
            if length or end != len(data):
                raise ValueError('Invalid PNG end')
            ended = True
        offset = end
    if not ended:
        raise ValueError('Missing PNG end')
    return dimensions


def extract(source, destination):
    source, destination = Path(source), Path(destination)
    original = source.read_bytes()
    if len(original) > LIMIT * 2:
        raise ValueError('Report exceeds bounded evidence size')
    report = json.loads(original)
    evidence = report.get('checks', {}).get('loadingVisual', {})
    frames = evidence.get('frames')
    if not isinstance(frames, list) or not 1 <= len(frames) <= 6:
        raise ValueError('No bounded loading frame evidence')
    prepared, seen, total = [], set(), 0
    for frame in frames:
        label = frame.get('label')
        if label not in LABELS or label in seen:
            raise ValueError('Invalid or duplicate frame label')
        seen.add(label)
        png = frame.get('png', '')
        prefix = 'data:image/png;base64,'
        if not isinstance(png, str) or not png.startswith(prefix):
            raise ValueError('Missing PNG data URL')
        data = base64.b64decode(png[len(prefix):], validate=True)
        total += len(data)
        if total > LIMIT:
            raise ValueError('Decoded evidence exceeds size limit')
        dimensions = png_dimensions(data)
        if dimensions != (frame.get('width'), frame.get('height')):
            raise ValueError('PNG dimensions differ from recorded canvas')
        metadata = {key: value for key, value in frame.items() if key != 'png'}
        metadata.update(file=label + '.png', bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        prepared.append((metadata, data))
    # Validate all frames before creating output. Refuse to overwrite evidence.
    destination.mkdir(parents=True, exist_ok=False)
    for metadata, data in prepared:
        (destination / metadata['file']).write_bytes(data)
    receipt = {
        'source': str(source.resolve()), 'sourceSha256': hashlib.sha256(original).hexdigest(),
        'sourceOk': report.get('ok'), 'sourceErrors': report.get('errors'),
        'scope': 'Diorama canvas only; excludes HTML UI. Opt-in readback overhead; not a timing benchmark or physical-input acceptance.',
        'collector': {key: value for key, value in evidence.items() if key != 'frames'},
        'frames': [metadata for metadata, _ in prepared],
    }
    (destination / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    try:
        result = extract(args.report, args.destination)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    print(f"Extracted {len(result['frames'])} canvas frames; original report preserved")
