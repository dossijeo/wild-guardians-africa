"""Build a diagnostic WASM with lazy route tracing; never replaces production."""
import json
import os
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
script = (root / 'tools/build-spatial-savanna-wasm.sh').read_text(encoding='utf-8')
exports = json.loads(re.search(r"-s 'EXPORTED_FUNCTIONS=(\[.*?\])'", script).group(1))
trace = os.environ.get('SPATIAL_ROUTE_TRACE', '1') == '1'
if trace:
    exports += ['_lazy_route_trace_clear', '_lazy_route_trace_count', '_lazy_route_trace_ptr',
                '_lazy_local_route_trace_count', '_lazy_local_route_trace_ptr',
                '_lazy_local_search_trace_count', '_lazy_local_search_trace_ptr']
sector_changes = os.environ.get('SPATIAL_SECTOR_CHANGE_TRACE') == '1'
if sector_changes:
    exports += ['_lazy_sector_change_trace_clear', '_lazy_sector_change_trace_count',
                '_lazy_sector_change_trace_ptr', '_lazy_selected_context',
                '_spatial_world_segment_clear']
declarative_attack = os.environ.get('SPATIAL_DECLARATIVE_ATTACK') == '1'
if declarative_attack:
    exports += ['_nav_declarative_attack_declare', '_nav_declarative_attack_present',
                '_nav_declarative_attack_reconcile', '_nav_declarative_attack_cancel',
                '_nav_declarative_attack_next_deadline', '_nav_declarative_attack_next_due',
                '_nav_declarative_attack_begin_wait', '_nav_declarative_attack_service_wait']
output = os.environ.get('SPATIAL_TRACE_OUTPUT', str(root / '.cache/spatial-route-trace.wasm'))
compiler = os.environ.get('EMXX', 'em++')
export_file = Path(output + '.exports.json')
export_file.parent.mkdir(parents=True, exist_ok=True)
export_file.write_text(json.dumps(exports, separators=(',', ':')), encoding='utf-8')
sources = ['spatial-savanna.cpp', 'lazy-sectors.cpp', 'spatial-route-planner.cpp',
           'spatial-action-planner.cpp', 'spatial-intent-state.cpp', 'spatial-dynamic-bodies.cpp']
flags = (['-DWILD_ROUTE_TRACE'] if trace else [])
if sector_changes:
    flags.append('-DWILD_SECTOR_CHANGE_TRACE')
if declarative_attack:
    flags.append('-DWILD_DECLARATIVE_ATTACK')
if os.environ.get('SPATIAL_PROFILE_TWO_PASS') == '1':
    flags.append('-DWILD_PROFILE_TWO_PASS')
command = [compiler, *(str(root / 'src/world/wild-engine' / name) for name in sources),
           *flags, '-std=c++17', '-O3', '-s', 'STANDALONE_WASM=1',
           '-s', 'ALLOW_MEMORY_GROWTH=1', '-s', 'INITIAL_MEMORY=16777216',
           '-s', 'EXPORTED_FUNCTIONS=@' + str(export_file),
           '--no-entry', '-o', output]
subprocess.run(command, cwd=root, check=True)
