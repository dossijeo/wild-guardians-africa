# Viento más amplio — iteración 2026-10-28

Se mantiene el Guardián original, sus 37 huesos y tres primitivas. Se sustituyen únicamente los clips `Mantle_Breeze` y `Mantle_Spell`; cuerpo, rostro, pesos y visemas conservan sus datos. La nueva receta reproducible está en `tools/guardian/wind_actions.py`, llamada desde la construcción completa. La fuente editable `art/guardian/guardian.blend` y el GLB incorporan la misma iteración.

## Movimiento

- La onda principal recorre el manto en ciclos de cuatro segundos; una ondulación secundaria de aproximadamente 1,7 segundos afecta al bajo.
- Aumenta la flexión de la zona media y del extremo, manteniendo pequeñas las traslaciones para no estirar los huesos.
- Las puntas de las plumas reaccionan con retraso respecto a su base y con una vibración secundaria independiente.
- Los fragmentos de madera tienen mayor recorrido orbital y conservan su movimiento rígido.
- La variante de hechizo usa una ganancia de 1,35. Se conservan las ráfagas de llegada del controlador de invocaciones.
- Los dos clips siguen formando bucles de doce segundos. Se igualan las velocidades discretas a ambos lados de la unión para evitar un tirón al reiniciar.

Son animaciones esqueléticas horneadas; no se añade simulación física, huesos, draw calls ni trabajo por fotograma. No se ha ejecutado una nueva simulación de tela: esta iteración modifica la dirección artística de las ondas sobre el rig y el estudio físico existentes.

## Evidencia y límites

`candidate.mp4` recoge dos ciclos reales en Three.js, vista de tres cuartos. `candidate-contact.png` permite revisar sus extremos. Se observa mayor recorrido del bajo y variación independiente de plumas y madera; el movimiento requiere todavía comparación artística con la amplitud de bandera solicitada, especialmente desde la cámara estratégica.

Trece pruebas específicas pasan, incluida continuidad de posición y velocidad de los bucles. El validador glTF da cero errores y dos advertencias de jerarquía skinned sin cambios. La comparación de 280 grupos de datos conserva geometría, pesos, morphs y animaciones ajenas al viento; la reexportación de Blender cambia únicamente algunas tangentes hasta 0,000100002, registrado en `unchanged-data.json`.

La comprobación geométrica muestrea reposo y Attack en Blender. En reposo, el percentil 99 de proporción de longitud de aristas pasa de 1,056 a 1,074, y el máximo de 2,328 a 2,716. En Attack, el percentil 99 pasa de 1,213 a 1,235 y el máximo de 3,241 a 3,310. Estos máximos locales no se ocultan ni se interpretan como una aprobación de todas las deformaciones: falta revisar específicamente los pesos del borde donde aparecen y las intersecciones en todos los ángulos. El informe crudo está en `candidate-deformation.json`.

GLB: 2.765.144 bytes, sin aumento frente al modelo agrupado anterior. No se atribuye una mejora de rendimiento a esta edición. La fase 2 y la aceptación visual definitiva siguen abiertas.

También se ejecutó `WorldScene` con seis lanzamientos Grow/Multiply, cambios de cámara/zoom y órdenes próximas. `world-day.json` registra cero errores y máximo de un Guardián; `world-day.mp4` y su hoja de contacto conservan la evidencia. La distancia estratégica y los anillos luminosos limitan la lectura fina de los pliegues; no sustituyen la revisión cercana. Se aprecia ocultación parcial por vegetación en una aparición y debe incluirse en la siguiente revisión de posicionamiento.


## Control de amplitud del GLB exportado

La comprobación de regresión mide la distancia angular máxima entre cuaterniones locales del clip, muestreando uno de cada seis fotogramas. En el archivo actual, los extremos del manto recorren 75–77 grados en Breeze y 101–104 en Spell; las plumas 49–56 y 68–75; la madera 43 y 58–59. Los anclajes superiores permanecen por debajo de 4 grados.

La prueba comprueba que cada hueso secundario conserva un canal de rotación, que el bajo mantiene más de 55 grados de recorrido, que los anclajes permanecen por debajo de 10 y que Spell conserva mayor amplitud que Breeze. Son márgenes de regresión de esta dirección artística, no medidas de calidad física. Once pruebas de modelo e invocaciones pasan. No se modificaron modelos, animaciones ni parámetros durante esta revisión. El recorrido del clip completo tampoco garantiza que cada invocación de 2,2 segundos muestre todos sus extremos; sigue siendo necesaria la inspección visual en la cámara de juego.

## Current editable-source edge localization

Reran check_deformation.py on the present art/guardian/guardian.blend for Idle and Spell_Attack. The tool now records source SHA-256, sampled frames, worst vertex indices, rest/posed lengths, posed coordinates and actual group weights; --clips selects the required layers. No source/model/animation was edited. Receipt: current-edge-details.json.

This source gives Idle maximum 1.544 on vertices 98/10610 (27.14 mm rest to 41.89 mm), influenced by front/back mantle and torso. Attack maximum 2.787 is on vertices 5134/5135 (2.49 mm to 6.94 mm), dominated by Hand.R and Forearm.R, at frame 13. It does not reproduce the old candidate's worst mantle edge. Do not use the older candidate report as a diagnosis of these current vertices or infer an improvement without confirming source/export correspondence. Follow-up should inspect these precise regions and verify the installed GLB correspondence before editing weights. Sampling excludes edges below 2 mm and is not an all-frame intersection proof.
