# Preparación gráfica: criterios para la migración

La prioridad sigue siendo desacoplar la simulación en Worker y completar la
presentación autónoma. Los cambios de esta lista solo se abordarán antes si un
bloqueo impide jugar o integrar esa arquitectura. Esta revisión no demuestra una
mejora ni certifica la cobertura del precalentamiento actual.

1. **Primeros dibujos.** `src/rendering/screen-preload.js` ya hace dibujos con
   viewport nulo, por tandas, y puede preparar sombras; `scene.js` prepara varios
   recursos durante la carga. Hay que comprobar la cobertura de las variantes y
   de los recursos que llegan después, especialmente chunks, animales, edificios
   y destrucción, en vez de asumir que compilar implica haberlos dibujado.
2. **Texturas.** `src/rendering/loading-textures.js` llama a `initTexture` y
   registra algunas llamadas costosas. `wait-loading-gpu-fence.js` usa una
   barrera WebGL y sondeos sin espera bloqueante para confirmar las órdenes
   enviadas antes de ella; no puede evitar un bloqueo síncrono ya ocurrido en la
   llamada ni garantiza que otros recursos futuros estén preparados. Distinguir
   descarga, decode, coste CPU de envío y finalización GPU.
3. **KTX2/Basis.** Pendiente de comparación controlada, no de conversión global.
   La prueba histórica `docs/qa/far-native-texture-profile/README.md` observó
   llamadas CPU de 114–264 ms en tres mapas de 2048², pero eran muestras únicas
   y no aíslan GPU ni prueban el coste actual del juego. Decode explícito no
   eliminó esos tiempos en esa prueba. Elegir recursos mediante trazas actuales;
   comparar tamaño, transcodificación, subida, memoria, compatibilidad y calidad.
4. **Variantes.** El proyecto usa Three.js 0.180.0 y prepara reflexiones de
   programas en `src/rendering/program-bindings.js`; eso no acredita que todas
   las variantes necesarias compartan programa o estén preparadas. Medir claves
   y primeras apariciones de color, sombra y profundidad antes de unirlas.
5. **Trabajo progresivo.** `renderScreenPreloadBatched` y la preparación de
   texturas ya ceden entre grupos. Una llamada individual y la pasada final de
   sombras pueden seguir siendo largas. Medir el total y la ventana completa,
   incluida la carga, para evitar desplazar el tirón a otro momento.
6. **Workers auxiliares.** Ya existen para chunks, horizonte, decode de carga y
   otros datos. Usarlos para preparación CPU solo cuando los datos lo justifiquen;
   la creación/subida WebGL sigue ligada al contexto que posee los recursos.
7. **OffscreenCanvas.** Última alternativa, no parte de esta migración por
   defecto. Un hilo de render separado no prueba por sí solo que desaparezcan
   contención de GPU/driver o esperas del navegador.

Para aceptar cambios: comparar la misma captura, cámara, calidad y hardware en
carga inicial, incorporación de chunks, animales, construcción y destrucción;
medir CPU, consultas GPU, intervalos p95/p99 y máximos, memoria y coste total de
preparación. Conservar controles visuales y funcionales. Informar explícitamente
si una medición no registra GPU, si el número de muestras es insuficiente o si
la preparación solo cambió de momento.

Referencias primarias: [WebGLRenderer de Three.js](https://threejs.org/docs/pages/WebGLRenderer),
[KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html) y
[cuestión de subida de texturas grandes](https://github.com/mrdoob/three.js/issues/28101).
