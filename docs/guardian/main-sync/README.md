# Sincronización con main — 2026-10-28

Rama: `codex/guardian-3d-animation`. Se integra `origin/main` en `d0382bd4d`; no se modifica main ni se fusiona la PR.

## Resolución

Se conserva la navegación jerárquica, el renderizado y las reglas agrícolas actuales de main. Se conectan a ellos el Guardián 3D, Attack, las reacciones físicas y la recuperación. La retirada por daño utiliza la navegación actual. Se conservan los modelos nuevos de main y la hiena expresiva trabajada en esta rama.

Los 54 JSON de sincronización labial siguen editables individualmente. La compilación de distribución los agrupa en un banco para respetar el límite de 1.000 archivos: 993 archivos, 494.940.833 bytes. Hay poco margen de tamaño para futuros recursos.

## Validación ejecutada

- 50 pruebas específicas de Guardian, combate, selección, interfaz, VFX y audio aprobadas.
- 216 pruebas jugables aprobadas.
- Compilación, sintaxis de navegador, balance, recursos, audio y paquete web aprobados.
- 7 pruebas de carga del banco y controlador facial aprobadas; el paquete comprueba la igualdad de los 54 registros con los originales.
- Se repitieron y aprobaron seis comprobaciones agrícolas/terreno tras adaptar sus herramientas a las reglas de main.
- Prueba gráfica real en WorldScene: Grow y ciclo de ataque/caída/recuperación de la hiena, sin errores registrados y sin cuerpos físicos activos al finalizar. Evidencias: `grow.png`, `hyena-cycle.mp4`, `hyena-cycle.json`, `hyena-cycle.png`. `menu.png` muestra el menú de main cargado.

La batería completa ejecutó 5.209 pruebas: 5.191 aprobadas y 18 fallidas en la primera pasada. Tras corregir las incompatibilidades y repetir los grupos afectados, se resolvieron 15 de esos fallos (44 comprobaciones de campañas/audio y 22 de renderizado/recursos aprobadas, además de las seis agrícolas/terreno). Permanecen tres fallos de la herramienta histórica offline de contornos defensivos: utiliza `smoothPath` y `approachGroupBlocked`, interfaces que ya no existen en la navegación de main. No se modifica el motor de navegación para recuperarlas. Esta herramienta no forma parte del juego ni del sistema del Guardián. No se declara la suite completa aprobada.

Las comprobaciones de procedencia de campañas fallaron inicialmente por el volumen del diff aún sin commit (ENOBUFS); su repetición después del commit de integración fue satisfactoria. No se repitió la batería completa: los resultados posteriores corresponden a los grupos afectados.

No se realiza ni se atribuye una nueva comparativa de rendimiento durante esta sincronización. Los problemas previos de fluidez siguen fuera de este trabajo. La prueba gráfica se limita a las escenas descritas; no certifica todas las especies ni la entrega completa de la fase 2.
