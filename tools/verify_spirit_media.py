"""Offline technical voice audit; does not claim audible/browser acceptance."""
import argparse, hashlib, json, subprocess
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    parser.add_argument('--ffprobe', default='ffprobe')
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    manifest_path = root / 'content/manifests/spirit-voices.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    def run(command):
        result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if result.returncode:
            raise RuntimeError(f'{command[0]} failed: {result.stderr}')
        return result
    report = {'scope': 'Exact bytes, format and full offline decode; no browser playback or perceptual acceptance.',
              'toolSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'manifestSha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
              'ffprobe': run([args.ffprobe, '-version']).stdout.splitlines()[0],
              'ffmpeg': run([args.ffmpeg, '-version']).stdout.splitlines()[0], 'records': []}
    for record in manifest['records']:
        path = (root / 'public' / record['path']).resolve()
        path.relative_to((root / 'public').resolve())
        data = path.read_bytes()
        assert len(data) == record['bytes'], record['id']
        digest = hashlib.sha256(data).hexdigest()
        assert digest == record['sha256'], record['id']
        probe = json.loads(run([args.ffprobe, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]).stdout)
        streams = probe['streams']
        assert len(streams) == 1 and streams[0]['codec_type'] == 'audio', record['id']
        stream = streams[0]
        assert stream['codec_name'].lower() == record['codec'].lower(), record['id']
        assert stream['channels'] == record['channels'], record['id']
        assert int(stream['sample_rate']) == record['sampleRate'], record['id']
        duration = float(probe['format']['duration'])
        assert duration > 0, record['id']
        decoded = run([args.ffmpeg, '-nostdin', '-v', 'error', '-xerror', '-i', str(path), '-map', '0:a:0', '-f', 'null', '-'])
        assert not decoded.stderr.strip(), (record['id'], decoded.stderr)
        report['records'].append({'id': record['id'], 'path': record['path'], 'language': record['language'],
                                  'sha256': digest, 'bytes': len(data), 'durationSeconds': duration,
                                  'codec': stream['codec_name'], 'channels': stream['channels'],
                                  'sampleRate': int(stream['sample_rate']), 'fullDecode': True})
    report['total'] = len(report['records'])
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'total': report['total'], 'fullDecode': True, 'output': str(output)}))

if __name__ == '__main__':
    main()
