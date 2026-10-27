# Equivalencia en una misma carga: cache versionada de sombras

Escena poblada de Manglares, semilla712,media,1280x720,fondo completo. Camara/tiempo/poblacion fijos durante cada comparacion sin ceder al bucle del navegador entre capturas. Dia y noche; cuatro situaciones: estatica, avance del viento, desplazamiento10m que cambia region, invalidacion explicita.

Cada caso captura primera actualizacion, reutilizacion, redibujado forzado y segundo redibujado forzado. El ultimo sirve como control de variacion del renderizador sin cache.

Resultados:
- Caso estatico no redibuja; viento,region,dirty redibujan una vez. El render siguiente obtiene un hit en los ocho casos.
- Cero errores GL y callbacks desconocidos observados.
- Cache frente a forzado:0-19pixeles diferentes. Forzado frente a forzado:0-20pixeles diferentes. Datos completos en comparison.json.
- El residuo existe tambien sin cache. No se demuestra una sombra obsoleta en estos casos ni se afirma igualdad exacta de pixeles; su causa concreta no se ha aislado.

Esta prueba respalda el contrato QA para las invalidaciones comprobadas. No cubre perdida de contexto, cambios de mascara en un chunk residente, calidad, campañas activas o el borde de la region. La optimizacion CPU anterior no demuestra mas FPS. Sigue sin integrarse la arquitectura de sombras residentes.

Reproduccion: Vite5190 y node tools/experiments/probe-holly-fern-shadow-versioned-equivalence-20261023.mjs. No modifica main ni simulacion.
