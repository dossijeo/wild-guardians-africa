# Escasez de semillas: proyección matemática de100 días

**No se ejecuta el motor ni se modifican precios de producción.** Comparación contra la misma recurrencia por cohortes, mismos ingresos, defensa, calendario de especies y política de gastos. No compara directamente las cifras millonarias del borrador agregado v2, cuya interpretación se retiró por ingresos anticipados y falsas insolvencias.

## Parámetros

- Fórmula por compra: `precio = ceil(precio_base × (1 + max(0, plantas_vivas − 100) / 200))`.
- Primeras100 plantas sin recargo. Cada200 plantas adicionales añaden+100% del precio base, linealmente y sin límite artificial. Se recalcula antes de cada brote, después de entregas y antes de incursión.
- Se cuentan plantas vivas, maduras o inmaduras, de toda la finca. Cosechar o perder plantas reduce el precio; no depende del número histórico de siembras. La escasez sólo altera compras futuras, sin cambiar el valor de los cultivos existentes.
- Centro800, inicio1500, ancianos30/jóvenes40. La política contrata ancianos. Semillas base mijo5, girasol18, sorgo6, maíz8, batata10, algodón100, yuca12, plátano150.
- Ganancias constantes en ambas cuentas: mijo20, girasol65, sorgo24, maíz31, batata42, algodón321, yuca58, plátano481:60% redondeado hacia arriba de la referencia histórica. Zarzas3; compra hasta32 piezas/día con20% del excedente sobre35. No son los precios actuales de main.
- Hasta día9 mijo; desde día10 secuencia fija de las ocho especies. Máximo116 compras el primer día y280 después. Reserva opcional30, recuperación sin reserva adicional100.
- Cohorte madura no antes de día siguiente y tras ceil(crecimiento/300) jornadas; riego supuesto completo. Sólo se entregan cohortes maduras y se cobran antes de comprar más. Capacidad por trabajador tomada de la calibración temprana histórica.
- Defensa: exposición90% antes de la primera pieza y10% después, hipótesis externa sin acreditar cierre ni intercepción. Sin defensa90%. Mismo descuento hipotético15% de daño por escudo,90% de uso de golpes. No modela reparaciones, colapso, rutas ni FIFO.
- Hordas legales: primeras5 noches una nueva especie; después expectativa del tier. Presión según pesos originales de especie. Fuerza×1 hasta60000 puntos,×2 después; alcance=floor(1+7V/(V+10000)). Daño a edificios×1.

## Ejemplos de precio

| Plantas vivas | Factor | Mijo | Maíz | Algodón | Plátano |
|---:|---:|---:|---:|---:|---:|
| 0 | ×1 | 5 | 8 | 100 | 150 |
| 100 | ×1 | 5 | 8 | 100 | 150 |
| 200 | ×1.5 | 8 | 12 | 150 | 225 |
| 300 | ×2 | 10 | 16 | 200 | 300 |
| 500 | ×3 | 15 | 24 | 300 | 450 |
| 1000 | ×5.5 | 28 | 44 | 550 | 825 |

## Comparación final (misma política)

| Métrica | Sin escasez | Con escasez |
|:---|---:|---:|
| Caja día100 | 90 | 117 |
| Plantas día100 | 245 | 220 |
| Máximo de plantas nocturno | 295 | 287 |
| Piezas de muralla acumuladas | 1961 | 1928 |
| Cobros acumulados | 75479 | 102611 |
| Gasto semillas acumulado | 63571 | 89365 |
| Jornales acumulados | 6630 | 8040 |
| Cobros menos semillas y jornales | 5278 | 5206 |
| Gasto murallas acumulado | 5883 | 5784 |

**Lectura:** la escasez limita algo el tamaño de la finca, pero aquí no reduce el excedente económico de forma monotónica. Los cobros aumentan al cambiar el flujo de especies y entregas; el margen cobros−semillas también aumenta. Tras jornales, el excedente antes de murallas baja sólo5278→5206 (−1,36%). No se considera resuelto el exceso de ganancias ni se acepta este balance por llegar al día100. La caja pequeña refleja reinversión agresiva, no equivale a beneficio pequeño.

