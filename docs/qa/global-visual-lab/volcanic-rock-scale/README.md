# Rock035: fracturas de mayor escala

A:scale0,12,relief0,22;B:scale0,06,relief0,44. Un periodo pasa de8,33 a16,67unidades. Escala conjunta de color/normal/ARH; normalBoost1,05 sin cambios. El rayo POM multiplica altura*escalaUV, por lo que ese producto permanece0,0264; la profundidad nominal mundial se duplica con la extensión horizontal. No es una calibración metrológica del asset. Ocho muestras POM máximas como antes. No se añade geometría, texturas, shaders de sombras ni instancias.

La máscara de ceniza conserva distribución, suavizado y atenuación: reduce el relieve hasta85%, normales hasta82% y suavizaAO. Su color utiliza también luminancia del mapa de roca, por lo que cambiar la escala puede variar su detalle cromático aunque la distribución sea idéntica.

Doce capturas de campaña real, media1280x720, semilla712, tres cámaras día/noche. Cámaras/horas/draws/triángulos coinciden; sin erroresGL/página. MAE diurna8,398/4,891/6,415 y nocturna3,219/1,855/2,631 sobre255. La noche cambia porque cambia el material; no se añade luz solar nocturna.

La vista normal diurna muestra fracturas más amplias y separables alrededor de edificios. La inversa nocturna mantiene legibilidad pero sigue teniendo áreas muy oscuras. **Conservar como candidata artística**, no declarar acabado: el suelo liso de ceniza sigue dominando parte del poblado y no aparecen siluetas nuevas. No se combina con el tinte solar previo para poder evaluar la escala por separado. Pendientes costeGPU, oblicuidad en movimiento y evaluación de exageración del POM0,44.

[Normal día](day-0-pair.webp), [inversa noche](night-2-pair.webp), [datos](captures.json), [diferencias](comparison.json). Reproducir node tools/experiments/capture-volcanic-rock-scale.mjs con Vite5190. La modificación del JSON de materiales vive solo en la página candidata interceptada; producción permanece intacta.


## Benchmark en Intel UHD

[ABBA](performance/README.md):960consultasGPU/1440frames, misma geometría. GPU diurna menor en candidata, controles variables; noche y cadencia mixtas. Conservar propuesta sin afirmar aceleración ni descartar por coste. POM en movimiento sigue pendiente.
