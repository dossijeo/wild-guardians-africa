# Escasez con reservas y presupuesto de perímetro

**Estimación condicionada, no balance aprobado ni campaña del motor.** Se corrige la política de gastos para no ocultar beneficios pagando muros indefinidamente o dejando sin fondos la plantilla. Se conserva la comparación anterior en seed-scarcity-mathematical-projection; no se sobrescribe su interpretación.

## Cambios de política

- Antes de cada compra se conserva el siguiente jornal estimado: ceil(plantas tras compra/6)×30. Una finca vacía puede comprar su primer brote sin exigir prefondos para otro día; no se cobran jornadas indefinidamente al quedarse sin recursos.
- Las murallas se presupuestan parcialmente hasta una cuota aproximada de perímetro: ceil(8×halfSpan/2,18), halfSpan=6×ceil((sqrt(pico de plantas×2,25)/2+3)/6). Como antes, hasta32 piezas/día y20% de caja excedente; ahora se respeta la reserva laboral.
- La cuota NO acredita una muralla cerrada, reutilización real de piezas, puertas, cobertura, estado ni reparaciones. Es un límite de compra contable para aislar escasez frente a gasto inagotable. Exposición10% después de la primera pieza sigue siendo una hipótesis externa.

## Parámetros comunes y recargo

- Centro800, inicial1500, ancianos30/jóvenes40; se contratan ancianos. Semillas base originales. Cosechas constantes60% de referencia histórica:20/65/24/31/42/321/58/481 para mijo/girasol/sorgo/maíz/batata/algodón/yuca/plátano. Zarzas3. No son los valores actuales de producción.
- `precio = ceil(base × (1 + max(0, plantas_vivas − 100) / 200))`: primeras100 sin subida; cada200 adicionales añade100% del precio base. Es el mismo recargo de la primera prueba, aplicado a la nueva política pareada. Recalculado por brote; cosecha/destrucción reduce precio.
- Sin cambios en calendario fijo de especies (mijo días1–9, mezcla desde10), madurez por cohortes, capacidad histórica, protección supuesta, presión ni daño. No se cobra un brote el día de plantarlo.
- Se supone riego completo y madurez tras ceil(crecimiento/300) jornadas, como pronto al día siguiente. No se modelan servicio de riego, FIFO ni recorridos. Capacidad por trabajador:3,238 entregas días1–9;1,878 desde10 (calibración mixta tardía). Son tasas agregadas históricas, no límites físicos demostrados para todo tamaño de finca.
- Hordas: media de composiciones legales; primeras5 noches una especie nueva. Fuerza×1 hasta60000 puntos,×2 después; alcance=floor(1+7V/(V+10000)). Presión según puntos originales por especie, propuesta no implementada. Daño a edificios×1.

## Comparación pareada

| Métrica | Sin escasez | Con escasez |
|:---|---:|---:|
| Caja día100 | 1418923 | 2024 |
| Plantas día100 | 828 | 381 |
| Pico de plantas al final de noche | 848 | 541 |
| Murallas acumuladas | 111 | 89 |
| Cobros acumulados | 2661229 | 1524310 |
| Semillas acumuladas | 899948 | 1324174 |
| Jornales acumulados | 342720 | 198540 |
| Cobros menos semillas y jornales | 1418561 | 1596 |

La misma política permite observar la acumulación sin recargo. La variante con recargo la reduce mucho y conserva100 filas calculables, bajo los supuestos indicados. No demuestra actividad<25%, protección física ni victoria. La cuota de muros y madurez idealizada pueden alterar el resultado.

## 100 días con escasez

