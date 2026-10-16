"""Exercise a real Chrome tab visibility transition through DevTools Protocol.

Requires a separately started Chrome with remote debugging and websocket-client.
The page must be served by Vite so the dev-only qa-visibility readout is present.
"""

import argparse
import hashlib
import json
import subprocess
import time
import urllib.request
from pathlib import Path

import websocket


class CDP:
    def __init__(self, endpoint):
        self.ws = websocket.create_connection(endpoint, timeout=30)
        self.ws.settimeout(30)
        self.next_id = 0
        self.events = []

    def call(self, method, params=None):
        self.next_id += 1
        request_id = self.next_id
        self.ws.send(json.dumps({'id': request_id, 'method': method, 'params': params or {}}))
        while True:
            response = json.loads(self.ws.recv())
            if response.get('id') == request_id:
                if 'error' in response:
                    raise RuntimeError(f'{method}: {response["error"]}')
                return response.get('result', {})
            self.events.append(response)

    def close(self):
        self.ws.close()


def endpoint(base, target_id=None):
    if target_id is None:
        return json.load(urllib.request.urlopen(base + '/json/version'))['webSocketDebuggerUrl']
    targets = json.load(urllib.request.urlopen(base + '/json'))
    return next(target['webSocketDebuggerUrl'] for target in targets if target['id'] == target_id)


def evaluate(page, expression, context_id=None):
    params = {'expression': expression, 'returnByValue': True, 'awaitPromise': True}
    if context_id is not None:
        params['contextId'] = context_id
    result = page.call('Runtime.evaluate', params)
    if 'exceptionDetails' in result:
        raise RuntimeError(str(result['exceptionDetails']))
    return result['result'].get('value')


def await_value(page, expression, *, timeout=120, interval=.5):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        value = evaluate(page, expression)
        if value:
            return value
        time.sleep(interval)
    raise TimeoutError(f'Timed out: {expression}')


def child_frame(tree, needle):
    for child in tree.get('childFrames', []):
        if needle in child['frame']['url']:
            return child['frame']['id']
        found = child_frame(child, needle)
        if found:
            return found
    return None


