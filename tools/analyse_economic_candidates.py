"""Read-only audit of isolated parameter pilots against their own frozen source."""
import gzip
import hashlib
import json
import pathlib
import subprocess
import sys

root = pathlib.Path(sys.argv[1])
rows = []
sha = lambda value: hashlib.sha256(value).hexdigest()
for name in ['baseline', 'harvest-quarter', 'seed-quarter', 'combined-quarter', 'seed-half-harvest-quarter']:
    p = root / name
    diagnostic = json.loads((p / 'diagnostic.json').read_text())
    report = json.loads((p / 'report.json').read_text())
    summary = json.loads((p / 'summary.json').read_text())
    raw = (p / 'state.json').read_bytes()
    state = json.loads(raw)
    assert sha(raw) == diagnostic['snapshotSha256']
    provenance = diagnostic['provenance']
    source = provenance['gitHead']
    assert provenance['trackedChanges'] == []
    assert report['provenance'] == provenance
    hashes = provenance['sourceHashes']
    batch = subprocess.run(['git', 'cat-file', '--batch'], input=''.join(source + ':' + path + '\n' for path in hashes).encode(), capture_output=True, check=True).stdout
    cursor = 0
    for path, expected in hashes.items():
        end = batch.index(b'\n', cursor)
        header = batch[cursor:end].decode().split()
        assert header[1] == 'blob', path
        start, size = end + 1, int(header[2])
        assert sha(batch[start:start + size]) == expected, path
        cursor = start + size + 1
    assert cursor == len(batch)
    balance_text = subprocess.check_output(['git', 'show', source + ':src/simulation/balance.js']).decode()
    balance = json.loads(balance_text.split('export const BALANCE = ', 1)[1].strip().removesuffix(';'))
    specs = {crop['id']: crop for crop in balance['crops']}
    assert balance['initial_money'] == 1500
    assert balance['workers']['older_wage'] == 30 and balance['workers']['young_wage'] == 40
    entries = state['ledger']['entries']
    assert all(entry['d'] == '1' for entry in entries.values())
    assert state['ledger']['balance']['d'] == '1'
    assert 1500 + sum(int(entry['n']) for entry in entries.values()) == int(state['ledger']['balance']['n'])
    seed_debits = -sum(int(value['n']) for key, value in entries.items() if key.startswith('intensive-plant-'))
    assert seed_debits == sum(specs[plant['species']]['plant_cost'] for plant in state['plants'])
    plants = {plant['id']: plant for plant in state['plants']}
    picked = set()
    delivered = 0
    for crate in state['crates']:
        plant = plants[crate['sourcePlantId']]
        assert not plant['alive'] and plant['id'] not in picked
        picked.add(plant['id'])
        assert crate['species'] == plant['species']
        assert plant['growth'] >= specs[plant['species']]['growth_seconds']
        assert all(water['status'] in ['manual', 'magic'] for water in plant['water'])
        payment = entries.get('deliver:' + crate['id'])
        if crate['delivered']:
            delivered += 1
            numerator, denominator = int(crate['value']['n']), int(crate['value']['d'])
            assert int(payment['n']) == (numerator + denominator - 1) // denominator
            assert crate['carrierId'] is None
        else:
            assert payment is None
    assert delivered == report['counts']['CrateDelivered']
    assert len(picked) == report['counts']['CropPicked']
    assert state['raid'] is None and state['completedNights'] == 10 and state['result'] is None
    assert report['policy'] == diagnostic['policy']
    working_day_failures = [{'day': day['day'], 'paidStaff': day['staff'], 'delivered': day['delivered']}
                            for day in report['daily'] if day['staff'] <= 0 or day['delivered'] <= 0]
    assert summary['activity']['acceptance']['policy']['maximumFraction'] == .25
    assert summary['activity']['acceptance']['policy']['comparison'] == 'strictly-less-than'
    idle = sum(day['idle']['budget'] + day['idle']['space'] + day['idle']['shift-end'] for day in report['daily'])
    assert idle / 3000 == diagnostic['activity']['unoccupiedFraction']
    assert sum(diagnostic['categories'].values()) == sum(day['idle']['budget'] for day in report['daily'])
    rows.append({'case': name, 'source': source, 'sourceHashesVerified': len(hashes),
                 'snapshotSha256': sha(raw), 'completedNights': 10,
                 'inactivity': idle / 3000, 'categories': diagnostic['categories'],
                 'physicalDeliveries': delivered, 'living': sum(plant['alive'] for plant in state['plants']),
                 'cashflow': summary['cashflow'],
                 'physicalWorkingDayGate': {'status': 'failed' if working_day_failures else 'passed',
                                            'failures': working_day_failures},
                 'gates': {'requestedNightsAndNoDefeat': 'passed',
                           'everyDayPaidStaffAndPhysicalDelivery': 'failed' if working_day_failures else 'passed',
                           'integerLedgerHydrationMaturityPaidCrates': 'passed',
                           'shortWindowInactivityBelow25Percent': 'passed' if idle / 3000 < .25 else 'failed',
                           'responsible100NightActivityAndSurvival': 'not-tested',
                           'responsible30CaseMatrix': 'not-tested',
                           'poorManagementThisParameterSet': 'passed-three-natural-losses' if name == 'combined-quarter' else 'not-tested-here'},
                 'files': {file.name: sha(file.read_bytes()) for file in sorted(p.iterdir()) if file.is_file()},
                 'taskRuntimeSha256': hashes['src/simulation/tasks.js'],
                 'gameRuntimeSha256': hashes['src/simulation/game.js']})
assert len({row['taskRuntimeSha256'] for row in rows}) == 1
assert len({row['gameRuntimeSha256'] for row in rows}) == 1
assert rows[0]['snapshotSha256'] == 'c6fd00eff33940158e69aa72f3719c674974248099e5c04024a2ca53b69d3f31'
poor_directory = root / 'combined-quarter-poor'
poor = json.loads((poor_directory / 'matrix.json').read_text())
assert poor['status'] == 'passed' and poor['sourcesUnchanged'] and poor['defeats'] == 3
assert poor['provenance']['gitHead'] == rows[3]['source']
for case in poor['cases']:
    raw = gzip.decompress((poor_directory / (case['biome'] + '-state.json.gz')).read_bytes())
    assert sha(raw) == case['snapshotSha256']
    state = json.loads(raw)
    assert state['result'] == case['result'] and state['completedNights'] == case['completedNights']
    assert state['raid'] is None
result = {'status': 'retained-pilot-records-verified-with-gate-failures', 'cases': rows,
          'combinedCandidatePoorManagement': {'defeats': poor['defeats'], 'cases': poor['cases']},
          'scope': 'Read-only own-source hashes/real seed debits/hydration/maturity/paid physical deliveries/integer-ledger verification of10-night pilots. Working-day gate is explicitly FAILED for B/C/D (day1 zero delivered), never approved by this record audit. Initial strict audit failure is preserved. Native runner separately audits FIFO/saves through unchanged game/tasks runtime. A short window exceeding25% does not prove100-night failure; none proves100-night/matrix acceptance. D poor-management coverage is pending. No replay, reseeding or policy/reserve changes.'}
(root / 'comparison.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'status': result['status'], 'inactivity': {row['case']: row['inactivity'] for row in rows},
                  'failedWorkingDayCases': [row['case'] for row in rows if row['physicalWorkingDayGate']['status'] == 'failed'],
                  'poorCDefeats': poor['defeats']}))
if any(row['physicalWorkingDayGate']['status'] == 'failed' for row in rows):
    raise SystemExit(1)  # Record originals but preserve the failed acceptance exit.
