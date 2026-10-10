# Estimación contable revisada: 100 días

No es una simulación ni una candidata aprobada. Centro800, inicio1500, jornales30/40. La cuenta utiliza ancianos30. Ganancias de la referencia histórica×0,475 redondeadas hacia arriba; zarzas3. No cambia producción.

Dinero y plantas al cerrar cada noche. Animales: esperanza y rango de composiciones legales; no son cantidades fraccionarias en una partida. Fuerza por cultivo; daño a edificios×1. Presión según puntos originales por especie, propuesta aún no implementada.

Con esta política conservadora, la cuenta deja de poder reinvertir el día44 con defensa supuesta (9 monedas) y el día18 sin defensa (5 monedas). No demuestra derrota nativa ni inviabilidad de otra política. Las filas posteriores quedan desconocidas; el JSON conserva el estado al detenerse, sin seguir gastando ni inventar incursiones.

## Supuestos explícitos

- Mijo hasta día9; desde día10 las ocho especies en secuencia fija idéntica en ambas estrategias. Costes enteros reales. Se contrata con caja disponible. Las cosechas cobradas preceden a las nuevas compras, sin anticipar ingresos de esos brotes.
- Una cohorte madura como pronto el día siguiente, o tras ceil(crecimiento/300) jornadas. Se supone riego completo y sólo crecimiento diurno; no se modelan FIFO, checkpoints ni recorridos. Es una convención conservadora de edad, no una medición de productividad.
- Entregas limitadas por productividad histórica temprana por trabajador. Se cobra el precio de la especie entregada, sin mezcla ficticia ni bonos de magia/eventos.
- Reserva opcional30; una finca vacía puede reinvertir sin reservar100 adicionales. Si no puede pagar jornal+semilla, se conserva el estado y se marca insuficiencia; no se siguen cobrando jornales sin trabajo.
- Defensa destina20% del excedente sobre35 a hasta32 piezas/día; construcción parcial. Antes de la primera pieza, exposición90%; después10% es una hipótesis externa, NO se deduce del número de muros. No se modela cierre, puertas, deterioro ni reparación: no acredita estrategia responsable. El gasto continuado tampoco constituye una política óptima de construcción.
- Sin defensa: exposición90%. Pérdidas agregadas estimadas a partir de golpes; distribución sobre cohortes antiguas primero. No acredita dos golpes físicos sobre la misma planta ni incidencia real del escudo.
- No estima inactividad, agua, pérdida del centro ni probabilidad de victoria. El resultado depende de los supuestos, especialmente protección, madurez y productividad.

## Defensa condicional (protección no demostrada)

