"""Read-only comparison of completed, identically configured native campaigns."""
import argparse
import csv
import json
from pathlib import Path


def collect(directories, *, vary_defense_material=False):
    runs = []
    for directory in directories:
        path = Path(directory)
        receipt = json.loads((path / 'receipt.json').read_text(encoding='utf-8'))
        report = json.loads((path / 'report.json').read_text(encoding='utf-8'))
        source = json.loads((path / 'source.json').read_text(encoding='utf-8'))
        if receipt['status'] not in ('observed-horizon', 'observed-native-defeat'):
            raise ValueError(f'{path}: campaign is not terminal native evidence')
        if receipt['completedNights'] != report['completedNights'] or not report['daily'] or len(report['daily']) < report['completedNights']:
            raise ValueError(f'{path}: inconsistent or missing completed-night evidence')
        for day in report['daily']:
            if day['finance']['reconciliationDifference'] != 0:
                raise ValueError(f'{path}: unreconciled ledger')
        runs.append((path, report, source))
    if len(runs) < 2:
        raise ValueError('Comparison requires at least two campaigns')
    first = runs[0][1]
    for path, report, source in runs[1:]:
        if source['sourceHashes'] != runs[0][2]['sourceHashes']:
            raise ValueError(f'{path}: frozen sources differ')
        if report.get('protocol', {}).get('cropHitPoints', 2) != first.get('protocol', {}).get('cropHitPoints', 2):
            raise ValueError(f'{path}: crop resistance differs')
        for key in ('seed', 'biome', 'culture', 'labourPolicy'):
            if report[key] != first[key]:
                raise ValueError(f'{path}: {key} differs')
        # Strategies may differ; rules and player-policy implementations may not.
        if report['policy'].get('defenseFunding', 'contour') != first['policy'].get('defenseFunding', 'contour'):
            raise ValueError(f'{path}: defense funding choices differ')
        for key in ('profile', 'cropPolicy', 'defensePolicy', 'defenseStartDay', 'plotFluidClearance'):
            if report['policy'][key] != first['policy'][key]:
                raise ValueError(f'{path}: policy setting {key} differs')
        if vary_defense_material:
            if report['strategy'] != first['strategy']:
                raise ValueError('Material experiment must preserve the player strategy')
        elif report['policy'].get('defenseMaterial', 'zarzas') != first['policy'].get('defenseMaterial', 'zarzas'):
            raise ValueError(f'{path}: policy setting defenseMaterial differs')
    return runs


def write_comparison(prefix, directories, *, vary_defense_material=False):
    runs = collect(directories, vary_defense_material=vary_defense_material)
    prefix = Path(prefix)
    outputs = [Path(str(prefix) + suffix) for suffix in ('.json', '.csv', '.png', '.svg')]
    if any(p.exists() for p in outputs):
        raise FileExistsError('Refusing to overwrite retained comparison')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.ticker import MaxNLocator
    fig, axes = plt.subplots(2, 2, figsize=(12, 8), constrained_layout=True)
    summary, rows = [], []
    for path, report, _ in runs:
        label = report['strategy']
        material = report['policy'].get('defenseMaterial', 'zarzas')
        if vary_defense_material:
            label += ' / ' + material
        if report['result'] == 'defeat':
            label += ' (defeat)'
        days = report['daily']
        x = [d['day'] for d in days]
        cumulative_losses, cumulative_defense = [], []
        losses = defense = 0
        for day in days:
            losses += day['destroyed']
            defense += day['finance']['walls'] + day['finance']['repairs']
            cumulative_losses.append(losses)
            cumulative_defense.append(defense)
            rows.append(dict(strategy=label, defenseMaterial=material, day=day['day'], cash=day['money'],
                             living=day['living'], destroyed=day['destroyed'],
                             delivered=day['delivered'], planted=day['planted'],
                             **{k: day['finance'][k] for k in ('income', 'seeds', 'wages', 'walls', 'repairs', 'reconciliationDifference')}))
        summary.append(dict(path=str(path), strategy=label, defenseMaterial=material, nights=report['completedNights'], terminalDay=days[-1]['day'],
                            result=report['result'], cash=report['money'], living=days[-1]['living'],
                            destroyed=losses, paidDefense=defense,
                            decisionIdleProxy=report['activity']['unoccupiedFraction'],
                            humanManualActivityMeasured=report['activity']['humanManualTimeMeasured']))
        for axis, y in zip(axes.flat, ([d['money'] for d in days], [d['living'] for d in days], cumulative_losses, cumulative_defense)):
            axis.plot(x, y, marker='o', markersize=3, label=label)
    for axis, title in zip(axes.flat, ('Available coins', 'Living crops', 'Cumulative destroyed crops', 'Paid walls and repairs (coins)')):
        axis.set_title(title)
        axis.set_xlabel('Native day (includes terminal defeat)' if any(report['result'] is not None for _, report, _ in runs) else 'Native day')
        axis.xaxis.set_major_locator(MaxNLocator(integer=True))
        first_day = min(d['day'] for _, report, _ in runs for d in report['daily'])
        last_day = max(d['day'] for _, report, _ in runs for d in report['daily'])
        axis.set_xlim(first_day if first_day < last_day else first_day - .5,
                      last_day if first_day < last_day else last_day + .5)
        axis.grid(alpha=.25)
        axis.legend()
    for axis in axes[1]:
        axis.set_ylim(bottom=0)
        if all(all(y == 0 for y in line.get_ydata()) for line in axis.lines):
            axis.set_ylim(0, 1)
            axis.set_yticks([0])
    first = runs[0][1]
    fig.suptitle(f"{first['biome']} / {first['culture']} — seed {first['seed']}\nNative evidence; no 100-night or manual-activity acceptance", fontsize=13)
    prefix.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(outputs[2], dpi=140)
    fig.savefig(outputs[3])
    # Matplotlib uses platform newlines for SVG; keep repository artifacts LF.
    svg_lines = outputs[3].read_text(encoding='utf-8').splitlines()
    outputs[3].write_bytes(('\n'.join(line.rstrip() for line in svg_lines) + '\n').encode('utf-8'))
    plt.close(fig)
    outputs[0].write_bytes((json.dumps(dict(source=runs[0][2]['sourceHashes'], summary=summary, varyDefenseMaterial=vary_defense_material,
                                          scope='Completed native campaigns with matching source, seed, biome, culture and rule configuration; idle proxy is not measured manual activity.'), indent=2) + '\n').encode('utf-8'))
    with outputs[1].open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True)
    parser.add_argument('--vary-defense-material', action='store_true', help='Explicit same-strategy, one-factor material comparison')
    parser.add_argument('directories', nargs='+')
    args = parser.parse_args()
    print(json.dumps(write_comparison(args.out, args.directories, vary_defense_material=args.vary_defense_material)))
