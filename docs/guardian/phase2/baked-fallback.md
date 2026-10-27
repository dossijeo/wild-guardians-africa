# Caídas horneadas al superar el presupuesto físico

Estado: integración funcional en revisión; aceptación visual y rendimiento pendientes.

## Banco reproducible

`node tools/guardian/bake_ragdoll_fallback.mjs public/content/guardian/ragdoll-fallback`

Genera 40 caídas de los cinco modelos actuales: cuatro direcciones horizontales y sus variantes descendentes. Usa los rigs, masas y colisionadores del sistema articulado. El horneado utiliza 24 iteraciones del solver, frente a 12 en ejecución: algunas direcciones del rinoceronte no alcanzaban reposo con 12. Exige reposo sostenido durante 0,3 s y falla si no lo consigue en ocho segundos.

El banco versión 2 (`snapshotKind: bone-world`) guarda poses de los 14 huesos después de aplicar la vinculación física, a 20 Hz. No confunde los ejes de los colisionadores con los del esqueleto. Binario: 1.089.368 bytes. El manifiesto registra fuentes, hashes y configuración. No incorpora assets externos.

## Integración

Cuando están ocupadas las tres plazas físicas, `BakedBeastFallbacks` reproduce una caída articulada sobre el siguiente animal. Admite hasta ocho reproducciones horneadas; por encima de ese límite persiste la reacción ligera y no se considera suficiente como solución final para cualquier carga.

La selección considera especie y dirección local del golpe. `BakedBeastFall` adapta posición, orientación y escala, mezcla desde la pose actual durante 0,18 s y conserva traslaciones locales de huesos no raíz. Suspende navegación y ataques mediante `magicDown`, actualiza la posición lógica y entrega la pose mundial final a `BeastRecovery`. Al terminar libera el estado y las referencias de navegación. Los golpes repetidos toman la pose actual; el cierre de escena cancela las reproducciones.

El recorrido horizontal consulta `segmentClear` y la altura usa muestras de piel contra el terreno. Esto **no equivale a colisiones articuladas** contra muros, rocas u otros animales. La falta de separación entre cuerpos continúa pendiente.

## Evidencia actual

- Doce pruebas del banco, reproducción y controlador: cinco especies, hashes, interpolación temporal, cuaterniones, entrada desde pose animada trasladada/girada/escalada, conservación de longitudes, cuatro contactos, suspensión de IA, recuperación, limpieza y segundo golpe durante caída o recuperación. Pasan; no prueban naturalidad artística.
- Prueba gráfica de cuatro hienas: tres físicas y una horneada, sin errores registrados; todas liberaron el estado de derribo. [Estado y métricas](baked-four-continuous.json).
- La primera fixture colocaba una bestia dentro de una roca. Se corrigió la búsqueda de posiciones iniciales usando transitabilidad y separación. [Captura posterior durante las caídas](baked-four-corrected-fixture.png). Se observa proximidad excesiva entre trayectorias: no se aprueban colisiones entre animales.
- El ciclo continuo posterior tuvo 171 fotogramas en 11,73 s de reloj y 8,078 s simulados. Frametime p95 132,9 ms, p99 149,8 ms; físicas p95 7,3 ms, máximo 29,5 ms. Coincidió con una compilación: es diagnóstico, **no una comparativa válida ni aprobación de fluidez**. El contador de rechazos era acumulado; la herramienta se corrigió después para informar la diferencia de cada ejecución y si completó ocho segundos simulados.
- La compilación Vite generó el paquete en 17,89 s, con advertencias de tamaño de chunks y una importación estática/dinámica compartida.

## Trabajo pendiente

Validar continuidad visual de caída y recuperación en todas las especies/direcciones, golpes repetidos y terreno inclinado; resolver colisiones y separación de cuerpos; revisar el límite de ocho alternativas; medir escenas equivalentes sin procesos de compilación simultáneos, incluyendo CPU, p95/p99, memoria y respuesta de controles. La hiena del ensayo usa el modelo actual del juego, no el candidato facial aún no aprobado.