## Tabla completa con escasez

Dinero y plantas al final de la noche. Animales=media [rango], no una secuencia aleatoria ni animales fraccionarios. El factor de semillas mostrado se calcula con el stock final; el JSON registra gasto efectivo de compras intradía.

| Día | Dinero | Plantas | Murallas | Animales media [rango] | Fuerza | Factor semillas al cierre |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 30 | 92 | 0 | 1.00 [1–1] | ×1 | ×1.000 |
| 2 | 32 | 94 | 1 | 1.00 [1–1] | ×1 | ×1.000 |
| 3 | 34 | 96 | 2 | 1.00 [1–1] | ×1 | ×1.000 |
| 4 | 31 | 98 | 3 | 1.00 [1–1] | ×1 | ×1.000 |
| 5 | 33 | 100 | 4 | 1.00 [1–1] | ×1 | ×1.000 |
| 6 | 31 | 103 | 7 | 3.21 [1–5] | ×1 | ×1.015 |
| 7 | 35 | 103 | 8 | 3.21 [1–5] | ×1 | ×1.015 |
| 8 | 30 | 104 | 10 | 3.21 [1–5] | ×1 | ×1.020 |
| 9 | 33 | 104 | 11 | 3.21 [1–5] | ×1 | ×1.020 |
| 10 | 34 | 103 | 14 | 3.21 [1–5] | ×1 | ×1.015 |
| 11 | 51 | 100 | 15 | 4.98 [3–7] | ×1 | ×1.000 |
| 12 | 72 | 95 | 18 | 4.98 [3–7] | ×1 | ×1.000 |
| 13 | 31 | 88 | 25 | 4.98 [3–7] | ×1 | ×1.000 |
| 14 | 46 | 84 | 26 | 4.98 [3–7] | ×1 | ×1.000 |
| 15 | 70 | 80 | 28 | 4.98 [3–7] | ×1 | ×1.000 |
| 16 | 129 | 71 | 35 | 4.98 [3–7] | ×1 | ×1.000 |
| 17 | 34 | 60 | 49 | 4.98 [3–7] | ×1 | ×1.000 |
| 18 | 51 | 58 | 52 | 4.98 [3–7] | ×1 | ×1.000 |
| 19 | 72 | 53 | 55 | 4.98 [3–7] | ×1 | ×1.000 |
| 20 | 114 | 46 | 61 | 4.98 [3–7] | ×1 | ×1.000 |
| 21 | 76 | 36 | 73 | 6.41 [4–9] | ×1 | ×1.000 |
| 22 | 132 | 27 | 81 | 6.41 [4–9] | ×1 | ×1.000 |
| 23 | 30 | 18 | 96 | 6.41 [4–9] | ×1 | ×1.000 |
| 24 | 34 | 18 | 119 | 6.41 [4–9] | ×1 | ×1.000 |
| 25 | 91 | 15 | 124 | 6.41 [4–9] | ×1 | ×1.000 |
| 26 | 138 | 35 | 156 | 6.41 [4–9] | ×1 | ×1.000 |
| 27 | 97 | 26 | 186 | 6.41 [4–9] | ×1 | ×1.000 |
| 28 | 111 | 60 | 218 | 6.41 [4–9] | ×1 | ×1.000 |
| 29 | 138 | 61 | 250 | 6.41 [4–9] | ×1 | ×1.000 |
| 30 | 45 | 85 | 282 | 6.41 [4–9] | ×1 | ×1.000 |
| 31 | 36 | 81 | 285 | 6.41 [4–9] | ×1 | ×1.000 |
| 32 | 39 | 73 | 293 | 6.41 [4–9] | ×1 | ×1.000 |
| 33 | 49 | 88 | 325 | 6.41 [4–9] | ×1 | ×1.000 |
| 34 | 99 | 90 | 357 | 6.41 [4–9] | ×1 | ×1.000 |
| 35 | 49 | 97 | 389 | 6.41 [4–9] | ×1 | ×1.000 |
| 36 | 33 | 98 | 421 | 6.41 [4–9] | ×1 | ×1.000 |
| 37 | 156 | 91 | 431 | 6.41 [4–9] | ×1 | ×1.000 |
| 38 | 117 | 116 | 463 | 6.41 [4–9] | ×1 | ×1.080 |
| 39 | 44 | 134 | 495 | 6.41 [4–9] | ×1 | ×1.170 |
| 40 | 109 | 125 | 501 | 6.41 [4–9] | ×1 | ×1.125 |
| 41 | 105 | 147 | 533 | 8.99 [6–12] | ×1 | ×1.235 |
| 42 | 86 | 134 | 557 | 8.99 [6–12] | ×1 | ×1.170 |
| 43 | 118 | 130 | 589 | 8.99 [6–12] | ×1 | ×1.150 |
| 44 | 117 | 117 | 613 | 8.99 [6–12] | ×1 | ×1.085 |
| 45 | 43 | 103 | 636 | 8.99 [6–12] | ×1 | ×1.015 |
| 46 | 112 | 97 | 646 | 8.99 [6–12] | ×1 | ×1.000 |
| 47 | 110 | 126 | 678 | 8.99 [6–12] | ×1 | ×1.130 |
| 48 | 30 | 121 | 710 | 8.99 [6–12] | ×1 | ×1.105 |
| 49 | 63 | 115 | 725 | 8.99 [6–12] | ×1 | ×1.075 |
| 50 | 178 | 102 | 736 | 8.99 [6–12] | ×1 | ×1.010 |
| 51 | 120 | 124 | 768 | 8.99 [6–12] | ×1 | ×1.120 |
| 52 | 39 | 133 | 800 | 8.99 [6–12] | ×1 | ×1.165 |
| 53 | 135 | 131 | 832 | 8.99 [6–12] | ×1 | ×1.155 |
| 54 | 122 | 117 | 864 | 8.99 [6–12] | ×1 | ×1.085 |
| 55 | 144 | 136 | 896 | 8.99 [6–12] | ×1 | ×1.180 |
| 56 | 138 | 178 | 928 | 8.99 [6–12] | ×1 | ×1.390 |
| 57 | 199 | 158 | 954 | 8.99 [6–12] | ×1 | ×1.290 |
| 58 | 42 | 199 | 986 | 8.99 [6–12] | ×1 | ×1.495 |
| 59 | 78 | 188 | 990 | 8.99 [6–12] | ×1 | ×1.440 |
| 60 | 36 | 179 | 1022 | 8.99 [6–12] | ×1 | ×1.395 |
| 61 | 39 | 183 | 1054 | 8.99 [6–12] | ×1 | ×1.415 |
| 62 | 36 | 174 | 1056 | 8.99 [6–12] | ×1 | ×1.370 |
| 63 | 72 | 162 | 1058 | 8.99 [6–12] | ×1 | ×1.310 |
| 64 | 209 | 173 | 1090 | 8.99 [6–12] | ×1 | ×1.365 |
| 65 | 71 | 217 | 1122 | 8.99 [6–12] | ×1 | ×1.585 |
| 66 | 152 | 201 | 1131 | 8.99 [6–12] | ×1 | ×1.505 |
| 67 | 38 | 240 | 1163 | 8.99 [6–12] | ×1 | ×1.700 |
| 68 | 41 | 229 | 1165 | 8.99 [6–12] | ×1 | ×1.645 |
| 69 | 74 | 218 | 1168 | 8.99 [6–12] | ×1 | ×1.590 |
| 70 | 192 | 202 | 1181 | 8.99 [6–12] | ×1 | ×1.510 |
| 71 | 150 | 231 | 1213 | 8.99 [6–12] | ×1 | ×1.655 |
| 72 | 273 | 246 | 1245 | 8.99 [6–12] | ×1 | ×1.730 |
| 73 | 176 | 279 | 1277 | 8.99 [6–12] | ×1 | ×1.895 |
| 74 | 44 | 257 | 1309 | 8.99 [6–12] | ×1 | ×1.785 |
| 75 | 43 | 250 | 1316 | 8.99 [6–12] | ×1 | ×1.750 |
| 76 | 138 | 248 | 1348 | 8.99 [6–12] | ×1 | ×1.740 |
| 77 | 150 | 280 | 1380 | 8.99 [6–12] | ×1 | ×1.900 |
| 78 | 211 | 258 | 1411 | 8.99 [6–12] | ×1 | ×1.790 |
| 79 | 250 | 287 | 1443 | 8.99 [6–12] | ×2 | ×1.935 |
| 80 | 133 | 279 | 1475 | 8.99 [6–12] | ×2 | ×1.895 |
| 81 | 133 | 259 | 1500 | 8.99 [6–12] | ×1 | ×1.795 |
| 82 | 37 | 286 | 1532 | 8.99 [6–12] | ×2 | ×1.930 |
| 83 | 45 | 276 | 1534 | 8.99 [6–12] | ×1 | ×1.880 |
| 84 | 77 | 265 | 1538 | 8.99 [6–12] | ×1 | ×1.825 |
| 85 | 173 | 262 | 1570 | 8.99 [6–12] | ×2 | ×1.810 |
| 86 | 51 | 283 | 1602 | 8.99 [6–12] | ×2 | ×1.915 |
| 87 | 95 | 271 | 1606 | 8.99 [6–12] | ×1 | ×1.855 |
| 88 | 71 | 267 | 1638 | 8.99 [6–12] | ×2 | ×1.835 |
| 89 | 149 | 253 | 1647 | 8.99 [6–12] | ×1 | ×1.765 |
| 90 | 39 | 233 | 1669 | 8.99 [6–12] | ×1 | ×1.665 |
| 91 | 46 | 225 | 1675 | 8.99 [6–12] | ×1 | ×1.625 |
| 92 | 174 | 221 | 1707 | 8.99 [6–12] | ×1 | ×1.605 |
| 93 | 149 | 230 | 1739 | 8.99 [6–12] | ×1 | ×1.650 |
| 94 | 69 | 239 | 1771 | 8.99 [6–12] | ×1 | ×1.695 |
| 95 | 45 | 228 | 1803 | 8.99 [6–12] | ×1 | ×1.640 |
| 96 | 92 | 220 | 1813 | 8.99 [6–12] | ×1 | ×1.600 |
| 97 | 101 | 204 | 1833 | 8.99 [6–12] | ×1 | ×1.520 |
| 98 | 129 | 192 | 1864 | 8.99 [6–12] | ×1 | ×1.460 |
| 99 | 214 | 180 | 1896 | 8.99 [6–12] | ×1 | ×1.400 |
| 100 | 117 | 220 | 1928 | 8.99 [6–12] | ×1 | ×1.600 |

## Sensibilidad matemática

| Plantas adicionales para+100% | Caja día100 | Plantas día100 | Máximo plantas | Cobros | Semillas |
|---:|---:|---:|---:|---:|---:|
| 1000 | 115 | 215 | 296 | 79513 | 66947 |
| 500 | 44 | 218 | 256 | 76597 | 64402 |
| 200 | 117 | 220 | 287 | 102611 | 89365 |
| 100 | 88 | 198 | 216 | 100852 | 87113 |

Sin defensa, con esta política y recargo, la cuenta se queda sin capacidad simplificada de recuperación el día19, con8 monedas; no acredita GameOver nativo ni diferencia causal sólo por escasez.

No se estima inactividad, daño individual, deterioro de defensas ni probabilidad de victoria. Las diferencias de productividad son consecuencias de esta recurrencia/política, no mediciones nuevas del juego. Antes de simular, conviene evaluar una política de reservas/contratación que no gaste automáticamente todo y medir excedente después de reponer cultivos, salarios y defensa útil. Los supuestos de protección siguen pendientes.
