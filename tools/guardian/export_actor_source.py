"""Export an authored Blend, preserving its saved sampling rate and NLA origin."""
import argparse,sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
source=Path(a.input).resolve();target=Path(a.output).resolve()
assert source.suffix.lower()=='.blend' and target.suffix.lower()=='.glb' and source!=target
bpy.ops.wm.open_mainfile(filepath=str(source))
target.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',
    export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,
    export_force_sampling=True,export_frame_range=False,export_yup=True,
    export_skins=True,export_all_influences=False,export_extras=True)
