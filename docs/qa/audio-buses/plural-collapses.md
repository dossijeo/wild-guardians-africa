# Carga renderizada con varios colapsos

`tests/browser/audio-world-collapses.html` amplía la escena por fases archivada en `native-phases-source.txt`. Se ejecuta sobre la producción de `45369c2`, con Sabana/Mapungubwe, semilla 712, calidad baja, 32 semillas, ocho trabajadores y tres centros pagados. Conserva el crédito QA explícito adicional de 10000 y el audio silenciado/predecodificado.

La primera fase exige trabajo físico de los empleados y diez stems originales de Gameplay A. En la segunda se solicita un grupo de cinco especies. Dos centros reciben daño completo **como preparación de carga QA**, de forma simultánea; el centro principal conserva la preparación de 468 puntos de daño y debe colapsar por contactos de animales. El dominio nativo completa los colapsos y emite sus eventos; no se fabrican eventos de colapso ni contactos de animales para los centros preparados.

El paso renderiza y comprueba `world.actorsReady()` antes de Game.tick, como la barrera del frame del juego. Durante carga asíncrona cuenta iteraciones retenidas en `heldSteps`; ese contador no mide fotogramas, segundos reales ni FPS. Se muestrean límites globales, por familia y emisor, pitch 1, humo/escombros por edificio y cantidad agregada de instancias de escombros realmente enviadas al renderer. Se exige haber observado al menos dos centros colapsando simultáneamente y terminar con los tres arruinados.

La sintaxis del módulo pasa `node --check`. El resultado terminal está en `plural-collapses-final.json` y su captura en `plural-collapses-final.png`: 50 riegos, dos centros colapsando simultáneamente, tres centros arruinados, una planta destruida y salida de la incursión a los 162,9 segundos simulados. Hay 13 iteraciones retenidas durante la carga de actores; no se les atribuye una duración real.

Máximos observados: 17 SFX, dos voces por emisor, cuatro por familia y 20 fuentes musicales durante la superposición de decks prevista por el transporte original (diez stems por deck). Se aceptan tres fuentes originales de colapso. Los efectos alcanzan 101 entradas de humo y 95 de escombros por edificio; el total de instancias de escombros realmente renderizadas alcanza 620 entre los tres edificios. `ashChips:175` sigue midiendo un array preparado por edificio y no se confunde con partículas activas. Las aserciones de límites y pitch 1 pasan, no se registran errores WebGL ni excepciones y la consulta final de warnings/errors de consola está vacía. Tras detener quedan cero voces; el contexto se dispone y queda cerrado.

La evidencia verifica carga simultánea renderizada, mezcla técnica y limpieza de recursos en esta escena preparada. No acredita aún QA-155 completo, escucha perceptual, carga fría, HUD, teléfono físico ni alternancia A/B. Pedir cinco especies no prueba cinco ataques o cinco voces: los contactos breves y clips aceptados corresponden a facóquero/hiena. Las otras especies tienen su carga retenida antes de avanzar, pero no se las declara escuchadas.

La CI 37236607582 de `140b00d` terminó aprobada con 1741/1741 pruebas, build, verificación relativa y paquete itch. Ese resultado precede a esta nueva página de QA; no se atribuye a ella ni a Tauri/Windows.

## Revalidación con ventanas musicales (5 de octubre)

La revisión `e1f1e5e` se comprobó con la versión 3 del mismo fixture, adaptada al
transporte musical actual. Se mantuvieron los 32 cultivos, ocho trabajadores,
cinco especies y tres centros; también el crédito QA y los dos colapsos
provocados como preparación de carga. Los SFX se precargan en este fixture para
aislar concurrencia: no representa la carga fría ni el uso de RAM total de una
partida normal.

Resultado terminal: 50 riegos, dos colapsos simultáneos, tres centros arruinados,
un contacto estructural animal y una planta destruida. La incursión termina a
162,9 segundos simulados. Los máximos son 17 SFX, dos por emisor, cuatro por
familia, 101 entradas de humo y 95 escombros por edificio, con 620 instancias
de escombros agregadas. Las aserciones de admisión, partículas, pitch 1 y dominio
sin mutaciones del audio pasan. Al detener, quedan cero voces y el contexto
se cierra.

`MusicWindowTransport` usa el AudioContext de 48 kHz y alcanza 40.845.312 bytes
de PCM musical en el pool (38,95 MiB), sin buffers de pistas completas. Se
observan hasta 16 fuentes de ventanas, incluida la superposición prevista;
este contador no equivale a 16 pistas completas decodificadas. No se ha medido
RAM total ni una mejora de FPS en esta prueba.

Evidencia: `plural-collapses-windows-final.json/png` y
`plural-collapses-windows-console.json`. No hay errores del fixture ni WebGL.
ANGLE registra una advertencia de posible variable no inicializada en
`environment4`; no se presenta la consola como libre de warnings. El audio está
silenciado: la evidencia verifica los límites técnicos de QA-155, no una escucha
perceptual, el teléfono físico ni alternancia A/B.

La regresión local de la misma revisión termina con 1912/1912 pruebas y cero
fallos. Compilación y paquete web relativo pasan (586 archivos, 839 referencias
relativas, 20 GLB de ejecución). La CI remota se comprueba por separado.
