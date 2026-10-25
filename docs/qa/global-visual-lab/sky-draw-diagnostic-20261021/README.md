# Diagnóstico de llamadas WebGL del cielo

Repetición instrumentada del amanecer de Sabana: 24 parejas, semilla 712, media, cámara baja fija, viento fijo. Se interceptan drawArrays, drawElements y sus variantes instanced antes del render del frame, registrando argumentos. No altera shaders, materiales ni contenido. Esta instrumentación añade coste CPU: no usar para benchmark.

Las 24 parejas coinciden en cámara, objetivo, hora, contadores finales de escena y multiconjunto de comandos WebGL. audit.json registra también si el orden coincide. No hay errores capturados. La diferencia intermitente de un draw call de ejecuciones anteriores no se reproduce. No se ha encontrado su causa y no se considera resuelta por esta repetición; no atribuirla al shader del cielo sin evidencia.

El total de llamadas interceptadas incluye otros renders del frame; el contador Three final puede contener solo el último render por autoReset. Los benchmarks existentes usan autoReset=false para acumular el frame completo.

La segunda comprobación de GPU (sky-cost-20261021/preflight-retry.json) encuentra 78–93 % de carga externa. Se mantiene pendiente la medición de coste, sin detener ni contactar la otra tarea. Sigue habiendo trabajo independiente posible; no es bloqueo del objetivo global.

Reproducir capture-sky-draw-diagnostic-20261021.mjs con Vite 5190 y audit-sky-draw-diagnostic-20261021.py. Capturas PNG locales regenerables; se publican comandos y auditoría. Siguiente paso: volver a las mejoras visibles de terreno mientras no sea viable medir costes sin contención.
