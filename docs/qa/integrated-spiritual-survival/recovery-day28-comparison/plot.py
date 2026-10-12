import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path(__file__).resolve().parent
series = [('Referencia C3 · derrota tras noche 33', '#b55342', 'reference-prefix.json'),
          ('Recuperación C4 · incompleta, 28 jornadas', '#247d66', 'recovery-prefix.json')]
fig, axes = plt.subplots(3, 2, figsize=(12, 10), constrained_layout=True)
plots = [('Saldo al cierre', lambda d: d['money'], 'monedas'),
         ('Cultivos vivos al cierre', lambda d: d['living'], 'plantas'),
         ('Ingresos de la jornada', lambda d: d['income'], 'monedas'),
         ('Semillas + salarios + murallas + reparaciones',
          lambda d: sum(d[k] for k in ('seeds', 'wages', 'walls', 'repairs')), 'monedas'),
         ('Cultivos destruidos durante la jornada', lambda d: d['destroyed'], 'plantas'),
         ('Reparaciones pagadas durante la jornada', lambda d: d['repairs'], 'monedas')]
reports = []
for label, color, filename in series:
    report = json.loads((root / filename).read_text(encoding='utf-8'))
    reports.append(report)
    for ax, (title, value, unit) in zip(axes.flat, plots):
        ax.plot([d['day'] for d in report['days']], [value(d) for d in report['days']],
                label=label, color=color, linewidth=1.8)
        ax.set_title(title, fontsize=11)
        ax.set_xlabel('Jornada registrada')
        ax.set_ylabel(unit)
        ax.grid(alpha=.2)
        ax.set_xlim(1, 34)
for ax, (_, value, _) in zip(axes.flat, plots):
    maximum = max(value(d) for report in reports for d in report['days'])
    ax.set_ylim(0, max(1, maximum) * 1.08)
fig.suptitle('Sabana / Mapungubwe · semilla 123 · política buena gestión congelada\n'
             'Datos nativos observados; sin extrapolación ni estimación de victorias', fontsize=14)
handles, labels = axes[0, 0].get_legend_handles_labels()
fig.legend(handles, labels, loc='outside lower center', ncol=2, fontsize=10)
fig.savefig(root / 'comparison.png', dpi=140)
rows = []
indexed = [{d['day']: d for d in r['days']} for r in reports]
for day in range(1, max(r['capturedRows'] for r in reports) + 1):
    cells = [str(day)]
    for items in indexed:
        d = items.get(day)
        cells.extend([str(d[k]) if d else '—' for k in ('money', 'living', 'destroyed', 'income', 'repairs')])
    rows.append('| ' + ' | '.join(cells) + ' |')
header = '| Día | C3 saldo | C3 plantas | C3 pérdidas | C3 ingresos | C3 reparaciones | C4 saldo | C4 plantas | C4 pérdidas | C4 ingresos | C4 reparaciones |\n'
separator = '|---|' + '---:|' * 10 + '\n'
(root / 'daily-table.md').write_bytes((header + separator + '\n'.join(rows) + '\n').encode('utf-8'))
