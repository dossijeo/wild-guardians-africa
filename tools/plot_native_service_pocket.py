"""Render a retained native collision diagnostic; never claim game visual QA."""
import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from matplotlib.patches import Patch

parser = argparse.ArgumentParser()
parser.add_argument('input', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
if args.output.exists():
    raise ValueError('Refuse overwriting prior diagnostic')
data = json.loads(args.input.read_text(encoding='utf-8'))
p, step, half = data['point'], data['step'], data['halfCells']
extent = [p['x']-(half+.5)*step, p['x']+(half+.5)*step,
          p['z']-(half+.5)*step, p['z']+(half+.5)*step]
fig, ax = plt.subplots(figsize=(9, 8))
ax.imshow(data['rows'], origin='lower', extent=extent, interpolation='nearest',
          cmap=ListedColormap(['#7894ab', '#ab8064', '#c6d99c']), vmin=0, vmax=2)
for q in data['services']:
    ax.scatter(q['x'], q['z'], s=18, color='#17642e' if q['body'] else '#555555')
ax.scatter([q['x'] for q in data['origins']], [q['z'] for q in data['origins']],
           s=80, marker='x', color='#202020', label='Nine native lattice origins')
ax.scatter(p['x'], p['z'], s=140, marker='*', color='#c22c36', label='Unproven service pose')
ax.scatter(data['target']['x'], data['target']['z'], s=65, marker='o',
           color='#e4c334', edgecolors='black', label='Crop target')
ax.set(xlim=extent[:2], ylim=extent[2:], xlabel='World X (m)', ylabel='World Z (m)',
       title=f"Canyon natural collision samples — hostile radius {data['radius']} m")
ax.set_aspect('equal')
handles, labels = ax.get_legend_handles_labels()
handles += [Patch(color=c, label=t) for c, t in
            [('#7894ab', 'Terrain blocked'), ('#ab8064', 'Solid/prop blocked'),
             ('#c6d99c', 'Body-valid')]]
ax.legend(handles=handles, loc='upper left', fontsize=8)
fig.text(.5, .015, 'Read-only sampled geometry; not a continuous closure certificate or game screenshot.',
         ha='center', fontsize=9)
fig.tight_layout(rect=[0, .04, 1, 1])
fig.savefig(args.output, dpi=150)
plt.close(fig)
