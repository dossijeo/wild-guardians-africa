# Equilibrio económico nativo: encargo vigente

Solicitud del10 de octubre: sustituir la candidata de escasez por economía de
precios constantes, expansión libre y daño físico nocturno. Las proyecciones de
escasez anteriores son evidencia histórica, no una candidata para producción.

## Contrato congelado inicialmente

- Centro de trabajo800; dinero inicial1500; mayores30, jóvenes40.
- Semillas originales constantes: mijo5, girasol18, sorgo6, maíz8, batata10,
  algodón100, yuca12, plátano150. No hay recargo implementado en el motor.
- Ingresos constantes actuales:11,36,13,17,23,178,32,267 respectivamente.
  Se preservan esos valores en esta primera fase; no se sustituirán silenciosamente
  por los ingresos60% utilizados en las proyecciones matemáticas anteriores.
- Cada poblado adicional2000, sin incremento por ordinal; sin máximo de poblados.
- Crecimiento, checkpoints, tolerancia, FIFO, cosecha física y productividad
  originales. Sólo la entrega de una caja genera ingreso; comprar no lo anticipa.
- Reparación proporcional al coste original y daño de la pieza, redondeada hacia
  arriba al cobrar; reconstrucción completa a precio completo; muros intactos
  sin mantenimiento. Se conserva el colapso existente.
- Referencias agrícolas Ds=0,2057+0,0007(d−1), Dp=0,0351+0,0001(d−1);
  referencia defensiva12+0,42N+0,003N². Son objetivos de comparación y no cargos,
  probabilidades de borrado de plantas ni garantías de protección.
- Postgame real sin nuevas incursiones después de la victoria, con contratación,
  cosechas y gastos normales. Ese cambio de riesgo debe separarse en los reportes.

## Orden de implementación y gates

1. Precio2000 compartido por UI y simulación, creación pagada, duplicados y reload.
2. Entrada físicamente exterior: pruebas detectaron nacimiento interior según
   cámara. Las candidatas sólo están en herramientas QA; requieren un exterior
   legal y residencia visible incluso si el recinto ocupa los límites activos.
3. Política automatizada de perímetro finito, expansión libre y reparación pagada;
   contar comandos aceptados y tareas reales, no solicitudes fallidas como actividad.
4. Calibración explícita de cantidad/composición de hordas con daño nativo. Mismos
   parámetros para todas las estrategias, sin cambiar daño por riqueza o estrategia.
5. Campañas nativas A expansiva/B buena/C mala/D sin muros con semillas pareadas,
   hasta100 noches y supervivientes hasta180. Variabilidad, tablas y gráficas.
6. Aceptación: dinero/plantas/ledger conciliados, daño/intercepción/reparaciones
   físicos, posibilidad real de derrota por gestión, ahorro para poblados y
   actividad observada. Inactividad inferior al25% aceptada por el usuario.

No están completadas las campañas, calibración, integración de entrada ni QA
renderizada por este documento. No se aceptarán tiempos de observación agotados
como derrotas ni tests sintéticos como campañas reales.