| Día | Dinero | Plantas | Murallas | Animales media [rango] | Fuerza | Factor semillas al cierre |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 250 | 48 | 0 | 1.00 [1–1] | ×1 | ×1.00 |
| 2 | 277 | 54 | 26 | 1.00 [1–1] | ×1 | ×1.00 |
| 3 | 340 | 66 | 45 | 1.00 [1–1] | ×1 | ×1.00 |
| 4 | 445 | 83 | 45 | 1.00 [1–1] | ×1 | ×1.00 |
| 5 | 568 | 108 | 45 | 1.00 [1–1] | ×1 | ×1.04 |
| 6 | 720 | 138 | 45 | 3.21 [1–5] | ×1 | ×1.19 |
| 7 | 875 | 169 | 45 | 3.21 [1–5] | ×1 | ×1.34 |
| 8 | 1025 | 198 | 67 | 3.21 [1–5] | ×1 | ×1.49 |
| 9 | 1177 | 231 | 67 | 3.21 [1–5] | ×1 | ×1.66 |
| 10 | 990 | 169 | 67 | 3.21 [1–5] | ×1 | ×1.34 |
| 11 | 758 | 121 | 67 | 4.98 [3–7] | ×1 | ×1.10 |
| 12 | 599 | 87 | 67 | 4.98 [3–7] | ×1 | ×1.00 |
| 13 | 400 | 64 | 67 | 4.98 [3–7] | ×1 | ×1.00 |
| 14 | 293 | 46 | 67 | 4.98 [3–7] | ×1 | ×1.00 |
| 15 | 382 | 60 | 67 | 4.98 [3–7] | ×1 | ×1.00 |
| 16 | 454 | 86 | 67 | 4.98 [3–7] | ×1 | ×1.00 |
| 17 | 778 | 134 | 67 | 4.98 [3–7] | ×1 | ×1.17 |
| 18 | 1076 | 199 | 67 | 4.98 [3–7] | ×1 | ×1.50 |
| 19 | 1272 | 234 | 67 | 4.98 [3–7] | ×1 | ×1.67 |
| 20 | 1602 | 306 | 67 | 4.98 [3–7] | ×2 | ×2.03 |
| 21 | 1987 | 353 | 67 | 6.41 [4–9] | ×2 | ×2.26 |
| 22 | 2155 | 410 | 67 | 6.41 [4–9] | ×2 | ×2.55 |
| 23 | 2080 | 365 | 89 | 6.41 [4–9] | ×2 | ×2.33 |
| 24 | 2600 | 490 | 89 | 6.41 [4–9] | ×2 | ×2.95 |
| 25 | 2464 | 466 | 89 | 6.41 [4–9] | ×2 | ×2.83 |
| 26 | 2764 | 507 | 89 | 6.41 [4–9] | ×2 | ×3.04 |
| 27 | 2468 | 462 | 89 | 6.41 [4–9] | ×2 | ×2.81 |
| 28 | 2489 | 473 | 89 | 6.41 [4–9] | ×2 | ×2.87 |
| 29 | 2675 | 461 | 89 | 6.41 [4–9] | ×2 | ×2.80 |
| 30 | 2678 | 476 | 89 | 6.41 [4–9] | ×2 | ×2.88 |
| 31 | 2320 | 435 | 89 | 6.41 [4–9] | ×2 | ×2.67 |
| 32 | 2445 | 458 | 89 | 6.41 [4–9] | ×2 | ×2.79 |
| 33 | 2424 | 443 | 89 | 6.41 [4–9] | ×2 | ×2.71 |
| 34 | 2716 | 498 | 89 | 6.41 [4–9] | ×2 | ×2.99 |
| 35 | 2450 | 458 | 89 | 6.41 [4–9] | ×2 | ×2.79 |
| 36 | 2500 | 483 | 89 | 6.41 [4–9] | ×2 | ×2.92 |
| 37 | 2435 | 469 | 89 | 6.41 [4–9] | ×2 | ×2.84 |
| 38 | 2721 | 521 | 89 | 6.41 [4–9] | ×2 | ×3.10 |
| 39 | 2360 | 452 | 89 | 6.41 [4–9] | ×2 | ×2.76 |
| 40 | 2383 | 457 | 89 | 6.41 [4–9] | ×2 | ×2.79 |
| 41 | 2400 | 446 | 89 | 8.99 [6–12] | ×2 | ×2.73 |
| 42 | 2745 | 487 | 89 | 8.99 [6–12] | ×2 | ×2.94 |
| 43 | 2595 | 489 | 89 | 8.99 [6–12] | ×2 | ×2.95 |
| 44 | 3139 | 541 | 89 | 8.99 [6–12] | ×2 | ×3.21 |
| 45 | 2665 | 508 | 89 | 8.99 [6–12] | ×2 | ×3.04 |
| 46 | 2957 | 498 | 89 | 8.99 [6–12] | ×2 | ×2.99 |
| 47 | 2736 | 480 | 89 | 8.99 [6–12] | ×2 | ×2.90 |
| 48 | 2616 | 464 | 89 | 8.99 [6–12] | ×2 | ×2.82 |
| 49 | 2364 | 447 | 89 | 8.99 [6–12] | ×2 | ×2.74 |
| 50 | 2180 | 407 | 89 | 8.99 [6–12] | ×2 | ×2.54 |
| 51 | 2319 | 397 | 89 | 8.99 [6–12] | ×2 | ×2.49 |
| 52 | 2117 | 387 | 89 | 8.99 [6–12] | ×2 | ×2.44 |
| 53 | 2152 | 389 | 89 | 8.99 [6–12] | ×2 | ×2.45 |
| 54 | 2324 | 429 | 89 | 8.99 [6–12] | ×2 | ×2.65 |
| 55 | 2499 | 444 | 89 | 8.99 [6–12] | ×2 | ×2.72 |
| 56 | 2867 | 469 | 89 | 8.99 [6–12] | ×2 | ×2.84 |
| 57 | 2573 | 468 | 89 | 8.99 [6–12] | ×2 | ×2.84 |
| 58 | 2593 | 484 | 89 | 8.99 [6–12] | ×2 | ×2.92 |
| 59 | 2984 | 490 | 89 | 8.99 [6–12] | ×2 | ×2.95 |
| 60 | 2701 | 514 | 89 | 8.99 [6–12] | ×2 | ×3.07 |
| 61 | 2780 | 495 | 89 | 8.99 [6–12] | ×2 | ×2.98 |
| 62 | 2785 | 529 | 89 | 8.99 [6–12] | ×2 | ×3.15 |
| 63 | 2468 | 458 | 89 | 8.99 [6–12] | ×2 | ×2.79 |
| 64 | 2798 | 501 | 89 | 8.99 [6–12] | ×2 | ×3.00 |
| 65 | 2479 | 438 | 89 | 8.99 [6–12] | ×2 | ×2.69 |
| 66 | 2755 | 480 | 89 | 8.99 [6–12] | ×2 | ×2.90 |
| 67 | 2623 | 462 | 89 | 8.99 [6–12] | ×2 | ×2.81 |
| 68 | 2732 | 524 | 89 | 8.99 [6–12] | ×2 | ×3.12 |
| 69 | 2737 | 526 | 89 | 8.99 [6–12] | ×2 | ×3.13 |
| 70 | 2992 | 541 | 89 | 8.99 [6–12] | ×2 | ×3.21 |
| 71 | 2536 | 474 | 89 | 8.99 [6–12] | ×2 | ×2.87 |
| 72 | 2766 | 502 | 89 | 8.99 [6–12] | ×2 | ×3.01 |
| 73 | 2981 | 486 | 89 | 8.99 [6–12] | ×2 | ×2.93 |
| 74 | 2874 | 474 | 89 | 8.99 [6–12] | ×2 | ×2.87 |
| 75 | 2671 | 508 | 89 | 8.99 [6–12] | ×2 | ×3.04 |
| 76 | 2876 | 518 | 89 | 8.99 [6–12] | ×2 | ×3.09 |
| 77 | 2887 | 532 | 89 | 8.99 [6–12] | ×2 | ×3.16 |
| 78 | 2667 | 458 | 89 | 8.99 [6–12] | ×2 | ×2.79 |
| 79 | 2631 | 502 | 89 | 8.99 [6–12] | ×2 | ×3.01 |
| 80 | 2470 | 464 | 89 | 8.99 [6–12] | ×2 | ×2.82 |
| 81 | 3010 | 503 | 89 | 8.99 [6–12] | ×2 | ×3.02 |
| 82 | 2772 | 476 | 89 | 8.99 [6–12] | ×2 | ×2.88 |
| 83 | 2472 | 435 | 89 | 8.99 [6–12] | ×2 | ×2.67 |
| 84 | 2602 | 496 | 89 | 8.99 [6–12] | ×2 | ×2.98 |
| 85 | 2613 | 502 | 89 | 8.99 [6–12] | ×2 | ×3.01 |
| 86 | 2962 | 533 | 89 | 8.99 [6–12] | ×2 | ×3.17 |
| 87 | 2464 | 470 | 89 | 8.99 [6–12] | ×2 | ×2.85 |
| 88 | 2786 | 531 | 89 | 8.99 [6–12] | ×2 | ×3.15 |
| 89 | 2589 | 460 | 89 | 8.99 [6–12] | ×2 | ×2.80 |
| 90 | 2247 | 415 | 89 | 8.99 [6–12] | ×2 | ×2.58 |
| 91 | 2813 | 458 | 89 | 8.99 [6–12] | ×2 | ×2.79 |
| 92 | 2375 | 443 | 89 | 8.99 [6–12] | ×2 | ×2.71 |
| 93 | 2470 | 462 | 89 | 8.99 [6–12] | ×2 | ×2.81 |
| 94 | 2417 | 442 | 89 | 8.99 [6–12] | ×2 | ×2.71 |
| 95 | 2288 | 434 | 89 | 8.99 [6–12] | ×2 | ×2.67 |
| 96 | 2256 | 419 | 89 | 8.99 [6–12] | ×2 | ×2.59 |
| 97 | 2071 | 392 | 89 | 8.99 [6–12] | ×2 | ×2.46 |
| 98 | 1924 | 353 | 89 | 8.99 [6–12] | ×2 | ×2.26 |
| 99 | 2109 | 362 | 89 | 8.99 [6–12] | ×2 | ×2.31 |
| 100 | 2024 | 381 | 89 | 8.99 [6–12] | ×2 | ×2.41 |

