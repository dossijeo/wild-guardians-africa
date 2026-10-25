# Agua sin dibujo de bandas — prueba de coste

Se mantiene la superficie irregular y se elimina por completo el cálculo de paintedWater del camino de agua (la lava sigue intacta). La tinta profunda y el HDR definen el color, sin el 12 % residual de bandas. 16 capturas sobre ríos de Sabana y Gran Río, día/noche, dos tiempos visuales; el resultado conserva la dirección y elimina las franjas residuales.

[ABBA de cuatro biomas](PERFORMANCE.md): los resultados son mixtos. Sabana nocturna tiene una repetición candidata de 24,039 ms frente a 18,014 ms en la otra; no concluir que su media representa un coste estable. Manglares diurno aumenta +1,388 ms en esta ronda. Las diferencias negativas de otras vistas tampoco demuestran aceleración. No se aprueba un presupuesto global ni se integra esta versión todavía.

La siguiente prueba sustituye ocho evaluaciones de hash por dos lecturas de un mapa pequeño de pendientes con mipmaps, manteniendo geometría, reloj, recortes y ausencia de simulación de agua. Debe verificarse visualmente y medirse; una estimación de operaciones no sustituye los tiempos GPU.
