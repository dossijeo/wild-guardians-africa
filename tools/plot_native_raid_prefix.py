"""Plot an explicitly scoped retained raid prefix; never approve a campaign."""
import argparse
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator


def plot(table_path, prefix):
    table_path, prefix = Path(table_path), Path(prefix)
    raw = table_path.read_bytes()
    table = json.loads(raw)
    rows = table['rows']
    if table['observerStatus'] != 'verified' or not rows:
        raise ValueError('Missing verified retained raid observations')
    if any(r['assignedHits'] != r['usedHits'] + r['unusedHits'] for r in rows):
        raise ValueError('Inconsistent native attack budgets')
    nights = [r['night'] for r in rows]
    if len(set(nights)) != len(nights) or nights != sorted(nights):
        raise ValueError('This chart requires distinct, ordered nightly encounters')
    outputs = [Path(str(prefix) + suffix) for suffix in ('.png', '.svg', '.json')]
    if any(p.exists() for p in outputs):
        raise FileExistsError('Refusing to overwrite retained evidence')
    fig, axes = plt.subplots(2, 3, figsize=(15, 8), constrained_layout=True)
    panels = [
        ('Saldo real al cierre', 'Monedas', [('money', 'Saldo')]),
        ('Exposición y destrucción observadas', 'Plantas', [('exposedPlants', 'Vivas al inicio'), ('destroyedPlants', 'Destruidas')]),
        ('Presupuesto de ataques', 'Golpes', [('assignedHits', 'Asignados'), ('usedHits', 'Consumidos'), ('unusedHits', 'No consumidos')]),
        ('Daño agrícola: referencia frente a impactos', 'Puntos HP', [('potentialAgriculturalHp', 'Potencial de referencia'), ('effectiveAgriculturalHp', 'Efectivo')]),
        ('Daño físico a murallas', 'Puntos HP', [('wallHpLost', 'HP perdido')]),
        ('Defensas efectivamente pagadas', 'Monedas', [('paidWalls', 'Compra de murallas'), ('paidRepairs', 'Reparaciones')]),
    ]
    for axis, (title, unit, series) in zip(axes.flat, panels):
        for key, label in series:
            axis.plot(nights, [r[key] for r in rows], marker='o', markersize=3, label=label)
        axis.set_title(title, fontsize=10)
        axis.set_xlabel('Noche observada')
        axis.set_ylabel(unit)
        axis.xaxis.set_major_locator(MaxNLocator(integer=True))
        axis.set_ylim(bottom=0)
        axis.grid(alpha=.2)
        axis.legend(fontsize=8)
    fig.suptitle(f"Prefijo de {len(rows)} incursiones terminadas — campaña {table['campaignStatus']}\nNo acredita 100 noches, ventaja causal de murallas ni actividad humana", fontsize=12)
    prefix.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(outputs[0], dpi=140)
    fig.savefig(outputs[1])
    plt.close(fig)
    svg = outputs[1].read_text(encoding='utf-8')
    outputs[1].write_text('\n'.join(line.rstrip() for line in svg.splitlines()) + '\n', encoding='utf-8', newline='\n')
    metadata = {
        'table': str(table_path),
        'tableSha256': hashlib.sha256(raw).hexdigest(),
        'sourcePartialSha256': table['sourcePartialSha256'],
        'campaignStatus': table['campaignStatus'],
        'observedEndedRaids': len(rows),
        'scope': table['scope'],
        'acceptsCampaign': False,
    }
    outputs[2].write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8', newline='\n')
    return [str(p) for p in outputs]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('table')
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    print(json.dumps(plot(args.table, args.out)))
