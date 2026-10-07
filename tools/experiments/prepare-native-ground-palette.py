"""Offline Sabana material averages; no asset modification or API calls."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageStat
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
material = json.loads((root / 'public/content/ground-materials.json').read_text())['savanna']
inputs, means = {}, {}
for role in ['base', 'arh']:
    path = root / 'public' / material[role].lstrip('/')
    with Image.open(path) as source:
        image = source.convert('RGB')
        means[role] = [value / 255 for value in ImageStat.Stat(image).mean]
        inputs[role] = {'url': material[role], 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'size': image.size}
record = {'type': 'savanna-mapped-average-v1', 'means': means, 'sourceInputs': inputs,
          'recipeSHA256': hashlib.sha256((root / 'src/rendering/biome-material-source.js').read_bytes()).hexdigest(),
          'scope': 'QA approximation: flat normal, diffuse fixed sunlight only; no shadows/environment/normal detail, no pixel equivalence'}
Path(args.output).write_text(json.dumps(record, indent=2), newline='\n')
