# Precarga del aviso de magia disponible

El juego prepara únicamente SFX 099 durante un cooldown positivo, con contexto activo, sin pausa ni resultado final. Comparte la descarga y el buffer decodificado; no crea voces ni modifica la simulación. Salir antes de recibir los bytes impide decodificar una solicitud antigua. Los errores se reintentan como máximo cada cinco segundos, evitando solicitudes por frame.

65 pruebas de audio pasan, incluyendo descarga diferida, deduplicación, no mutación, cierre durante descarga, invalidación previa al banco, suspensión y reintento limitado. Build correcto en 9,86 s; paquete verificado con 587 archivos, 382.112.150 bytes, 859 enlaces relativos y 20 GLB runtime. Permanece el aviso de bundle superior a 500 kB.

[Prueba nativa](native.json): contextos nuevos a 44,1/48 kHz, caché de AudioSystem vacía y retraso deliberado de 1.500 ms antes de solicitar los bytes del Opus real. Preparación de 1.539/1.545,8 ms, una descarga por contexto, una voz UI al terminar tres recargas simultáneas, mismo buffer, sin loop, playbackRate 1. Ambos contextos terminan cerrados y sin voces. Consola sin errores ni avisos; [captura](native.png).

El retraso controlado acredita la preparación anticipada con Web Audio real; no mide una red móvil fría ni elimina todo riesgo de descarga incompleta antes de terminar el cooldown. La prueba está silenciada: no acredita escucha perceptual ni teléfono físico. Las fuentes exactas se conservan comprimidas y con hashes en provenance.json.