| Día | Dinero | Plantas | Murallas acumuladas | Animales media [rango] | Fuerza |
|---:|---:|---:|---:|---:|---:|
| 1 | 30 | 92 | 0 | 1.00 [1–1] | ×1 |
| 2 | 33 | 91 | 0 | 1.00 [1–1] | ×1 |
| 3 | 33 | 91 | 1 | 1.00 [1–1] | ×1 |
| 4 | 33 | 90 | 2 | 1.00 [1–1] | ×1 |
| 5 | 33 | 90 | 3 | 1.00 [1–1] | ×1 |
| 6 | 31 | 91 | 5 | 3.21 [1–5] | ×1 |
| 7 | 34 | 90 | 5 | 3.21 [1–5] | ×1 |
| 8 | 34 | 89 | 6 | 3.21 [1–5] | ×1 |
| 9 | 34 | 88 | 7 | 3.21 [1–5] | ×1 |
| 10 | 33 | 86 | 9 | 3.21 [1–5] | ×1 |
| 11 | 30 | 84 | 10 | 4.98 [3–7] | ×1 |
| 12 | 48 | 79 | 10 | 4.98 [3–7] | ×1 |
| 13 | 60 | 75 | 12 | 4.98 [3–7] | ×1 |
| 14 | 97 | 66 | 17 | 4.98 [3–7] | ×1 |
| 15 | 31 | 57 | 25 | 4.98 [3–7] | ×1 |
| 16 | 49 | 52 | 25 | 4.98 [3–7] | ×1 |
| 17 | 61 | 48 | 27 | 4.98 [3–7] | ×1 |
| 18 | 85 | 40 | 31 | 4.98 [3–7] | ×1 |
| 19 | 119 | 32 | 37 | 4.65 [3–7] | ×1 |
| 20 | 159 | 21 | 47 | 4.65 [3–7] | ×1 |
| 21 | 32 | 9 | 61 | 5.92 [4–9] | ×1 |
| 22 | 62 | 8 | 65 | 5.92 [4–9] | ×1 |
| 23 | 56 | 16 | 97 | 6.41 [4–9] | ×1 |
| 24 | 38 | 11 | 105 | 6.41 [4–9] | ×1 |
| 25 | 73 | 15 | 134 | 6.41 [4–9] | ×1 |
| 26 | 33 | 14 | 158 | 6.41 [4–9] | ×1 |
| 27 | 63 | 16 | 187 | 6.41 [4–9] | ×1 |
| 28 | 124 | 15 | 219 | 6.41 [4–9] | ×1 |
| 29 | 32 | 20 | 251 | 6.41 [4–9] | ×1 |
| 30 | 110 | 20 | 269 | 6.41 [4–9] | ×1 |
| 31 | 59 | 14 | 287 | 6.41 [4–9] | ×1 |
| 32 | 34 | 11 | 296 | 6.41 [4–9] | ×1 |
| 33 | 80 | 12 | 316 | 6.41 [4–9] | ×1 |
| 34 | 72 | 11 | 344 | 6.41 [4–9] | ×1 |
| 35 | 37 | 5 | 353 | 6.41 [4–9] | ×1 |
| 36 | 56 | 8 | 380 | 6.41 [4–9] | ×1 |
| 37 | 98 | 4 | 385 | 5.92 [4–9] | ×1 |
| 38 | 114 | 6 | 408 | 5.92 [4–9] | ×1 |
| 39 | 32 | 4 | 417 | 5.92 [4–9] | ×1 |
| 40 | 57 | 2 | 418 | 5.45 [4–8] | ×1 |
| 41 | 73 | 4 | 437 | 8.48 [6–12] | ×1 |
| 42 | 121 | 1 | 443 | 4.50 [3–6] | ×1 |
| 43 | 9 | 0 | 448 | 7.93 [6–12] | ×1 |
| 44 | — | — | — | — | — |
| 45 | — | — | — | — | — |
| 46 | — | — | — | — | — |
| 47 | — | — | — | — | — |
| 48 | — | — | — | — | — |
| 49 | — | — | — | — | — |
| 50 | — | — | — | — | — |
| 51 | — | — | — | — | — |
| 52 | — | — | — | — | — |
| 53 | — | — | — | — | — |
| 54 | — | — | — | — | — |
| 55 | — | — | — | — | — |
| 56 | — | — | — | — | — |
| 57 | — | — | — | — | — |
| 58 | — | — | — | — | — |
| 59 | — | — | — | — | — |
| 60 | — | — | — | — | — |
| 61 | — | — | — | — | — |
| 62 | — | — | — | — | — |
| 63 | — | — | — | — | — |
| 64 | — | — | — | — | — |
| 65 | — | — | — | — | — |
| 66 | — | — | — | — | — |
| 67 | — | — | — | — | — |
| 68 | — | — | — | — | — |
| 69 | — | — | — | — | — |
| 70 | — | — | — | — | — |
| 71 | — | — | — | — | — |
| 72 | — | — | — | — | — |
| 73 | — | — | — | — | — |
| 74 | — | — | — | — | — |
| 75 | — | — | — | — | — |
| 76 | — | — | — | — | — |
| 77 | — | — | — | — | — |
| 78 | — | — | — | — | — |
| 79 | — | — | — | — | — |
| 80 | — | — | — | — | — |
| 81 | — | — | — | — | — |
| 82 | — | — | — | — | — |
| 83 | — | — | — | — | — |
| 84 | — | — | — | — | — |
| 85 | — | — | — | — | — |
| 86 | — | — | — | — | — |
| 87 | — | — | — | — | — |
| 88 | — | — | — | — | — |
| 89 | — | — | — | — | — |
| 90 | — | — | — | — | — |
| 91 | — | — | — | — | — |
| 92 | — | — | — | — | — |
| 93 | — | — | — | — | — |
| 94 | — | — | — | — | — |
| 95 | — | — | — | — | — |
| 96 | — | — | — | — | — |
| 97 | — | — | — | — | — |
| 98 | — | — | — | — | — |
| 99 | — | — | — | — | — |
| 100 | — | — | — | — | — |

## Sin defensa

