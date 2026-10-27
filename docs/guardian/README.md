# Guardián 3D: fuente, pipeline e integración

El retrato 2D deformable se sustituye en `NativeGuardian` por un GLB animado con Three.js 0.180.0. Se conservan las fases, botones, textos, reproducción de voz y eventos del tutorial. No se modifican reglas de simulación ni se conectan los clips de magia a acciones del juego.

## Archivos

- `art/guardian/original.glb`: copia intacta del archivo proporcionado. SHA-256 `a8edc03bae7267e59f1199ec0695c11658df0e8104d4b40ce318e8c71386a3ac`.
- `art/guardian/guardian.blend`: fuente editable, texturas empaquetadas, armature, Shape Keys, acciones y proxy físico de tela oculto.
- `public/content/guardian/guardian.glb`: modelo para distribución.
- `public/content/guardian/lipsync/{ES,EN}_NN.json`: 54 secuencias, transcripciones, hashes, gestos y correcciones auditables.
- `src/ui/guardian-3d.js`: render, mixer, mirada 3D, capas y liberación de recursos.
- `src/ui/guardian-face.js`: muestreo determinista por tiempo de audio y transiciones de visemas.
- `tests/browser/guardian-3d.html`: selector de las 54 voces, visemas, párpados, mirada conjunta/independiente, expresiones, clips y pruebas ejecutables.
- `tests/browser/guardian-benchmark.html`: comparación CPU con el retrato previo.

## Reproducir

Herramientas usadas: Blender 4.5.3 LTS, Rhubarb 1.14.0, FFmpeg y Python 3.12. Blender/Rhubarb/FFmpeg son herramientas de autoría, no dependencias del navegador. Instalar sus distribuciones oficiales y poner sus ejecutables en PATH, o sustituir los nombres por rutas absolutas.

```powershell
blender -b --python tools/guardian/build.py
python tools/guardian/lipsync.py --rhubarb C:\ruta\rhubarb.exe
python tools/guardian/audit_audio.py
python tools/guardian/gestures.py
blender -b --python tools/guardian/check_deformation.py
blender -b --python tools/guardian/render_checks.py
node --test --test-concurrency=2 tests/guardian-face.test.js tests/guardian-model.test.js tests/guardian-voice-close.test.js tests/spirit-voice.test.js
npm run build
npm run dev -- --port 5194
```

Abrir `/tests/browser/guardian-3d.html` en el servidor de desarrollo. El juego de producción se comprueba con `npm run preview`. Las páginas de laboratorio son herramientas del repositorio; no se incluyen en el menú del juego.

`build.py` ejecuta también `finalize_glb.py`: ese paso elimina canales constantes que Blender agrega a cada acción. Es imprescindible para mantener disjuntas las capas. Después de una exportación manual desde Blender, ejecutar el finalizador y volver a validar.

El pipeline de voz no modifica los Ogg originales. Convierte cada archivo a PCM mono de 16 kHz dentro de un directorio temporal, ejecuta Rhubarb y comprueba límites temporales. Se puede regenerar una voz con `--only ES_01` tras retirar su JSON generado. El caché comprueba el hash del audio; una edición de transcripción o configuración requiere regenerar expresamente ese JSON.

## Modelo y rig

El original contiene una sola malla con 11.963 vértices y 15.361 triángulos, un material y mapas de 8192/4096/4096 píxeles. No contiene huesos, ojos separados, morph targets ni animaciones. El tutorial previo usa una imagen y una cuadrícula WebGL, no este GLB.

Se mantienen la geometría base, máscara, silueta, espiral inferior, UV y adornos. Las modificaciones faciales están localizadas: una superficie con borde fijo para la boca, interior oscuro, dientes y lengua estilizados, y párpados pintados del color de la máscara. Un atlas frontal horneado conserva la madera en la región de la boca y evita interpolar entre islas UV incompatibles.

37 huesos: Root, Torso, Head; Shoulder/Arm/Forearm/Hand a ambos lados; dos Eye; cuatro cadenas de tres huesos Mantle; cuatro plumas con dos huesos cada una y cuatro fragmentos de madera con un hueso rígido cada uno. No hay caderas, piernas ni pies. Cada vértice tiene como máximo cuatro influencias normalizadas. Los pequeños componentes de adornos comparten pesos para conservar su forma. Los huesos oculares deforman las superficies existentes del ojo; se limitan a aproximadamente siete grados para evitar descubrir los bordes originales. `lookAt(Vector3, side)` admite objetivo conjunto o `L`/`R` independiente.

