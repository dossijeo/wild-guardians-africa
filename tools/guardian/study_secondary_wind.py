"""Isolated secondary wind trial; never overwrites the installed source/model."""
import bpy,pathlib,hashlib,json,argparse,sys
root=pathlib.Path.cwd()
parser=argparse.ArgumentParser();parser.add_argument('--source',type=pathlib.Path,default=root/'art/guardian/guardian.blend')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
source=args.source
expected='80276fe5ebfe9b02f23812a27e5be907ef02c38b484482aef492aafc3da15424'
assert hashlib.sha256(source.read_bytes()).hexdigest()==expected,'Expected installed mantle-weight source'
bpy.ops.wm.open_mainfile(filepath=str(source));rig=bpy.data.objects['GuardianRig'];changed=[]
for track in rig.animation_data.nla_tracks:
 if track.name not in ['Mantle_Breeze','Mantle_Spell']:continue
 for strip in track.strips:
  for curve in strip.action.fcurves:
   path=curve.data_path;factor=1
   if 'Wood.' in path and path.endswith('location'):factor=1.65
   elif 'Feather.' in path and '.Tip' in path and path.endswith('rotation_euler'):factor=1.2
   if factor==1:continue
   for key in curve.keyframe_points:
    key.co.y*=factor;key.handle_left.y*=factor;key.handle_right.y*=factor
   changed.append({'track':track.name,'path':path,'axis':curve.array_index,'factor':factor})
assert changed
bpy.ops.wm.save_as_mainfile(filepath='C:/tmp/guardian-secondary-wind.blend')
(root/'docs/guardian/wind-wide/mantle-review/secondary-trial.json').write_text(json.dumps({'sourceSha256':expected,'changes':changed,'status':'isolated candidate; not installed'},indent=2))
