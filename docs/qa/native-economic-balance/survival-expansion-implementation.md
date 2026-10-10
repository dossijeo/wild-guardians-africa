# Supervivencia y expansión: candidata independiente

Encargo vigente del usuario del 10 de octubre de 2026. Rama `codex/survival-expansion-balance`, base `8f3c0021`. Sustituye el calendario por niveles y el precio fijo de 2.000; ningún cambio de esta candidata debe fusionarse en main antes de revisar evidencia nativa, rendimiento y compatibilidad. Los datos anteriores se conservan.

## Requisitos y evidencias pendientes

1. Noches 1–100: amenaza creciente mediante cantidad, mezcla de especies, golpes, daño y alcance físico; presupuesto conjunto, no incrementos independientes sin control. Agricultura, entregas y reparaciones nativas.
2. Diagnóstico: preservar la campaña detenida en 58 días. Verificar sus cifras desde el diario original; no asumir que un cierre manual fue derrota. Control sin murallas conserva magia; separar otro control sin escudos.
3. Presión `clamp(.45*(d-1)/99+.55*ln(1+V/1000)/ln(26),0,1)`. V agrícola, nunca saldo bancario. Suavizado determinista persistente e idempotente; parámetros de ventana declarados.
4. Cantidad candidata `round(4+30P)`, intro cinco noches intacta; oleadas con hasta 16 activos inicialmente, sin descartar capacidad presupuestada, con entrada física exterior y residencia real.
5. Mezcla progresiva hasta 25/28/23/16/8% facóquero/hiena/búfalo/león/rinoceronte; respetar desbloqueos, RNG persistente y presupuesto, sin listas enormes de composiciones.
6. Golpes originales + `floor(2P)` en ambos límites; consumir únicamente al resolver ataques nativos, incluidos fallos e intercepciones.
7. Daño central bases 1/1/2/2/3 + `floor(1.5P)`; resistencia agrícola dos puntos. Estructuras `round(original*(1+.5P))`, materiales/colapso/reparación intactos.
8. Radios .7/1.2/2/1.6/2.8 × `(1+.30P)`; hasta `1+floor(6P)` plantas por impacto, no bajas obligatorias. Punto/orientación física, daño periférico reducido, deduplicación, obstáculos sólidos y escudos; consultas espaciales eficientes. Un impacto estructural no daña automáticamente cultivos detrás.
9. Presupuesto `Q=sum(H*D*Aefectiva)` con densidad/geometría de referencia documentadas; separar potencial/efectivo y registrar eficiencia agrícola observada. No daño invisible para ajustar resultados.
10. Referencias estadísticas sin protección `.2057+.0007*(d-1)` y protegida `.0351+.0001*(d-1)` fuera de la intro; diferencias deben proceder de defensas físicas y magia. Recuperación y ausencia de saltos injustificados.
11. Constantes: centro 800, inicio 1.500, salarios 30/40, semillas/cosechas vigentes constantes, ingresos sólo cajas entregadas, reparación proporcional con ceil y reconstrucción completa, sin cuotas artificiales.
12. Tras victoria 100: incursiones nocturnas/diurnas desaparecen definitivamente; resto del juego y guardados continúan indefinidamente.
13. Poblados: precio por ordinal `round1000(50000*1.6^(n-2))`, interfaz y cobro idénticos, enteros grandes exactos, compras antiguas sin cobros retroactivos ni máximo artificial.
14. Comparar ratios 1.4/1.6/1.8 manteniendo otros parámetros. Medir capital al vencer, neto pospartida, fechas de compras, recuperación de inversión, producción/gastos incrementales y poblados alcanzables hasta 180. No elegir 1.6 sin evidencia.
15. Estrategias A expansiva, B buena, C mala, D sin murallas con magia, E misma productividad que D sin murallas/escudo; decisiones jugables, economía y daños idénticos.
16. Primero pruebas funcionales físicas/persistencia/RNG/rendimiento; luego 7/14/21 noches × semillas 712/123/2026 × cinco estrategias; sólo después 100 y supervivientes 180, ampliando biomas/culturas. Congelar fuentes antes de cada ejecución.
17. Evidencia por incursión: d,V,P,Q,especies/oleadas,golpes disponibles/consumidos, daño central/periférico, plantas alcanzadas/heridas/destruidas y valor perdido, estructuras/escudos, fallos de ruta/objetivo, presupuesto sin usar, reparaciones pagadas. Por jornada: caja inicial/final, ingresos, semillas, salarios, plantas, empleados/actividad, defensas, poblados/precios, pérdidas e inactividad. Conciliación exacta, tablas/gráficas comparativas.
18. Aceptación: buena gestión sobrevive 100, mala puede perder nativamente, defensas útiles, progresión gradual, actividad significativa con inactividad <25%, expansión sostenible y sin regresiones graves. Variabilidad real, nunca forzar resultados.
19. Parada cooperativa temprana ante desequilibrio concluyente; preservar snapshots, observadores, negativos, fuentes y motivos. Error técnico/timeout/entrada imposible no equivalen a derrota económica. No promover hasta revisión completa.