Las Shape Keys `viseme_A` a `viseme_H` y `viseme_X` comparten topología. X conserva el reposo; A cierra la apertura; B/G/H revelan los pequeños elementos interiores apropiados; C/D cambian apertura; E/F estrechan y proyectan la boca. `blink_L`, `blink_R`, `joy`, `focus`, `surprise` son controles separados.

Referencia de formas y reconocedores: [documentación oficial de Rhubarb](https://github.com/DanielSWolf/rhubarb-lip-sync#mouth-shapes). Inglés usa PocketSphinx y la transcripción; español usa phonetic porque PocketSphinx de Rhubarb está limitado al inglés. El reconocedor fonético es menos preciso; no se presenta la validación temporal como certificación fonética.

## Tela y clips

El proxy físico de 81 vértices tiene hombros fijados, viento, amortiguación y gravedad reducida. Blender evalúa 97 fotogramas a 24 fps. Sus desplazamientos se convierten a coordenadas locales y se hornean en las cadenas de manto. Una envolvente periódica garantiza regreso a reposo. `docs/guardian/cloth-study.json` registra parámetros y desplazamiento medido.

`tools/guardian/ethereal.py` utiliza la amplitud medida del estudio físico como referencia y añade ondas periódicas dirigidas artísticamente. No presenta estas ondas como una simulación física completa: se hornean a huesos para continuidad, desfase entre paneles y retraso hacia el borde. Los pesos del manto mezclan suavemente frente/dorso e izquierda/derecha.

`Mantle_Breeze` contiene traslaciones y rotaciones de manto, plumas y madera; `Mantle_Spell` aumenta la ganancia de ese movimiento. `Float` controla exclusivamente Root, separado de los gestos de diálogo, con deriva y balanceo suaves. Idle, Float y viento usan ciclos continuos de 12 segundos, con extremos y velocidades comprobados; los tiempos GLB se normalizan a cero para evitar una pausa al reiniciar. Idle incluye hombros, brazos, antebrazos y manos desfasados. Los clips de conversación mantienen una base suave en brazos y antebrazos.

No existe colisión dinámica de tela contra brazos en el navegador: se revisan las poses suministradas y deben revisarse las nuevas poses extremas. Los movimientos secundarios no añaden geometría ni draw calls.
En Blender se abre el reposo animado. Para editar otro clip, silenciar las pistas corporales restantes y mantener Float y solo una pista de manto. Los clips de invocación y lanzamiento son gestos de preparación, sin lógica de combate.

## Reproducción y expresividad

`HTMLAudioElement.currentTime` gobierna visemas y gestos, incluido seek, pausa y playbackRate. No se cuenta el número de fotogramas. Los visemas usan búsqueda binaria y una mezcla de hasta 35 ms a cada lado de sus límites. Los silencios y el fin del audio retornan a X. Un ticket impide que un JSON tardío de la voz anterior cambie la nueva. Se verifica la identidad del audio en los datos recibidos.

El tutorial conserva su `SpiritVoice`; el renderizador lee el mismo elemento de audio. Cerrar, avanzar o interrumpir libera la voz y devuelve la boca a reposo. El idioma forma parte de la identidad de presentación, incluso cuando no cambia el id del mensaje.

Los gestos se seleccionan por contenido de las frases y se aproximan a pausas de Rhubarb: advertencias, explicación o entusiasmo. Las anclas por frase son estimaciones proporcionales ajustadas a silencios, no alineación forzada palabra a palabra. El movimiento ocular durante pausas y los parpadeos son deterministas. Cabeza/brazos, manto, mirada y morphs pueden coexistir porque sus canales son independientes.

## Auditoría y límites

`audio-audit.json` registra la comprobación de las 54 voces. Cada JSON preserva `rhubarbMouthCues`; `corrections` enumera cambios conservadores a X dentro de silencios PCM inferiores a -48 dBFS durante al menos 180 ms, con margen de 30 ms. Se han aplicado 103 correcciones. No se ha realizado una revisión auditiva humana exhaustiva de todos los fonemas españoles o ingleses; la alineación perceptiva completa sigue siendo una limitación declarada.

Las comprobaciones numéricas de deformación no prueban ausencia de toda intersección en cualquier pose posible. Su alcance son los clips suministrados y los límites de mirada. La máscara y los ojos originales no equivalen a una retopología facial cinematográfica; los párpados son placas de madera pintada y el rango ocular es deliberadamente limitado.

La fuente original permanece intacta. La rama parte de `codex/survival-expansion-balance` en `ada86732c`; la PR se dirige a esa base para mostrar solamente este trabajo, sin incluir sus 62 commits anteriores como cambios de esta tarea. No se hace merge a main.
