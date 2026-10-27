# Pendientes posteriores al merge

Actualizado por instrucción del usuario el 2026-10-27. Estas tareas se ejecutan después de la integración validada en main.

- [x] Anclar el pie del tótem de la pantalla de inicio a una capa de suelo cercana que se mueva con él. Conservar el parallax del fondo lejano, el acercamiento al seleccionar y las partículas que iluminan el tótem. Comprobar que no flote durante el movimiento y en distintas relaciones de aspecto.
- [x] Revisar los overlays a pantalla completa (magia, daño crítico, victoria, etc.): duración visible de 2–3 segundos y transiciones legibles. Evitar acumulaciones de efectos al lanzar varias magias seguidas; validar prioridades, sustitución y salida del mundo.

## Aparcado

- LOD de trabajadores y bestias: no iniciar implementación ni generar versiones automáticas. Reanudar solo cuando el usuario lo solicite.

Esta lista no declara terminada la validación del merge ni la investigación de los picos residuales de fluidez.

Integradas en main mediante PR #221 (d0382bd4d), con CI Linux/Windows y validación del flujo empaquetado. Evidencia y límites: ../residual-spikes-20261027/MERGE-221.md y ../postmerge-ui-20261027/VISUAL-REVIEW.md. El objetivo de fluidez continúa abierto.
