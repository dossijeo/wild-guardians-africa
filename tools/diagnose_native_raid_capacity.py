"""Read-only capacity diagnostics; never selects units or inflicts damage."""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path


def capacity_rows(report):
    hp = report.get('protocol', {}).get('cropHitPoints', 2)
    if hp not in (1, 2):
        raise ValueError('Invalid crop resistance')
    evidence = report['raidEvidence']
    if evidence['status'] != 'verified' or evidence['coverageLost']:
        raise ValueError('Incomplete native observer coverage')
    rows = []
    for raid in evidence['raids']:
        facts = raid['pressureFacts']
        if facts['introductory']:
            continue
        if not raid['ended'] or raid['exposureStatus'] != 'exact-native-spawn':
            raise ValueError('Requires completed raids and exact spawn exposure')
        specs = {s['id']: s for s in facts['referenceEnvelope']['rows']}
        hits = unused = 0
        hp_upper = 0
        for species, observed in raid['species'].items():
            spec = specs[species]
            budget = observed['initialHitBudget']
            hits += budget
            unused += observed['unconsumedOrUnobservedBudget']
            damage, cap = spec['cropDamage'], spec['areaCap']
            if not isinstance(budget, int) or budget < 0 or not isinstance(damage, int) or not 0 <= damage <= 4 or not isinstance(cap, int) or not 1 <= cap <= 7:
                raise ValueError('Invalid native attack profile or hit budget')
            # Overestimate: every assigned hit reaches its maximum plant count,
            # all peripheral plants get half damage, no obstacle/shield/miss.
            hp_upper += budget * (min(hp, damage) + (cap - 1) * min(hp, damage * .5))
        census, wounded = raid['exposedLivingAtSpawn'], raid['exposedWoundedAtSpawn']
        if not isinstance(census, int) or not isinstance(wounded, int) or not 0 <= wounded <= census:
            raise ValueError('Missing exact native crop census')
        actual = raid.get('agriculturalHpDamage', 0)
        if not math.isfinite(actual) or actual < 0 or actual > hp_upper + 1e-9:
            raise ValueError('Observed damage exceeds configured physical cap')
        reference = census * (.2057 + .0007 * (raid['day'] - 1))
        rows.append(dict(night=raid['day'], census=census, wounded=wounded,
                         animals=sum(v['generated'] for v in raid['species'].values()),
                         assignedHits=hits, unusedHits=unused,
                         referencePotentialHp=facts['potential'], configuredHpUpper=hp_upper,
                         actualCropHp=actual, destroyed=raid['cropsDestroyed'],
                         destroyedFraction=raid['cropsDestroyed'] / census if census else None,
                         orientativeUnprotectedLoss=reference,
                         # Treat all already wounded crops as free kills. Healthy
                         # crops need the recorded resistance. This deliberately loose bound
                         # does not rely on the directional reference lattice.
                         optimisticStartCohortLossUpper=min(census, wounded + math.floor(hp_upper / hp)),
                         meetsOrientativeCapacity=min(census, wounded + math.floor(hp_upper / hp)) >= reference))
    return rows


def write_report(directory, prefix):
    directory, prefix = Path(directory), Path(prefix)
    paths = [Path(str(prefix) + suffix) for suffix in ('.json', '.csv')]
    if any(p.exists() for p in paths):
        raise FileExistsError('Refusing to overwrite capacity evidence')
    receipt = json.loads((directory / 'receipt.json').read_text(encoding='utf-8'))
    if receipt['status'] not in ('observed-horizon', 'observed-native-defeat'):
        raise ValueError('Requires terminal campaign evidence')
    raw = (directory / 'report.json').read_bytes()
    rows = capacity_rows(json.loads(raw))
    prefix.parent.mkdir(parents=True, exist_ok=True)
    scope = ('Configured full-budget upper bound for the crop cohort exposed at spawn; '
             'all wounded plants treated as free kills, perfect contacts, maximum area cap. '
             'Reference potential is a directional lattice estimate, not a universal cap. '
             'Native pilot does not plant during incursions. This diagnostic cannot inflict '
             'losses, approve balance, or guarantee theoretical damage is physically reachable.')
    paths[0].write_bytes((json.dumps(dict(input=str(directory), reportSha256=hashlib.sha256(raw).hexdigest(),
                                         rows=rows, scope=scope), indent=2) + '\n').encode('utf-8'))
    with paths[1].open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]) if rows else ['night'], lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)
    return rows


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True)
    parser.add_argument('directory')
    args = parser.parse_args()
    print(json.dumps(write_report(args.directory, args.out)))
