"""Build a non-shipping hem-weight candidate; run with Blender -- --output PATH."""
import argparse
import pathlib
import sys
import bpy

root = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'tools/guardian'))
from hem_weights import relax_hem
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=pathlib.Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
source = root / 'art/guardian/guardian.blend'
if args.output.resolve() == source.resolve():
    parser.error('Use a separate candidate path until visual review is complete.')
bpy.ops.wm.open_mainfile(filepath=str(source))
print('Relaxed cloth vertices:', relax_hem(bpy.data.objects['Guardian']))
bpy.ops.wm.save_as_mainfile(filepath=str(args.output.resolve()))