## Sensibilidad de reserva y protección

| Exposición | Jornales futuros reservados | Caja al100 | Plantas al100 | Primer día insuficiente |
|---:|---:|---:|---:|---:|
| 0.1 | 0.5 | 1112 | 347 | — |
| 0.1 | 1 | 2024 | 381 | — |
| 0.1 | 2 | 3967 | 375 | — |
| 0.2 | 0.5 | 934 | 278 | — |
| 0.2 | 1 | 1437 | 257 | — |
| 0.2 | 2 | 3792 | 330 | — |
| 0.3 | 0.5 | 26 | 0 | 25 |
| 0.3 | 1 | 1925 | 283 | — |
| 0.3 | 2 | 18 | 0 | 50 |
| 0.5 | 0.5 | 32 | 0 | 20 |
| 0.5 | 1 | 25 | 0 | 26 |
| 0.5 | 2 | 8 | 0 | 18 |
| 0.9 | 0.5 | 24 | 0 | 18 |
| 0.9 | 1 | 17 | 0 | 18 |
| 0.9 | 2 | 24 | 0 | 16 |

## Productividad de entregas

| Capacidad relativa | Caja al100 | Plantas al100 | Primer día insuficiente |
|---:|---:|---:|---:|
| 0.8 | 1999 | 335 | — |
| 1 | 2024 | 381 | — |
| 1.2 | 3056 | 573 | — |

