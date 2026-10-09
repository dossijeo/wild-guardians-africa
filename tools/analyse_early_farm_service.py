"""Read retained native observations. Never execute/rewrite simulation state."""
import collections
import gzip
import hashlib
import json
import pathlib
import sys

directory, output = map(pathlib.Path, sys.argv[1:])
read = lambda name: json.loads((directory / name).read_text())
diagnostic, report = read('diagnostic.json'), read('report.json')
final_bytes = gzip.decompress((directory / 'final-state.json.gz').read_bytes())
assert hashlib.sha256(final_bytes).hexdigest() == diagnostic['finalSnapshotSha256']
state = json.loads(final_bytes)
trace_bytes = gzip.decompress((directory / 'daylight-trace.jsonl.gz').read_bytes())
assert hashlib.sha256(trace_bytes).hexdigest() == diagnostic['traceSha256']
samples = [json.loads(line) for line in trace_bytes.splitlines()]
assert len(samples) == diagnostic['samples']
events = {event['id']: event for event in state['events']}
for snapshot in diagnostic['snapshots']:
    raw = gzip.decompress((directory / snapshot['file']).read_bytes())
    assert hashlib.sha256(raw).hexdigest() == snapshot['sha256']
    captured_state = json.loads(raw)
    for event in captured_state['events']:
        if event['id'] in events:
            assert events[event['id']] == event
        events[event['id']] = event

crates = {crate['id']: crate for crate in state['crates']}
sampled_delivery_ids = set()
event_history_matches, unavailable_event_history = set(), set()
rows = []
for day in range(1, diagnostic['days'] + 1):
    selected = [sample for sample in samples if sample['day'] == day]
    seconds = collections.Counter()
    global_seconds = moved = walking_stalled = 0
    route_versions = null_walking = sampled_deliveries = 0
    for sample in selected:
        for delivery in sample['newPhysicalDeliveries']:
            assert delivery['id'] not in sampled_delivery_ids
            sampled_delivery_ids.add(delivery['id'])
            event = events.get(delivery['id'])
            # Native emit retains only the most recent 200 events. Missing
            # historical event bodies cannot be reconstructed from a final save.
            if event is not None:
                assert event['type'] == 'CrateDelivered'
                assert event['workerId'] == delivery['workerId']
                assert event['targetId'] == delivery['crateId']
                event_history_matches.add(delivery['id'])
            else:
                unavailable_event_history.add(delivery['id'])
            crate = crates[delivery['crateId']]
            assert crate['delivered']
            assert 'deliver:' + crate['id'] in state['ledger']['entries']
            sampled_deliveries += 1
    for before, after in zip(selected, selected[1:]):
        dt = after['elapsed'] - before['elapsed']
        # A raid/night gap breaks the sampled interval; no inferred actor time.
        if not 0 < dt <= 1.000001:
            continue
        global_seconds += dt
        for status, count in before['statusCounts'].items():
            seconds[status] += count * dt
        latest = {worker['id']: worker for worker in after['people']}
        for worker in before['people']:
            current = latest.get(worker['id'])
            if current is None:
                continue
            distance = ((current['x'] - worker['x']) ** 2 +
                        (current['z'] - worker['z']) ** 2) ** .5
            moved += distance
            same_task = worker['taskId'] is not None and worker['taskId'] == current['taskId']
            if same_task and worker['status'] == current['status'] == 'walking':
                if distance < 1e-8:
                    walking_stalled += dt
                if current.get('pathVersion') != worker.get('pathVersion'):
                    route_versions += 1
                if worker['path'] is None:
                    null_walking += 1
    actor_seconds = sum(seconds.values())
    daily = next(row for row in report['daily'] if row['day'] == day)
    rows.append({'day': day, 'globalDaylightSecondsObserved': global_seconds,
                 'actorSecondsApprox': actor_seconds,
                 'actorStatusSecondsApprox': dict(seconds),
                 'actorStatusFractionApprox': {key: value / actor_seconds for key, value in seconds.items()},
                 'movementEndpointMetresLowerBound': moved,
                 'walkingStationarySameTaskSecondsApprox': walking_stalled,
                 'sameWalkingTaskRouteVersionChanges': route_versions,
                 'nullPathWhileSameTaskWalkingObservations': null_walking,
                 'daytimeDeliveryEventsVerified': sampled_deliveries,
                 'wholeNativeDayDeliveries': daily['delivered'],
                 'paidStaff': daily['staff'], 'paidWages': daily['wages'],
                 'moneyAfterDay': daily['money'],
                 'nativeActivityIdle': daily['idle'],
                 'firstWaterPendingAtLastDaylightSample': selected[-1]['firstWaterPending'],
                 'livingAtLastDaylightSample': selected[-1]['living']})

aggregate = collections.Counter()
for row in rows:
    aggregate.update(row['actorStatusSecondsApprox'])
for key, value in aggregate.items():
    assert abs(value - diagnostic['statusSecondsApprox'][key]) < 1e-6
assert abs(sum(r['globalDaylightSecondsObserved'] for r in rows) - diagnostic['observedDaylightSeconds']) < 1e-6
assert report['completedNights'] == diagnostic['days'] == 5
assert state['result'] is None
result = {'status': 'retained-observations-verified',
          'source': diagnostic['provenance']['gitHead'],
          'snapshotHashesVerified': len(diagnostic['snapshots']) + 1,
          'traceSha256': diagnostic['traceSha256'], 'rows': rows,
          'actorSecondsApproxTotal': sum(aggregate.values()),
          'actorStatusSecondsApprox': dict(aggregate),
          'daytimeDeliveryEventsVerified': len(sampled_delivery_ids),
          'daytimeEventsMatchingCapturedNativeEventBodies': len(event_history_matches),
          'daytimeEventsWithoutRetainedNativeEventBodies': sorted(unavailable_event_history),
          'nativeWholeDayDeliveries': report['counts']['CrateDelivered'],
          'scope': 'Read-only retained-data audit. Actor seconds multiply elapsed intervals by observed actor counts; they are not global elapsed seconds. One-second left endpoint sampling is approximate. Route-version changes are not proven reroutes. Stationary walking does not identify a blocking cause. Night/raid deliveries may be excluded from daytime trace. Five days/current-main baseline cannot explain late saturation of the distinct original +25% 100-night candidate.'}
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'status': result['status'], 'source': result['source'],
                  'actorSeconds': result['actorSecondsApproxTotal'],
                  'verifiedDaytimeDeliveries': len(sampled_delivery_ids),
                  'nativeDeliveries': result['nativeWholeDayDeliveries']}))
