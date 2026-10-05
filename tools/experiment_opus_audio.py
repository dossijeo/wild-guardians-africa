"""Experimental Opus conversion. Does not edit runtime assets or catalogues."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def run(executable, args):
    return subprocess.run([executable, *map(str, args)], check=True, capture_output=True)

def decoded(path, channels, ffmpeg):
    with tempfile.TemporaryDirectory(prefix='wg-opus-pcm-') as folder:
        pcm = Path(folder) / 'decoded.raw'
        result = run(ffmpeg, ['-hide_banner', '-nostdin', '-v', 'info', '-i', path,
            '-map', '0:a:0', '-af', 'astats=metadata=0:reset=0', '-ar', '48000',
            '-c:a', 'pcm_f32le', '-f', 'f32le', pcm])
        size = pcm.stat().st_size
        if size % (channels * 4):
            raise ValueError('Unaligned decoded PCM')
        text = result.stderr.decode('utf-8', errors='replace')
        def metric(label):
            values = re.findall(re.escape(label) + r':\s*([-+\w.]+)', text)
            value = float(values[-1]) if values else None
            return value if value is not None and abs(value) != float('inf') else None
        return {'samples48000': size // (channels * 4),
            'pcmSha256': sha(pcm), 'peakDb': metric('Peak level dB'),
            'rmsDb': metric('RMS level dB')}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='.cache/opus-audit')
    parser.add_argument('--limit', type=int, default=None, help='Smoke experiment only; no full coverage claim')
    args = parser.parse_args()
    ffmpeg, ffprobe = shutil.which('ffmpeg'), shutil.which('ffprobe')
    if not ffmpeg or not ffprobe:
        raise RuntimeError('ffmpeg with libopus and ffprobe are required')
    output = (ROOT / args.output).resolve()
    # Experiments cannot overwrite any distributed files or their source assets.
    if not output.is_relative_to(ROOT / '.cache'):
        raise ValueError('Output must be inside the workspace .cache directory')
    output.mkdir(parents=True, exist_ok=True)
    bank = json.loads((ROOT / 'public/content/sfx.json').read_text(encoding='utf-8'))
    sfx = {item['audio']['url']: item for item in bank['items']}
    files = sorted((ROOT / 'public/assets').glob('*.mp3'))
    report = {'scope': 'Experimental full-file conversion; not runtime integration, listening or browser compatibility proof.',
        'encoderVersion': run(ffmpeg, ['-version']).stdout.decode().splitlines()[0],
        'parameters': {'codec': 'libopus', 'application': 'audio', 'vbr': 'on',
            'compressionLevel': 10, 'frameDurationMs': 20, 'sampleRate': 48000,
            'monoSfxBitrate': 64000, 'stereoSfxBitrate': 96000, 'musicBitrate': 128000},
        'expectedFiles': len(files), 'status': 'running', 'records': []}
    def save():
        (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    save()
    for path in files[:args.limit]:
        url = '/assets/' + path.name
        item = sfx.get(url)
        source_sha = sha(path)
        if item and source_sha != item['sha256']:
            raise ValueError('Original SFX hash mismatch: ' + item['id'])
        stream = json.loads(run(ffprobe, ['-v', 'error', '-select_streams', 'a:0',
            '-show_streams', '-of', 'json', path]).stdout)['streams'][0]
        channels = stream['channels']
        if channels not in (1, 2):
            raise ValueError('Unexpected channel layout')
        bitrate = (64000 if channels == 1 else 96000) if item else 128000
        target = output / (source_sha + '.opus')
        run(ffmpeg, ['-hide_banner', '-nostdin', '-v', 'error', '-y', '-i', path,
            '-map', '0:a:0', '-map_metadata', '-1', '-c:a', 'libopus', '-ar', '48000',
            '-b:a', bitrate, '-vbr', 'on', '-compression_level', '10',
            '-frame_duration', '20', '-application', 'audio', target])
        after_stream = json.loads(run(ffprobe, ['-v', 'error', '-select_streams', 'a:0',
            '-show_streams', '-of', 'json', target]).stdout)['streams'][0]
        if after_stream['codec_name'] != 'opus' or after_stream['channels'] != channels:
            raise ValueError('Opus codec/channel mismatch')
        before, after = decoded(path, channels, ffmpeg), decoded(target, channels, ffmpeg)
        row = {'source': url, 'sourceSha256': source_sha, 'id': item['id'] if item else path.stem,
            'role': 'sfx' if item else 'music', 'loop': item.get('loop') if item else None,
            'originalCodec': stream['codec_name'], 'channels': channels, 'targetBitrate': bitrate,
            'originalBytes': path.stat().st_size, 'opusBytes': target.stat().st_size,
            'opusSha256': sha(target), 'before': before, 'after': after,
            'sampleDelta': after['samples48000'] - before['samples48000']}
        report['records'].append(row);save()
        print(json.dumps({'done': len(report['records']), 'total': len(files),
            'role': row['role'], 'bytes': row['opusBytes'], 'sampleDelta': row['sampleDelta']}), flush=True)
    report['status'] = 'measured' if len(report['records']) == len(files) else 'partial'
    report['totals'] = {key: sum(r[key] for r in report['records']) for key in ['originalBytes', 'opusBytes']}
    report['sampleCountMismatches'] = sum(r['sampleDelta'] != 0 for r in report['records'])
    save()

if __name__ == '__main__':
    main()
