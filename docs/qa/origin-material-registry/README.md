# Límites de recentrado desde materiales únicos

`WorldScene.render` obtiene los límites de horizonte y agua desde los materiales únicos del registro vivo. Evita el recorrido completo de la escena en cada frame; no almacena los valores ni las referencias de uniformes entre frames. Los datos cambiados se leen de nuevo, y los materiales añadidos/retirados o reemplazados siguen los eventos y refresh del registro existente. El helper conserva el recorrido general anterior y el modo QA de registro desactivado usa ese fallback.

Dos escenas nativas pausadas con centro, brote y contratación pagados, semilla 712 y cultura Mapungubwe:

| Bioma | Nodos de escena | Materiales únicos consultados | Límites únicos | Resultado |
| --- | ---: | ---: | ---: | --- |
| Manglares | 1102 | 161 | 1 | Mismas referencias y restauración |
| Gran Cañón | 749 | 143 | 3 | Mismas referencias y restauración |

Las consolas no registran errores/avisos; no cambia el estado lógico. La fixture fuerza captura de profundidad, conserva el reloj pausado y tiene trabajador llegando y crecimiento cero; no acredita una partida móvil, incursión, igualdad por píxeles o todas las poses. Los límites se comparan por identidad, incluidos los dos objetos distintos del horizonte del cañón con iguales componentes. El recentrado controlado comprueba el desplazamiento de todos los componentes y su restauración.

Pasan doce pruebas dirigidas de origen/registro: streaming, reparenting, material arrays, propietarios ocultos/compartidos, reemplazo y eliminación de metadatos, y restauración tras error. Compilación web correcta en 10,78 s con aviso habitual de bundle grande. Sin benchmark CPU/GPU: el número de elementos consultados baja, pero no se afirma una mejora de frametime/FPS. La suite local completa comenzó antes de esta modificación y no se cuenta como aceptación de la nueva revisión.

Contrato: en el mundo actual estos límites pertenecen a materiales de meshes registrados; los proxies de sombra excluidos no contienen estos datos. Un futuro renderable excluido o no mesh que necesite límites debe registrarlos o utilizar el fallback/hook de origen correspondiente. El horizonte experimental de impostores usa su propio uniforme de origen y permanece fuera del gameplay. Fuentes/hashes en `proof.json`, informes y capturas de ambas escenas, logs de pruebas/build comprimidos. Base e098396; las campañas congeladas siguieron activas y no se alteraron.
