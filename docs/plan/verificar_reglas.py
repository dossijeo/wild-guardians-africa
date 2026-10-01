#!/usr/bin/env python3
"""Verificaciones deterministas del Plan Maestro (no ejecutan el videojuego).
Uso: python verificar_reglas.py
Solo biblioteca estándar. Lee los JSON junto a este archivo y escribe un informe.
"""
from __future__ import annotations

import json
import math
from fractions import Fraction
from itertools import product
from pathlib import Path
from random import Random
from typing import Sequence

ROOT = Path(__file__).resolve().parent


def allocate_workers(workers: int, plant_counts: Sequence[int]) -> list[int]:
    """Orden de centros: antigüedad/ID ascendente para resolver empates.
    Uno por centro si alcanza; sobrantes proporcionales por mayor resto.
    Sin plantas en todo el mapa: equilibrio entre centros operativos.
    Sin centros: los trabajadores no salen del poblado.
    """
    if isinstance(workers, bool) or not isinstance(workers, int) or workers < 0:
        raise ValueError('workers debe ser entero no negativo')
    if any(isinstance(p, bool) or not isinstance(p, int) or p < 0 for p in plant_counts):
        raise ValueError('El número de plantas debe ser entero no negativo')
    n = len(plant_counts)
    if n == 0:
        return []
    if workers < n:
        out = [0] * n
        for i in sorted(range(n), key=lambda i: (-plant_counts[i], i))[:workers]:
            out[i] = 1
        return out
    out = [1] * n
    remaining = workers - n
    total = sum(plant_counts)
    if total == 0:
        q, r = divmod(remaining, n)
        return [1 + q + int(i < r) for i in range(n)]
    quotas = [Fraction(remaining * plants, total) for plants in plant_counts]
    floors = [q.numerator // q.denominator for q in quotas]
    out = [1 + a for a in floors]
    left = remaining - sum(floors)
    order = sorted(range(n), key=lambda i: (-(quotas[i] - floors[i]), i))
    for i in order[:left]:
        out[i] += 1
    return out


def village_cost(n: int) -> int:
    if isinstance(n, bool) or not isinstance(n, int) or n < 2:
        raise ValueError('El ordinal debe ser entero y al menos 2')
    return 50_000 + 25_000 * (n - 2)


def valid_compositions(budget: int, animals: list[dict], unlocked: list[str]) -> list[tuple[int, ...]]:
    if not isinstance(budget, int) or budget < 1:
        raise ValueError('El presupuesto debe ser entero positivo')
    ranges = [range(a['max_per_raid'] + 1) if a['id'] in unlocked else range(1) for a in animals]
    return [counts for counts in product(*ranges)
            if 1 <= sum(counts) <= 5
            and 3 * budget <= 4 * sum(c * a['threat_cost'] for c, a in zip(counts, animals)) <= 4 * budget]


def hits_to_collapse(max_hp: int, damage_per_hit: int, damage_fraction: Fraction) -> int:
    """Daño mínimo entero que cruza un umbral, evitando error de coma flotante."""
    required = max_hp * damage_fraction
    return math.ceil(required / damage_per_hit)


def dawn_minimum(has_center: bool, has_resources: bool) -> int:
    return (0 if has_center else 800) + 100 + (0 if has_resources else 5)


def main() -> None:
    balance = json.loads((ROOT / 'balance_confirmado.json').read_text(encoding='utf-8'))
    sfx = json.loads((ROOT / 'sfx_catalogo_extraido.json').read_text(encoding='utf-8'))
    vfx = json.loads((ROOT / 'vfx_catalogo_extraido.json').read_text(encoding='utf-8'))
    crops = json.loads((ROOT / 'cultivos_geometria_extraida.json').read_text(encoding='utf-8'))
    checks = 0

    def check(condition: bool, message: str) -> None:
        nonlocal checks
        if not condition:
            raise AssertionError(message)
        checks += 1

    examples = [
        (7, [60, 30, 10], [4, 2, 1]),
        (6, [100, 20, 0], [4, 1, 1]),
        (3, [0, 0, 0], [1, 1, 1]),
        (8, [0, 0, 0], [3, 3, 2]),
        (2, [0, 5, 50], [0, 1, 1]),
        (2, [5, 5, 5], [1, 1, 0]),
        (0, [100, 20, 0], [0, 0, 0]),
        (3, [], []),
    ]
    for w, p, expected in examples:
        check(allocate_workers(w, p) == expected, f'Reparto {w}, {p}')
    rng = Random(20261001)
    allocation_scenarios = 5000
    for _ in range(allocation_scenarios):
        n = rng.randint(1, 40)
        w = rng.randint(0, 500)
        p = [rng.randint(0, 800) if rng.random() > .25 else 0 for _ in range(n)]
        a = allocate_workers(w, p)
        check(sum(a) == w, 'Conservación del número de trabajadores')
        check(all(type(x) is int and x >= 0 for x in a), 'Reparto entero y no negativo')
        check(a == allocate_workers(w, p), 'Determinismo de reparto')
        if w >= n:
            check(min(a) >= 1, 'Trabajador base también en centros con cero plantas')
            if sum(p):
                check(all(a[i] == 1 for i in range(n) if p[i] == 0), 'Peso cero no recibe sobrantes')
                r = w - n
                for i in range(n):
                    q = Fraction(r * p[i], sum(p))
                    check(a[i] - 1 in {math.floor(q), math.ceil(q)}, 'Mayor resto respeta cuota')
            else:
                check(max(a) - min(a) <= 1, 'Equilibrio cuando todos los pesos son cero')
        else:
            check(max(a) <= 1, 'Escasez no duplica trabajador por centro')
            selected = sorted(range(n), key=lambda i: (-p[i], i))[:w]
            check(all(a[i] == int(i in selected) for i in range(n)), 'Prioridad correcta por plantas')

    expected_costs = {2: 50000, 3: 75000, 4: 100000, 10: 250000, 20: 500000, 50: 1250000, 100: 2500000}
    for n, price in expected_costs.items():
        check(village_cost(n) == price, 'Coste de poblado')
    for n in range(2, 1000):
        check(village_cost(n + 1) - village_cost(n) == 25000, 'Incremento lineal, no exponencial')
    check(Fraction(village_cost(3), village_cost(2)) == Fraction(3, 2), 'Tercero cuesta 50% más que segundo')

    animals = balance['animals']
    composition_report = []
    configurations = [(f"nivel_{i + 1}", t['threat_min'], t['threat_max'], t['unlocked_species'])
                      for i, t in enumerate(balance['threat_tiers'])]
    configurations.append(('diurno', 7, 10, [a['id'] for a in animals]))
    for label, lo, hi, unlocked in configurations:
        for budget in range(lo, hi + 1):
            valid = valid_compositions(budget, animals, unlocked)
            check(bool(valid), f'Presupuesto sin composición: {label} {budget}')
            check(len(valid) == len(set(valid)), 'Composiciones únicas, no permutaciones')
            for counts in valid:
                spend = sum(c * a['threat_cost'] for c, a in zip(counts, animals))
                check(sum(counts) <= 5 and 4 * spend >= 3 * budget and spend <= budget, 'Presupuesto y máximo de animales')
                check(all(0 <= c <= a['max_per_raid'] for c, a in zip(counts, animals)), 'Límite por especie')
                check(all(c == 0 or a['id'] in unlocked for c, a in zip(counts, animals)), 'Desbloqueo de especie')
            composition_report.append({'context': label, 'budget': budget, 'valid_composition_count': len(valid)})
    b3 = valid_compositions(3, animals, ['warthog', 'hyena'])
    check(set(b3) == {(3, 0, 0, 0, 0), (0, 1, 0, 0, 0)}, '3 facóqueros o 1 hiena')
    check((14, 0, 0, 0, 0) not in valid_compositions(14, animals, [a['id'] for a in animals]), 'No 14 facóqueros')
    check(sum(Fraction(str(v)) for v in balance['raids']['attack_animation_weights'].values()) == 1, 'Pesos de animaciones suman 100%')

    center_hits = [hits_to_collapse(600, a['structure_hit_damage'], Fraction(79, 100)) for a in animals]
    check(center_hits == [12, 10, 7, 6, 4], 'Golpes hasta colapso del centro')
    check(hits_to_collapse(100, 40, Fraction(4, 5)) == 2, 'Zarzas colapsan con 2 golpes de 40 desde intactas')
    wall_hits = []
    for wall in balance['walls']:
        check(Fraction(wall['gate_hp'], wall['hp']) == Fraction(3, 5), 'Puerta al 60%')
        wall_hits.append({'wall': wall['id'], 'hits_by_species': {
            a['id']: hits_to_collapse(wall['hp'], a['structure_hit_damage'], Fraction(4, 5)) for a in animals}})
    for has_center, has_resources, expected in [(True, True, 100), (True, False, 105), (False, True, 900), (False, False, 905)]:
        check(dawn_minimum(has_center, has_resources) == expected, 'Umbral económico al amanecer')

    check(balance['clock']['day_seconds'] + balance['clock']['night_seconds'] == 600, 'Ciclo nominal')
    check(Fraction(1440, 600) == Fraction(12, 5), 'Conversión del reloj 2,4 min internos por segundo')
    check((300 + 300 / 5) * 100 == 36000, 'Referencia 10 horas sin ataques ni pausas')
    for c in balance['crops']:
        check(c['growth_seconds'] > 0 and c['total_waters'] >= 2, 'Datos agrícolas válidos')
        interval = Fraction(c['growth_seconds'], c['total_waters'])
        tolerance = interval * Fraction(str(c['water_tolerance_fraction']))
        check(float(tolerance) == c['derived_tolerance_seconds'], 'Tolerancia calculada')
        checkpoints = [Fraction(k, c['total_waters']) for k in range(c['total_waters'])]
        check(len(set(checkpoints)) == c['total_waters'] and checkpoints[0] == 0 and checkpoints[-1] < 1, 'Riegos sin duplicar el inicial')

    check(len(sfx['items']) == len({i['id'] for i in sfx['items']}) == 126, '126 IDs SFX únicos')
    check(len({i['filename'] for i in sfx['items']}) == 126, '126 archivos SFX únicos')
    check(sum(i['loop'] for i in sfx['items']) == 8, '8 ambientes en bucle')
    check(len({i['category'] for i in sfx['items']}) == 16, '16 categorías SFX')
    check(len(vfx['resources']) == 19 and len(vfx['compositions']) == 18, 'Inventario VFX')
    check(crops['mesh_count'] == 40 and crops['unique_triangles'] == 107109 and crops['bridge_pairs'] == 32, 'Inventario geométrico de cultivos')

    report = {
        'result': 'PASS', 'assertions_passed': checks,
        'random_workforce_scenarios': allocation_scenarios, 'seed': 20261001,
        'scope': 'Algoritmos de referencia y consistencia numérica de este paquete; no ejecución del motor del videojuego.',
        'not_validated': ['Rendimiento y aspecto visual', 'Audio escuchado en una partida', 'IA y colisiones reales',
                          'Balance económico a largo plazo', 'Contratos C01–C08', 'Legalidad actual de licencias'],
        'initial_extraction': 'La extracción original verificó SHA-256 y tamaño de los 126 MP3 contra los bytes embebidos. Este script comprueba el manifiesto, no reextrae los HTML ausentes del ZIP.',
        'allocation_examples': [{'workers': w, 'plants': p, 'allocation': allocate_workers(w, p)} for w, p, _ in examples],
        'composition_counts': composition_report,
        'center_hits_to_collapse': dict(zip([a['id'] for a in animals], center_hits)),
        'wall_hits_to_collapse': wall_hits,
    }
    target = ROOT / 'resultado_verificaciones.json'
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"PASS · {checks:,} aserciones · {allocation_scenarios} escenarios de reparto · {len(composition_report)} combinaciones de contexto/presupuesto")
    print(f'Informe: {target}')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, AssertionError) as exc:
        raise SystemExit(f'ERROR de verificación: {exc}') from exc