Si se usa la tasa temprana para todas las especies, la misma política/recargo deja32284 monedas y480 plantas. Ese caso optimista se conserva como diagnóstico, no se usa para aprobar productividad mixta.

## Umbrales de escasez por especie

Primer número de plantas vivas al que comprar una semilla cuesta más que la cosecha base, antes de jornales, daños y defensa. No es un límite artificial de tamaño, sino un riesgo del recargo lineal sin tope.

| Especie | Semilla base | Cosecha | Primera cantidad sin margen bruto |
|:---|---:|---:|---:|
| mijo | 5 | 20 | 701 |
| girasol | 18 | 65 | 623 |
| sorgo | 6 | 24 | 701 |
| maiz | 8 | 31 | 676 |
| batata | 10 | 42 | 741 |
| algodon | 100 | 321 | 543 |
| yuca | 12 | 58 | 867 |
| platano | 150 | 481 | 542 |

Sin defensa: primer día de insuficiencia contable18, caja17; no prueba de GameOver nativo.

Los días después de insuficiencia conservan el último estado en el JSON para diagnóstico, no representan incursiones resueltas. No se inicia una nueva campaña nativa por estos resultados. Primero debe acreditarse coste/eficacia de defensa, daño individual, riego y servicio de colas. La revisión de la matemática es independiente de los criterios físicos del juego.