## Primer componente verificable

`village-expansion-price.js` calcula las tres curvas con fracciones enteras 7/5, 8/5 y 9/5; redondea una sola vez al millar, mitad hacia arriba. Retorna BigInt exacto, con adaptación a Number sólo dentro del rango seguro. La variante propuesta está conectada al generador canónico, `villageCost`, preview, cobro, reserva mínima e interfaz (precio entero completo, sin abreviar). El ledger existente almacena enteros como strings racionales y admite esos cobros exactos. La política de ahorro emplea ahora el precio del siguiente ordinal y sólo reserva para poblados después de la victoria; no se acredita equilibrio pospartida.

Validación inicial integrada: 120 contratos pasan en precio/core/game/colocación de poblados y zonas fluidas; incluye 99 compras nativas, culturas alternadas, ordinal 100, replay y guardado con capital explícito de prueba. Total cobrado exacto 13.449.218.115.035.982.237.709.000 y saldo final 200.000.000; 99 consultas de ruta. Esto acredita funcionamiento con enteros grandes, NO rentabilidad ni 100 jornadas de juego. Primera ejecución 115 PASS/5 FAIL por saldos esperados obsoletos de 1.995 en el test de fondos gastados, corregidos a 49.995 conforme al nuevo precio; ningún runtime adaptado para aprobarlos.

La representación no impone límite de poblados; el coste de cálculo/almacenamiento crece con el número de dígitos, sujeto a recursos físicos del dispositivo. No se promete soportar exponentes arbitrariamente grandes en tiempo constante.

## Revisión de componentes incorporados a la candidata

FIFO de incursiones `44bb5c95` (fuente del agente `6aa23a03`) y quinto control `6003c692` (fuente `2032fcb5`) incorporados exclusivamente a esta rama. Módulo puro de presión `a8223a04` (fuente `74c7bb69`) sigue sin activar en el motor. Revisión raíz conjunta: 151 pruebas dirigidas pasan (FIFO, presión pura, D/E, grupos defensivos, colapso, entrada exterior, recarga, core/game y precios/colocación de poblados). No constituye campaña económica ni QA visual. El presupuesto inicial recortaba el rango de sorteo de golpes y el daño estructural no estaba redondeado; se requiere corregir ambos antes de integrar esa presión.

Política de ahorro: mantiene el 20% de ingresos ya entregados menos compras de poblados ya pagadas, limitado por el precio siguiente y por caja disponible tras salarios/reparaciones/semilla. Es una decisión del jugador automático, nunca un cargo. Antes de la victoria reserva cero para ese objetivo bloqueado. 17 contratos financieros/estrategia/Q4/resumen pasan; Q4 sigue rechazado como buena gestión por su campaña negativa, independientemente de sus contratos funcionales.

Revisión de presión `5b7bb0ba` (fuente `17ca82fa`): 16 contratos raíz pasan. Presupuesto determina/ajusta composición antes del RNG, conserva rango completo de H y redondea daño estructural. La candidata sube explícitamente Q al menor presupuesto de peor caso viable cuando la media propuesta es insuficiente; registra ese ajuste y sesgo de mezcla. Un Q explícito insuficiente sigue rechazándose. Esta decisión queda aceptada para experimentación, no como balance probado; presión, EMA, oleadas y daños aún necesitan integración física y persistencia completa.

Informes de campañas: ahora declaran fuente, contratación, horizonte solicitado, bioma/cultura y permiso de escudo cuando exista en el recibo. No infieren permisos faltantes ni afirman equivalencia económica entre fuentes distintas. Nueve contratos de resumen pasan. Las comparativas históricas permanecen intactas; los nuevos campos se aplicarán a nuevos informes.