def observation(page):
    result = evaluate(page, 'globalThis.wildGuardiansVisibilityQa?.()')
    if not result or result['snapshot'] is None:
        raise RuntimeError('The game state readout is not available')
    state = json.loads(result.pop('snapshot'))
    result.update({
        'day': state['day'], 'time': state['time'], 'elapsed': state['elapsed'],
        'pauses': state['pauses'], 'balance': state['ledger']['balance'],
        'livingCrops': sum(bool(crop['alive']) for crop in state['plants']),
        'workers': len(state['workers']), 'events': len(state['events']),
        'firstLivingCrop': next(({
            'id': crop['id'], 'growth': crop.get('growth'),
            'water': crop.get('water'), 'attackHits': crop.get('attackHits')
        } for crop in state['plants'] if crop['alive']), None),
        'firstWorker': next(({
            'id': worker['id'], 'x': worker['x'], 'z': worker['z'],
            'status': worker['status'], 'taskId': worker.get('taskId')
        } for worker in state['workers']), None),
    })
    state['pauses'] = [pause for pause in state['pauses'] if pause != 'hidden']
    result['stateSha256WithoutHiddenPause'] = hashlib.sha256(
        json.dumps(state, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    ).hexdigest()
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cdp', default='http://127.0.0.1:9223')
    parser.add_argument('--game', default='http://127.0.0.1:5179/?qa-seed=712&qa-visibility')
    parser.add_argument('--seconds', type=float, default=300)
    parser.add_argument('--fixture', help='Repository-relative saved game JSON to load through the real browser repository')
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    version = json.load(urllib.request.urlopen(args.cdp + '/json/version'))
    browser = CDP(endpoint(args.cdp))
    targets = []
    report = {'schema': 1, 'gameUrl': args.game, 'hiddenDurationRequestedSeconds': args.seconds,
              'browser': version['Browser'],
              'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              'qaSourceSha256': {
                  path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
                  for path in ('src/app/main.js', 'tools/experiments/qa-browser-visibility.py')
              }}
    try:
        background_id = browser.call('Target.createTarget', {'url': 'data:text/html,<title>Background tab</title>'})['targetId']
        targets.append(background_id)
        game_id = browser.call('Target.createTarget', {'url': args.game})['targetId']
        targets.append(game_id)
        browser.call('Target.activateTarget', {'targetId': game_id})
        page = CDP(endpoint(args.cdp, game_id))
        try:
            page.call('Page.enable')
            page.call('Runtime.enable')
            await_value(page, "document.querySelector('#native-menu') !== null", timeout=60)
            frame_id = None
            until = time.monotonic() + 60
            while not frame_id and time.monotonic() < until:
                frame_id = child_frame(page.call('Page.getFrameTree')['frameTree'], '/menu/')
                if not frame_id:
                    time.sleep(.2)
            if not frame_id:
                raise TimeoutError('Menu iframe did not become available')
            context = page.call('Page.createIsolatedWorld', {'frameId': frame_id, 'worldName': 'visibility-qa'})['executionContextId']
            if args.fixture:
                fixture_url = '/' + args.fixture.replace('\\', '/').lstrip('/')
                slot_id = evaluate(page, "(async()=>{const response=await fetch(" + json.dumps(fixture_url) + ");if(!response.ok)throw Error('fixture fetch '+response.status);const state=await response.json();const open=indexedDB.open('wild-guardians-saves',1);open.onupgradeneeded=()=>open.result.createObjectStore('slots',{keyPath:'slotId'});const db=await new Promise((resolve,reject)=>{open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error)});await new Promise((resolve,reject)=>{const tx=db.transaction('slots','readwrite');tx.objectStore('slots').put({slotId:state.slotId,primary:JSON.stringify(state),backup:null});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();return state.slotId})()")
                report['fixture'] = {'path': args.fixture, 'slotId': slot_id}
                evaluate(page, "parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:" + json.dumps(slot_id) + "},location.origin);true", context)
            else:
                evaluate(page, "parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'sabana',culture:'mapungubwe'},location.origin);true", context)
            ready = await_value(page, "document.querySelector('#stage[aria-busy=false]') !== null || document.querySelector('.loading-failure') !== null", timeout=150)
            if evaluate(page, "document.querySelector('.loading-failure')?.textContent ?? null"):
                raise RuntimeError('Loading failed: ' + str(evaluate(page, "document.querySelector('.loading-failure').textContent")))
            report['stageReady'] = ready
            time.sleep(3)
            report['before'] = observation(page)
            page.events.clear()
            browser.call('Target.activateTarget', {'targetId': background_id})
            time.sleep(1)
            report['hiddenStart'] = observation(page)
            time.sleep(args.seconds)
            report['hiddenEnd'] = observation(page)
            report['hiddenNavigationEvents'] = [event['method'] for event in page.events
                                                if event.get('method') == 'Runtime.executionContextsCleared'
                                                or event.get('method') == 'Page.frameNavigated'
                                                and 'parentId' not in event.get('params', {}).get('frame', {})]
            browser.call('Target.activateTarget', {'targetId': game_id})
            report['restored'] = observation(page)
            time.sleep(2.5)
            report['restoredAfter2_5s'] = observation(page)
            report['hiddenDurationObservedSeconds'] = (report['hiddenEnd']['observedAt'] - report['hiddenStart']['observedAt']) / 1000
            report['pageExceptions'] = [event['params']['exceptionDetails']['text']
                                        for event in page.events if event.get('method') == 'Runtime.exceptionThrown']
            report['checks'] = {
                'actualHidden': report['hiddenStart']['hidden'] and report['hiddenEnd']['hidden'] and not report['before']['hidden'] and not report['restored']['hidden'],
                'hiddenPausePresent': 'hidden' in report['hiddenStart']['pauses'] and 'hidden' in report['hiddenEnd']['pauses'],
                'stateUnchangedWhileHidden': report['hiddenStart']['stateSha256WithoutHiddenPause'] == report['hiddenEnd']['stateSha256WithoutHiddenPause'],
                'noNavigationWhileHidden': not report['hiddenNavigationEvents'],
                'noOfflineCatchup': report['restoredAfter2_5s']['elapsed'] - report['hiddenEnd']['elapsed'] < 5,
                'hiddenPauseRemoved': 'hidden' not in report['restoredAfter2_5s']['pauses'],
                'noPageExceptions': not report['pageExceptions'],
            }
            report['ok'] = all(report['checks'].values())
        finally:
            page.close()
    except Exception as error:
        report['error'] = str(error)
        report['ok'] = False
    finally:
        for target_id in targets:
            try:
                browser.call('Target.closeTarget', {'targetId': target_id})
            except Exception:
                pass
        browser.close()
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open('w', encoding='utf-8', newline='\n') as sink:
            sink.write(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
        print(json.dumps({'ok': report['ok'], 'checks': report.get('checks'), 'error': report.get('error'), 'out': str(args.out)}, ensure_ascii=False))
    if not report['ok']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
