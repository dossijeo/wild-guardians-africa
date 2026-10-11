"""One completed native campaign; does not relax the paired comparison gates."""
import argparse
import hashlib
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def plot(directory, prefix):
    directory, prefix = Path(directory), Path(prefix)
    receipt = json.loads((directory / 'receipt.json').read_text(encoding='utf-8'))
    report = json.loads((directory / 'report.json').read_text(encoding='utf-8'))
    source_bytes = (directory / 'source.json').read_bytes()
    if receipt['status'] not in ('observed-horizon', 'observed-native-defeat'):
        raise ValueError('Only terminal native evidence can be plotted')
    rows = report['daily']
    if not rows or receipt['completedNights'] != report['completedNights']:
        raise ValueError('Missing or inconsistent terminal horizon')
    if report['money'] != rows[-1]['money'] or any(r['finance']['reconciliationDifference'] for r in rows):
        raise ValueError('Unreconciled native cashflow')
    outputs = [Path(str(prefix) + extension) for extension in ('.png', '.svg', '.json')]
    if any(p.exists() for p in outputs):
        raise FileExistsError('Refusing to overwrite retained evidence')
    days = [r['day'] for r in rows]
    fig, axes = plt.subplots(2, 2, figsize=(12, 8), constrained_layout=True)
    axes[0, 0].plot(days, [r['money'] for r in rows], color='#a87816', marker='o')
    axes[0, 0].set_title('Saldo al cierre'); axes[0, 0].set_ylabel('Monedas')
    axes[0, 1].plot(days, [r['living'] for r in rows], color='#387642', marker='o')
    axes[0, 1].set_title('Cultivos vivos al cierre'); axes[0, 1].set_ylabel('Plantas')
    for key, label, color in [('income', 'Entregas cobradas', '#387642'), ('wages', 'Jornales', '#657ab2'), ('seeds', 'Semillas', '#a87816'), ('walls', 'Murallas', '#8f6ba8'), ('repairs', 'Reparaciones', '#b85a4c')]:
        axes[1, 0].plot(days, [r['finance'][key] for r in rows], label=label, color=color)
    axes[1, 0].set_title('Movimientos económicos reales'); axes[1, 0].set_ylabel('Monedas'); axes[1, 0].legend(fontsize=8)
    axes[1, 1].bar(days, [r['destroyed'] for r in rows], color='#b85a4c', label='Destruidas')
    axes[1, 1].plot(days, [r['planted'] for r in rows], color='#387642', label='Compradas', linewidth=1.5)
    axes[1, 1].set_title('Reposición y pérdidas agrícolas'); axes[1, 1].set_ylabel('Plantas'); axes[1, 1].legend(fontsize=8)
    for ax in axes.flat:
        ax.set_xlabel('Jornada registrada'); ax.grid(alpha=.2)
    fig.suptitle(f"{report['biome']} / {report['culture']} — {report['strategy']} — semilla {report['seed']}\n{receipt['completedNights']} noches completas; no acredita 100 noches ni actividad humana", fontsize=12)
    prefix.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(outputs[0], dpi=140); fig.savefig(outputs[1]); plt.close(fig)
    svg_lines = outputs[1].read_text(encoding='utf-8').splitlines()
    outputs[1].write_bytes(('\n'.join(line.rstrip() for line in svg_lines) + '\n').encode('utf-8'))
    outputs[2].write_text(json.dumps({'directory': str(directory), 'status': receipt['status'], 'sourceManifestSha256': hashlib.sha256(source_bytes).hexdigest(), 'completedNights': receipt['completedNights'], 'scope': 'Single terminal native campaign, no paired causal comparison or long-horizon acceptance.'}, indent=2) + '\n', encoding='utf-8', newline='\n')
    return [str(p) for p in outputs]

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory'); parser.add_argument('--out', required=True)
    args = parser.parse_args()
    print(json.dumps(plot(args.directory, args.out)))
