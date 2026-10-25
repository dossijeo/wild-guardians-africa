# Desierto: luz gradual integrada

Conservar dentro de ?visualLab=global-lighting. Las transiciones suaves sustituyen los cortes de la rampa toon del terreno del Desierto, incluyendo el horizonte y los nuevos chunks. Paleta, intensidad nocturna, normales, materiales de edificios y siluetas originales se conservan. Renderer por defecto y otros cinco biomas no reciben el tratamiento.

## Evidencia visual

48 capturas integradas de campana real: seis biomas, dos camaras, dia/noche y antes/despues. Las 24 parejas coinciden en semilla 712, camara, objetivo, hora, dia, calidad media y poblacion. Cero errores HTTP/JavaScript de captura, cero draw calls o triangulos adicionales. Ver [auditoria](comparison-audit.json) y [registros](captures.json).

[Antes dia](desierto-base-overview-day.png), [despues dia](desierto-candidate-overview-day.png), [antes noche](desierto-base-overview-night.png), [despues noche](desierto-candidate-overview-night.png).

Las veinte parejas de control de los otros biomas tienen error RGB medio maximo 0,082 sobre 255 entre cargas independientes; no son imagenes identicas bit a bit. La prueba de shaders confirma que el parche no se aplica fuera del Desierto. Los contadores de texturas fluctuan entre -12 y 0 por carga; no representan ahorro de memoria atribuible al cambio, que no crea ni elimina recursos.

El [piloto](../desert-soft-light/README.md) aporta otras 24 capturas, incluidas dunas fuera del poblado, y el benchmark ABBA de la misma rampa: +0,014 ms GPU dia/+0,113 noche. Esta ronda integrada no repite la medicion temporal ni demuestra presupuesto global. La escena QA estatica no sustituye un recorrido de campana para medir rendimiento.

## Validacion

Cinco pruebas pasan: alcance del shader en terreno residente/horizonte y objetos, renderer por defecto, seis biomas, cache de programas y ajustes visuales previos. Build correcto de 406 modulos; avisos existentes de tamano de bundle e importacion estatica/dinamica.

La prueba de streaming 0/+288/retorno valida shaders generados para cada material residente y del horizonte, ademas de verificar shaders compilados por WebGL y cambio efectivo de chunks. Ver streaming.json. El primer comprobador buscaba el nombre del parche en toString del callback exterior y daba un falso negativo: otros pasos envuelven ese callback. Se corrigio para ejecutar la cadena real de compilacion y comprobar su GLSL resultante; no fue necesario cambiar runtime por ese diagnostico.

## Limites y siguiente paso

Mejora visible y acotada, no calidad global equivalente a los mockups. Faltan textura fina de arena convincente, vegetacion y revision conjunta de costes. No se integran los pilotos descartados de normales/franjas. Retomar volumen/sombras de Sabana, Gran Rio y Canon con vistas fuera del poblado antes de ampliar detalle. No hay cambios de simulacion, navegacion, balance ni reglas.

Reproducir comparacion con WG_DESERT_LIGHT_COMPARE=1, WG_GRASS_BIOMES=desierto,sabana,gran-rio,manglares,volcanes,gran-canon, WG_GRASS_VIEWS=overview,low y capture-campaign-grass.mjs. La ruta QA desactiva solo el parche para la variante base. check-desert-light-streaming.mjs valida la carga de terreno.