| Día | Dinero | Plantas | Murallas acumuladas | Animales media [rango] | Fuerza |
|---:|---:|---:|---:|---:|---:|
| 1 | 30 | 92 | 0 | 1.00 [1–1] | ×1 |
| 2 | 33 | 91 | 0 | 1.00 [1–1] | ×1 |
| 3 | 31 | 90 | 0 | 1.00 [1–1] | ×1 |
| 4 | 34 | 89 | 0 | 1.00 [1–1] | ×1 |
| 5 | 32 | 88 | 0 | 1.00 [1–1] | ×1 |
| 6 | 31 | 82 | 0 | 3.21 [1–5] | ×1 |
| 7 | 34 | 73 | 0 | 3.21 [1–5] | ×1 |
| 8 | 32 | 65 | 0 | 3.21 [1–5] | ×1 |
| 9 | 30 | 57 | 0 | 3.21 [1–5] | ×1 |
| 10 | 35 | 49 | 0 | 2.85 [1–5] | ×1 |
| 11 | 35 | 36 | 0 | 4.65 [3–7] | ×1 |
| 12 | 53 | 27 | 0 | 4.65 [3–7] | ×1 |
| 13 | 71 | 18 | 0 | 4.65 [3–7] | ×1 |
| 14 | 123 | 6 | 0 | 4.26 [3–7] | ×1 |
| 15 | 65 | 0 | 0 | 4.26 [3–7] | ×1 |
| 16 | 35 | 0 | 0 | 2.50 [2–3] | ×1 |
| 17 | 5 | 0 | 0 | 2.50 [2–3] | ×1 |
| 18 | — | — | — | — | — |
| 19 | — | — | — | — | — |
| 20 | — | — | — | — | — |
| 21 | — | — | — | — | — |
| 22 | — | — | — | — | — |
| 23 | — | — | — | — | — |
| 24 | — | — | — | — | — |
| 25 | — | — | — | — | — |
| 26 | — | — | — | — | — |
| 27 | — | — | — | — | — |
| 28 | — | — | — | — | — |
| 29 | — | — | — | — | — |
| 30 | — | — | — | — | — |
| 31 | — | — | — | — | — |
| 32 | — | — | — | — | — |
| 33 | — | — | — | — | — |
| 34 | — | — | — | — | — |
| 35 | — | — | — | — | — |
| 36 | — | — | — | — | — |
| 37 | — | — | — | — | — |
| 38 | — | — | — | — | — |
| 39 | — | — | — | — | — |
| 40 | — | — | — | — | — |
| 41 | — | — | — | — | — |
| 42 | — | — | — | — | — |
| 43 | — | — | — | — | — |
| 44 | — | — | — | — | — |
| 45 | — | — | — | — | — |
| 46 | — | — | — | — | — |
| 47 | — | — | — | — | — |
| 48 | — | — | — | — | — |
| 49 | — | — | — | — | — |
| 50 | — | — | — | — | — |
| 51 | — | — | — | — | — |
| 52 | — | — | — | — | — |
| 53 | — | — | — | — | — |
| 54 | — | — | — | — | — |
| 55 | — | — | — | — | — |
| 56 | — | — | — | — | — |
| 57 | — | — | — | — | — |
| 58 | — | — | — | — | — |
| 59 | — | — | — | — | — |
| 60 | — | — | — | — | — |
| 61 | — | — | — | — | — |
| 62 | — | — | — | — | — |
| 63 | — | — | — | — | — |
| 64 | — | — | — | — | — |
| 65 | — | — | — | — | — |
| 66 | — | — | — | — | — |
| 67 | — | — | — | — | — |
| 68 | — | — | — | — | — |
| 69 | — | — | — | — | — |
| 70 | — | — | — | — | — |
| 71 | — | — | — | — | — |
| 72 | — | — | — | — | — |
| 73 | — | — | — | — | — |
| 74 | — | — | — | — | — |
| 75 | — | — | — | — | — |
| 76 | — | — | — | — | — |
| 77 | — | — | — | — | — |
| 78 | — | — | — | — | — |
| 79 | — | — | — | — | — |
| 80 | — | — | — | — | — |
| 81 | — | — | — | — | — |
| 82 | — | — | — | — | — |
| 83 | — | — | — | — | — |
| 84 | — | — | — | — | — |
| 85 | — | — | — | — | — |
| 86 | — | — | — | — | — |
| 87 | — | — | — | — | — |
| 88 | — | — | — | — | — |
| 89 | — | — | — | — | — |
| 90 | — | — | — | — | — |
| 91 | — | — | — | — | — |
| 92 | — | — | — | — | — |
| 93 | — | — | — | — | — |
| 94 | — | — | — | — | — |
| 95 | — | — | — | — | — |
| 96 | — | — | — | — | — |
| 97 | — | — | — | — | — |
| 98 | — | — | — | — | — |
| 99 | — | — | — | — | — |
| 100 | — | — | — | — | — |

Las cifras sustituyen la interpretación del borrador v2, cuya falsa insolvencia y anticipación de ingresos quedan documentadas en review.md. No se acepta el balance ni se inicia una campaña con estas cuentas.
