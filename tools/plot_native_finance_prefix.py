"""Plot an audited completed-row prefix without claiming campaign completion."""
import argparse
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator


def plot(source, prefix):
    source, prefix = Path(source), Path(prefix)
    raw = source.read_bytes()
    report = json.loads(raw)
    if report['scope'] != 'captured-completed-row-accounting-only':
        raise ValueError('Requires a scoped accounting prefix')
    if any(report[key] for key in ['provesCampaignCompletion', 'provesPhysicalDeliveries', 'provesHumanActivity']):
        raise ValueError('This chart cannot certify campaign or physical acceptance')
    if int(report['totals']['refunds']) or int(report['totals']['otherCredits']):
        raise ValueError('Credit grouping requires a separate implementation')
    rows = report['days']
    if not rows or [r['day'] for r in rows] != list(range(1, len(rows) + 1)):
        raise ValueError('Nonconsecutive prefix')
    opening = report['opening']
    expenses = []
    for row in rows:
        expenses.append(opening + row['income'] - row['money'])
        if expenses[-1] < 0:
            raise ValueError('Negative paid expenditure')
        opening = row['money']
    targets = [Path(str(prefix) + ext) for ext in ['.png', '.svg', '.json']]
    if any(p.exists() for p in targets):
        raise FileExistsError('Preserve existing evidence')
    days = [r['day'] for r in rows]
    fig, axes = plt.subplots(2, 2, figsize=(12, 7), constrained_layout=True)
    fig.suptitle(f'Native campaign: {len(rows)} completed days — partial accounting evidence')
    axes[0, 0].plot(days, [r['money'] for r in rows], color='#a26c12')
    axes[0, 0].set_title('Closing cash (coins)')
    axes[0, 1].plot(days, [r['living'] for r in rows], color='#458239')
    axes[0, 1].set_title('Living crop census')
    axes[1, 0].plot(days, [r['income'] for r in rows], label='Recorded income', color='#458239')
    axes[1, 0].plot(days, expenses, label='All paid expenses', color='#b4633d')
    axes[1, 0].set_title('Daily cash flows (coins)')
    axes[1, 0].legend()
    for key, label in [('wages', 'Wages'), ('seeds', 'Seeds'), ('walls', 'New walls'), ('repairs', 'Repairs')]:
        axes[1, 1].plot(days, [r[key] for r in rows], label=label)
    axes[1, 1].set_title('Selected expense categories (coins)')
    axes[1, 1].legend(fontsize=8)
    for ax in axes.flat:
        ax.set_xlabel('Completed day')
        ax.xaxis.set_major_locator(MaxNLocator(integer=True))
        ax.grid(alpha=.2)
    fig.supxlabel('No extrapolation. Does not certify survival to night 100, attack physics or player activity.', fontsize=9)
    fig.savefig(targets[0], dpi=140)
    fig.savefig(targets[1])
    plt.close(fig)
    svg_lines = targets[1].read_text(encoding='utf-8').splitlines()
    targets[1].write_bytes(('\n'.join(line.rstrip() for line in svg_lines) + '\n').encode('utf-8'))
    metadata = {'scope': report['scope'], 'source': str(source), 'sourceSha256': hashlib.sha256(raw).hexdigest(),
                'completedDays': len(rows), 'closingCoins': report['closing'],
                'provesCampaignCompletion': False, 'provesPhysicalDeliveries': False, 'provesHumanActivity': False,
                'expenseDerivation': 'Previous closing/opening plus recorded income minus current closing; refunds and other credits must be zero.',
                'dailyExpenses': expenses}
    targets[2].write_bytes((json.dumps(metadata, indent=2) + '\n').encode('utf-8'))
    print(json.dumps({'completedDays': len(rows), 'outputs': [str(p) for p in targets]}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('prefix')
    args = parser.parse_args()
    plot(args.source, args.prefix)
